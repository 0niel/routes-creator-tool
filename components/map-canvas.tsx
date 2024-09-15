import { MapObject } from '@/lib/figma-map-config'
import { useKeyboardHandlers } from '@/lib/hooks/use-keyboard-handlers'
import { createPaper } from '@/lib/joint-utils'
import { MouseMode } from '@/lib/mouse-mode'
import { useJointCanvasStore } from '@/lib/stores/joint-canvas-store'
import { useMapConfigStore } from '@/lib/stores/map-config-store'
import { dia } from 'jointjs'
import 'jointjs/css/layout.css'
import 'jointjs/css/themes/modern.css'
import 'jointjs/dist/joint.css'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setupCanvasEvents } from './canvas-event-handlers'

interface MapCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  setPanZoomEnabled: (panZoomEnabled: boolean) => void
  mouseMode: MouseMode
  setMouseMode: (mouseMode: MouseMode) => void
  onMapObjectDoubleClick: (mapObject: MapObject) => void
  selectedElements: dia.Cell[]
  setSelectedElements: (elements: dia.Cell[]) => void
  setSelectionEnabled: (enabled: boolean) => void
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  setPanZoomEnabled,
  mouseMode,
  setMouseMode,
  onMapObjectDoubleClick,
  selectedElements,
  setSelectedElements,
  setSelectionEnabled,
  ...props
}) => {
  const mapConfig = useMapConfigStore()
  const mapConfigRef = useRef(mapConfig)
  const canvasRef = useRef<HTMLDivElement>(null)
  const jointCanvas = useJointCanvasStore()
  const mouseModeRef = useRef(mouseMode)

  const [clipboard, setClipboard] = useState<dia.Cell[]>([])
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    mouseModeRef.current = mouseMode
  }, [mouseMode])

  useEffect(() => {
    mapConfigRef.current = mapConfig
  }, [mapConfig])

  useKeyboardHandlers(setMouseMode)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey) {
        setIsAltPressed(true)
        setPanZoomEnabled(false)
        setSelectionEnabled(true)
      }
      if (event.key === 'Escape') {
        setSelectedElements([]) // Снятие выделения
      }

      // Перемещение выделенных элементов стрелками
      const moveDistance = 10
      if (selectedElements.length > 0) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault()
            moveSelectedElements(0, -moveDistance)
            break
          case 'ArrowDown':
            event.preventDefault()
            moveSelectedElements(0, moveDistance)
            break
          case 'ArrowLeft':
            event.preventDefault()
            moveSelectedElements(-moveDistance, 0)
            break
          case 'ArrowRight':
            event.preventDefault()
            moveSelectedElements(moveDistance, 0)
            break
          default:
            break
        }
      }

      // Копирование (Ctrl+C или Cmd+C)
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        if (selectedElements.length > 0) {
          const elementsToCopy = selectedElements.filter(cell =>
            cell.isElement()
          ) as dia.Element[]
          const linksToCopy = jointCanvas.graph.getLinks().filter(link => {
            const source = link.getSourceElement()
            const target = link.getTargetElement()
            return (
              elementsToCopy.includes(source as dia.Element) ||
              elementsToCopy.includes(target as dia.Element)
            )
          })

          setClipboard([
            ...elementsToCopy,
            ...linksToCopy.map(link => link.clone())
          ])
        }
      }

      // Вставка (Ctrl+V или Cmd+V)
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        if (clipboard.length > 0) {
          const newElements: dia.Element[] = []
          const newLinks: dia.Link[] = []

          const elementMapping: { [oldId: string]: dia.Element } = {}

          clipboard.forEach(cell => {
            if (cell.isElement()) {
              const clone = cell.clone()
              clone.translate(20, 20) // Сдвиг, чтобы элементы не накладывались на оригинал
              jointCanvas.graph.addCell(clone)
              newElements.push(clone)
              elementMapping[cell.id] = clone
            } else if (cell.isLink()) {
              newLinks.push(cell.clone() as dia.Link)
            }
          })

          newLinks.forEach(link => {
            const sourceId = link.get('source').id
            const targetId = link.get('target').id

            if (sourceId && targetId) {
              const newLink = link.clone()
              newLink.set({
                source: { id: elementMapping[sourceId].id },
                target: { id: elementMapping[targetId].id }
              })
              jointCanvas.graph.addCell(newLink)
            }
          })
        }
      }
    },
    [clipboard, selectedElements, jointCanvas.graph, setPanZoomEnabled]
  )

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (isAltPressed && !event.altKey) {
        setIsAltPressed(false)
        setPanZoomEnabled(true)
        setSelectionEnabled(false)
      }
    },
    [isAltPressed, setPanZoomEnabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const getPaper = useMemo(() => {
    const paper = createPaper(jointCanvas.graph)

    setupCanvasEvents(paper, {
      setPanZoomEnabled,
      setMouseMode,
      onMapObjectDoubleClick,
      mapConfigRef,
      mouseModeRef
    })

    return paper
  }, [
    jointCanvas.graph,
    setPanZoomEnabled,
    setMouseMode,
    onMapObjectDoubleClick
  ])

  useEffect(() => {
    if (canvasRef.current && canvasRef.current.childNodes.length === 0) {
      canvasRef.current.appendChild(getPaper.el)
      jointCanvas.setPaper(getPaper)
    }
  }, [getPaper, jointCanvas])

  // const moveSelectedElements = (dx: number, dy: number) => {
  //   selectedElements.forEach(element => {
  //     if (element.isElement()) {
  //       element.translate(dx, dy)
  //     } else if (element.isLink()) {
  //       const vertices = (element as dia.Link).vertices().map(vertex => ({
  //         x: vertex.x + dx,
  //         y: vertex.y + dy
  //       }))
  //       ;(element as dia.Link).vertices(vertices)
  //     }
  //   })
  // }

  // const handleDragStart = useCallback(
  //   (e: React.MouseEvent) => {
  //     e.stopPropagation()
  //     e.preventDefault()

  //     const startX = e.clientX
  //     const startY = e.clientY

  //     dragStartRef.current = { x: startX, y: startY }

  //     const handleDragMove = (moveEvent: MouseEvent) => {
  //       const dx = moveEvent.clientX - startX
  //       const dy = moveEvent.clientY - startY

  //       requestAnimationFrame(() => {
  //         selectedElements.forEach(element => {
  //           if (element.isElement()) {
  //             element.translate(dx, dy)
  //           } else if (element.isLink()) {
  //             const vertices = (element as dia.Link).vertices().map(vertex => ({
  //               x: vertex.x + dx,
  //               y: vertex.y + dy
  //             }))
  //             ;(element as dia.Link).vertices(vertices)
  //           }
  //         })
  //       })
  //     }

  //     const handleDragEnd = () => {
  //       setIsDragging(false)
  //       dragStartRef.current = null
  //       window.removeEventListener('mousemove', handleDragMove)
  //       window.removeEventListener('mouseup', handleDragEnd)
  //     }

  //     window.addEventListener('mousemove', handleDragMove)
  //     window.addEventListener('mouseup', handleDragEnd)
  //   },
  //   [selectedElements]
  // )

  return <div ref={canvasRef} {...props} />
}

export default MapCanvas
