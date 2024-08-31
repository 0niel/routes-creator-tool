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
import { debounce } from 'lodash'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { setupCanvasEvents } from './canvas-event-handlers'

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
  const [clipboard, setClipboard] = useState<dia.Cell[]>([])
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{
    x: number
    y: number
  } | null>(null)
  const [dragPlaceholder, setDragPlaceholder] = useState<SVGGElement | null>(
    null
  )
  const selectionRectRef = useRef<SVGRectElement | null>(null)
  const bboxRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    mouseModeRef.current = mouseMode
  }, [mouseMode])

  useEffect(() => {
    mapConfigRef.current = mapConfig
  }, [mapConfig])

  useKeyboardHandlers(setMouseMode)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        setIsAltPressed(true)
        setPanZoomEnabled(false)
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

          setSelectedElements([...newElements, ...newLinks])
        }
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isAltPressed && !event.altKey) {
        setIsAltPressed(false)
        setPanZoomEnabled(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    setPanZoomEnabled,
    isAltPressed,
    selectedElements,
    clipboard,
    jointCanvas.graph
  ])

  const getAggregatedBBox = (elements: dia.Cell[]) => {
    const bboxes = elements.map(element => element.getBBox())
    const x = Math.min(...bboxes.map(bbox => bbox.x))
    const y = Math.min(...bboxes.map(bbox => bbox.y))
    const width = Math.max(...bboxes.map(bbox => bbox.x + bbox.width)) - x
    const height = Math.max(...bboxes.map(bbox => bbox.y + bbox.height)) - y
    return { x, y, width, height }
  }

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

      const svgElement = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect'
      )
      svgElement.setAttribute('fill', 'rgba(0, 120, 215, 0.3)')
      svgElement.setAttribute('stroke', 'rgba(0, 120, 215, 0.9)')
      svgElement.setAttribute('stroke-width', '1')
      svgElement.setAttribute('class', 'selection-rect')
      svgElement.style.display = 'none'

      canvasRef.current.querySelector('svg')?.appendChild(svgElement)
      selectionRectRef.current = svgElement
    }
  }, [getPaper, jointCanvas])

  const disableElementEvents = (disable: boolean) => {
    jointCanvas.graph.getElements().forEach(element => {
      element.attr(
        'event',
        disable
          ? 'none'
          : 'element:pointerdown element:pointermove element:pointerup'
      )
    })
  }

  const moveSelectedElements = (dx: number, dy: number) => {
    selectedElements.forEach(element => {
      if (element.isElement()) {
        element.translate(dx, dy)
      } else if (element.isLink()) {
        const vertices = (element as dia.Link).vertices().map(vertex => ({
          x: vertex.x + dx,
          y: vertex.y + dy
        }))
        ;(element as dia.Link).vertices(vertices)
      }
    })
  }

  const updateBBox = () => {
    if (selectedElements.length > 0 && jointCanvas.paper) {
      const selectedBBox = getAggregatedBBox(selectedElements)
      if (selectedBBox && bboxRef.current) {
        const bboxDiv = bboxRef.current
        bboxDiv.style.display = 'block'
        bboxDiv.style.left = `${selectedBBox.x}px`
        bboxDiv.style.top = `${selectedBBox.y}px`
        bboxDiv.style.width = `${selectedBBox.width}px`
        bboxDiv.style.height = `${selectedBBox.height}px`
      } else if (bboxRef.current) {
        bboxRef.current.style.display = 'none'
      }
    }
  }

  const updateBBoxDebounced = useMemo(
    () => debounce(updateBBox, 100),
    [selectedElements, jointCanvas.paper, jointCanvas.graph, isDragging]
  )

  useEffect(() => {
    updateBBoxDebounced()

    const graph = jointCanvas.graph

    const handleChange = () => {
      if (!isDragging) {
        updateBBoxDebounced()
      }
    }

    graph.on('change', handleChange)
    return () => {
      graph.off('change', handleChange)
    }
  }, [
    selectedElements,
    jointCanvas.paper,
    jointCanvas.graph,
    isDragging,
    updateBBoxDebounced
  ])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAltPressed) {
      const { offsetX, offsetY } = e.nativeEvent
      setIsSelecting(true)
      setSelectionStart({ x: offsetX, y: offsetY })
      if (selectionRectRef.current) {
        selectionRectRef.current.style.display = 'block'
        selectionRectRef.current.setAttribute('x', offsetX.toString())
        selectionRectRef.current.setAttribute('y', offsetY.toString())
        selectionRectRef.current.setAttribute('width', '0')
        selectionRectRef.current.setAttribute('height', '0')
      }
    } else {
      disableElementEvents(true) // Disable events on elements
      const { offsetX, offsetY } = e.nativeEvent
      setIsDragging(true)
      setSelectionStart({ x: offsetX, y: offsetY })

      if (dragPlaceholder) {
        dragPlaceholder.remove()
      }

      const placeholder = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g'
      )

      selectedElements.forEach(element => {
        if (element.isElement()) {
          const rect = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'rect'
          )
          const bbox = element.getBBox()
          rect.setAttribute('x', bbox.x.toString())
          rect.setAttribute('y', bbox.y.toString())
          rect.setAttribute('width', bbox.width.toString())
          rect.setAttribute('height', bbox.height.toString())
          rect.setAttribute('fill', 'none')
          rect.setAttribute('stroke', '#00f')
          rect.setAttribute('stroke-dasharray', '5,5')
          placeholder.appendChild(rect)
        } else if (element.isLink()) {
          const path = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          )
          const vertices = (element as dia.Link)
            .vertices()
            .map(v => `${v.x},${v.y}`)
            .join(' L ')
          path.setAttribute('d', `M ${vertices}`)
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', '#00f')
          path.setAttribute('stroke-dasharray', '5,5')
          placeholder.appendChild(path)
        }
      })

      const svgContainer = canvasRef.current?.querySelector('svg')
      if (svgContainer) {
        svgContainer.appendChild(placeholder)
      }
      setDragPlaceholder(placeholder)
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
        selectionRectRef.current.setAttribute('x', x.toString())
        selectionRectRef.current.setAttribute('y', y.toString())
        selectionRectRef.current.setAttribute('width', width.toString())
        selectionRectRef.current.setAttribute('height', height.toString())
      }
    } else if (isDragging && selectionStart && dragPlaceholder) {
      const { offsetX, offsetY } = e.nativeEvent
      const dx = offsetX - selectionStart.x
      const dy = offsetY - selectionStart.y

      requestAnimationFrame(() => {
        dragPlaceholder.setAttribute('transform', `translate(${dx},${dy})`)
      })
    }
  }

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false)
      if (selectionRectRef.current) {
        const rect = selectionRectRef.current.getBBox()

        const bbox = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        }

        const selected = jointCanvas.graph.findModelsInArea(bbox)

        const connectedLinks = jointCanvas.graph
          .getLinks()
          .filter(
            link =>
              selected.includes(link.getSourceElement() as dia.Element) ||
              selected.includes(link.getTargetElement() as dia.Element)
          )

        setSelectedElements([...selected, ...connectedLinks])
        selectionRectRef.current.style.display = 'none'
      }
    } else if (isDragging) {
      requestAnimationFrame(() => {
        const dx = parseFloat(
          dragPlaceholder?.getAttribute('transform')?.split('(')[1] || '0'
        )
        const dy = parseFloat(
          dragPlaceholder
            ?.getAttribute('transform')
            ?.split(',')[1]
            .split(')')[0] || '0'
        )

        selectedElements.forEach(element => {
          if (element.isElement()) {
            element.translate(dx, dy)
          } else if (element.isLink()) {
            const vertices = (element as dia.Link).vertices().map(vertex => ({
              x: vertex.x + dx,
              y: vertex.y + dy
            }))
            ;(element as dia.Link).vertices(vertices)
          }
        })

        if (dragPlaceholder) {
          dragPlaceholder.remove()
          setDragPlaceholder(null)
        }

        setIsDragging(false)
        setSelectionStart(null)
        disableElementEvents(false) // Re-enable events on elements

        updateBBox() // Обновляем BBox после перемещения
      })
    }
  }

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    disableElementEvents(true) // Disable events on elements

    const startX = e.clientX
    const startY = e.clientY

    dragStartRef.current = { x: startX, y: startY }

    const placeholder = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    )

    selectedElements.forEach(element => {
      if (element.isElement()) {
        const rect = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'rect'
        )
        const bbox = element.getBBox()
        rect.setAttribute('x', bbox.x.toString())
        rect.setAttribute('y', bbox.y.toString())
        rect.setAttribute('width', bbox.width.toString())
        rect.setAttribute('height', bbox.height.toString())
        rect.setAttribute('fill', 'none')
        rect.setAttribute('stroke', '#00f')
        rect.setAttribute('stroke-dasharray', '5,5')
        placeholder.appendChild(rect)
      } else if (element.isLink()) {
        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )
        const vertices = (element as dia.Link)
          .vertices()
          .map(v => `${v.x},${v.y}`)
          .join(' L ')
        path.setAttribute('d', `M ${vertices}`)
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', '#00f')
        path.setAttribute('stroke-dasharray', '5,5')
        placeholder.appendChild(path)
      }
    })

    const svgContainer = canvasRef.current?.querySelector('svg')
    if (svgContainer) {
      svgContainer.appendChild(placeholder)
    }
    setDragPlaceholder(placeholder)

    const handleDragMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      dragPlaceholder.setAttribute('transform', `translate(${dx},${dy})`)
    }

    const handleDragEnd = () => {
      const dx = dragStartRef.current ? dragStartRef.current.x - startX : 0
      const dy = dragStartRef.current ? dragStartRef.current.y - startY : 0

      selectedElements.forEach(element => {
        if (element.isElement()) {
          element.translate(dx, dy)
        } else if (element.isLink()) {
          const vertices = (element as dia.Link).vertices().map(vertex => ({
            x: vertex.x + dx,
            y: vertex.y + dy
          }))
          ;(element as dia.Link).vertices(vertices)
        }
      })

      setIsDragging(false)
      dragStartRef.current = null

      if (dragPlaceholder) {
        dragPlaceholder.remove()
        setDragPlaceholder(null)
      }

      disableElementEvents(false) // Re-enable events on elements

      updateBBox() // Обновляем BBox после перемещения

      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }

    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
  }

  return (
    <>
      <div
        ref={canvasRef}
        {...props}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div
        ref={bboxRef}
        style={{
          position: 'absolute',
          border: '2px dashed #00f',
          display: 'none',
          cursor: 'move',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            width: '20px',
            height: '20px',
            background: '#00f',
            cursor: 'pointer',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}
          onMouseDown={handleDragStart}
        />
      </div>
    </>
  )
}

export default MapCanvas
