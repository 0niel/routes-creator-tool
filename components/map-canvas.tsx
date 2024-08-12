import React, { useEffect, useMemo, useRef, useState } from "react"
import { dia, V, g } from "jointjs"
import "jointjs/dist/joint.css"
import "jointjs/css/layout.css"
import "jointjs/css/themes/modern.css"
import { MapObject } from "@/lib/figma-map-config"
import { useJointCanvasStore } from "@/lib/stores/joint-canvas-store"
import { useMapConfigStore } from "@/lib/stores/map-config-store"
import { createPaper } from "@/lib/joint-utils"
import { useKeyboardHandlers } from "@/lib/hooks/use-keyboard-handlers"
import { MouseMode } from "@/lib/mouse-mode"
import { setupCanvasEvents } from "./canvas-event-handlers"

interface MapCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  setPanZoomEnabled: (panZoomEnabled: boolean) => void
  mouseMode: MouseMode
  setMouseMode: (mouseMode: MouseMode) => void
  onMapObjectDoubleClick: (mapObject: MapObject) => void
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  setPanZoomEnabled,
  mouseMode,
  setMouseMode,
  onMapObjectDoubleClick,
  ...props
}) => {
  const mapConfig = useMapConfigStore()
  const mapConfigRef = useRef(mapConfig)
  const canvasRef = useRef<HTMLDivElement>(null)
  const jointCanvas = useJointCanvasStore()
  const mouseModeRef = useRef(mouseMode)

  const [selectedElements, setSelectedElements] = useState<dia.Cell[]>([])
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{
    x: number
    y: number
  } | null>(null)
  const [initialElementPositions, setInitialElementPositions] = useState<
    { element: dia.Element; x: number; y: number }[]
  >([])
  const [initialVertices, setInitialVertices] = useState<
    { link: dia.Link; vertices: { x: number; y: number }[] }[]
  >([])
  const selectionRectRef = useRef<SVGRectElement | null>(null)

  useEffect(() => {
    mouseModeRef.current = mouseMode
  }, [mouseMode])

  useEffect(() => {
    mapConfigRef.current = mapConfig
  }, [mapConfig])

  // Highlight selected elements and links
  useEffect(() => {
    selectedElements.forEach((cell) => {
      const cellView = cell.findView(jointCanvas.paper ?? undefined)
      if (cellView) {
        if (cell.isElement()) {
          const portBodies = V(cellView.el).find(".port-body")
          // Change color to indicate selection
          portBodies.forEach((portBody) => {
            portBody.attr({
              stroke: "#00f",
              "stroke-width": 3,
              fill: "#e0f7ff",
            })
          })
        } else if (cell.isLink()) {
          const connection = V(cellView.el).findOne("path.connection")
          if (connection) {
            connection.attr({
              stroke: "#00f", // Change stroke color to indicate selection
              "stroke-width": 3,
            })
          }
        }
      }
    })

    return () => {
      selectedElements.forEach((cell) => {
        const cellView = cell.findView(jointCanvas.paper ?? undefined)
        if (cellView) {
          if (cell.isElement()) {
            const portBodies = V(cellView.el).find(".port-body")
            portBodies.forEach((portBody) => {
              portBody.attr({
                stroke: "#000", // Reset stroke color
                "stroke-width": 1,
                fill: "#fff", // Reset fill color
              })
            })
          } else if (cell.isLink()) {
            const connection = V(cellView.el).findOne("path.connection")
            if (connection) {
              connection.attr({
                stroke: "#000", // Reset stroke color
                "stroke-width": 1,
              })
            }
          }
        }
      })
    }
  }, [selectedElements, jointCanvas.paper])

  useKeyboardHandlers(setMouseMode)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        setIsAltPressed(true)
        setPanZoomEnabled(false)
      }
      if (event.key === "Escape") {
        setSelectedElements([]) // Deselect all elements
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isAltPressed && !event.altKey) {
        setIsAltPressed(false)
        setPanZoomEnabled(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [setPanZoomEnabled, isAltPressed])

  const getPaper = useMemo(() => {
    const paper = createPaper(jointCanvas.graph)

    setupCanvasEvents(paper, {
      setPanZoomEnabled,
      setMouseMode,
      onMapObjectDoubleClick,
      mapConfigRef,
      mouseModeRef,
    })

    return paper
  }, [
    jointCanvas.graph,
    setPanZoomEnabled,
    setMouseMode,
    onMapObjectDoubleClick,
  ])

  useEffect(() => {
    if (canvasRef.current && canvasRef.current.childNodes.length === 0) {
      canvasRef.current.appendChild(getPaper.el)
      jointCanvas.setPaper(getPaper)

      // Create an SVG element to represent the selection rectangle
      const svgElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      )
      svgElement.setAttribute("fill", "rgba(0, 120, 215, 0.3)")
      svgElement.setAttribute("stroke", "rgba(0, 120, 215, 0.9)")
      svgElement.setAttribute("stroke-width", "1")
      svgElement.setAttribute("class", "selection-rect")
      svgElement.style.display = "none"

      canvasRef.current.querySelector("svg")?.appendChild(svgElement)
      selectionRectRef.current = svgElement
    }
  }, [getPaper, jointCanvas])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAltPressed) {
      const { offsetX, offsetY } = e.nativeEvent
      setIsSelecting(true)
      setSelectionStart({ x: offsetX, y: offsetY })
      if (selectionRectRef.current) {
        selectionRectRef.current.style.display = "block"
        selectionRectRef.current.setAttribute("x", offsetX.toString())
        selectionRectRef.current.setAttribute("y", offsetY.toString())
        selectionRectRef.current.setAttribute("width", "0")
        selectionRectRef.current.setAttribute("height", "0")
      }
    } else {
      const { offsetX, offsetY } = e.nativeEvent
      setIsDragging(true)
      setSelectionStart({ x: offsetX, y: offsetY })
      setInitialElementPositions(
        selectedElements.map((element) => ({
          element,
          x: element.position().x,
          y: element.position().y,
        }))
      )

      // Store the initial vertices of the links
      const vertices = selectedElements
        .filter((cell) => cell.isLink())
        .map((link) => ({
          link: link as dia.Link,
          vertices: (link as dia.Link)
            .vertices()
            .map((vertex) => ({ ...vertex })),
        }))
      setInitialVertices(vertices)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting && selectionStart) {
      const { offsetX, offsetY } = e.nativeEvent
      const width = Math.abs(offsetX - selectionStart.x)
      const height = Math.abs(offsetY - selectionStart.y)
      const x = Math.min(offsetX, selectionStart.x)
      const y = Math.min(offsetY, selectionStart.y)
      if (selectionRectRef.current) {
        selectionRectRef.current.setAttribute("x", x.toString())
        selectionRectRef.current.setAttribute("y", y.toString())
        selectionRectRef.current.setAttribute("width", width.toString())
        selectionRectRef.current.setAttribute("height", height.toString())
      }
    } else if (isDragging && selectionStart) {
      const { offsetX, offsetY } = e.nativeEvent
      const dx = offsetX - selectionStart.x
      const dy = offsetY - selectionStart.y

      initialElementPositions.forEach(({ element, x, y }) => {
        element.position(x + dx, y + dy)
      })

      // Adjust the vertices of the links
      initialVertices.forEach(({ link, vertices }) => {
        const updatedVertices = vertices.map((vertex) => ({
          x: vertex.x + dx,
          y: vertex.y + dy,
        }))
        link.vertices(updatedVertices)
      })
    }
  }

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false)
      if (selectionRectRef.current) {
        const rect = selectionRectRef.current.getBBox()

        // Create a BBox object with the required properties
        const bbox = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        }

        // Use findModelsInArea with the created bbox
        const selected = jointCanvas.graph.findModelsInArea(bbox)

        // Find links connected to selected elements and add to selection
        const connectedLinks = jointCanvas.graph
          .getLinks()
          .filter(
            (link) =>
              selected.includes(link.getSourceElement() as dia.Element) ||
              selected.includes(link.getTargetElement() as dia.Element)
          )

        setSelectedElements([...selected, ...connectedLinks])
        selectionRectRef.current.style.display = "none"
      }
    }

    setIsDragging(false)
    setSelectionStart(null)
    setInitialElementPositions([])
    setInitialVertices([])
  }

  const handleBlankAreaClick = () => {
    setSelectedElements([]) // Deselect all elements on blank area click
  }

  return (
    <div
      ref={canvasRef}
      {...props}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleBlankAreaClick}
    />
  )
}

export default MapCanvas
