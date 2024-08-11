import React, { useEffect, useMemo, useRef } from "react"
import { dia } from "jointjs"
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

  // Sync the mouseMode state with its ref
  useEffect(() => {
    mouseModeRef.current = mouseMode
  }, [mouseMode])

  // Sync the mapConfig state with its ref
  useEffect(() => {
    mapConfigRef.current = mapConfig
  }, [mapConfig])

  useKeyboardHandlers(setMouseMode)

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
    }
  }, [getPaper, jointCanvas])

  return <div ref={canvasRef} {...props} />
}

export default MapCanvas
