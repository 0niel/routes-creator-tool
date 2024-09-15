'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { MapObject, MapObjectType } from '@/lib/figma-map-config'
import { MouseMode } from '@/lib/mouse-mode'
import { useJointCanvasStore } from '@/lib/stores/joint-canvas-store'
import { useSvgMapStore } from '@/lib/stores/svg-map-store'
import { dia } from 'jointjs'
import 'jointjs/css/layout.css'
import 'jointjs/css/themes/modern.css'
import 'jointjs/dist/joint.css'
import Selecto from 'react-selecto'
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper
} from 'react-zoom-pan-pinch'
import MapCanvas from './map-canvas'
import StairsSelectDialog from './stairs-select-dialog'

const MapEditor = () => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null)
  const miniMapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<HTMLDivElement>(null)

  const { map } = useSvgMapStore()
  const [mouseMode, setMouseMode] = useState(MouseMode.NONE)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [scale, setScale] = useState(1.0)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [selectionEnabled, setSelectionEnabled] = useState(false)

  const [selectedElements, setSelectedElements] = useState<dia.Cell[]>([])
  const jointCanvas = useJointCanvasStore()

  useEffect(() => {
    if (mouseMode === MouseMode.CREATE_PORT) {
      document.body.style.cursor = 'crosshair'
    } else if (mouseMode === MouseMode.NONE) {
      document.body.style.cursor = 'default'
    }
  }, [mouseMode])

  const updateViewBox = useCallback(() => {
    if (transformComponentRef.current && svgRef.current && miniMapRef.current) {
      const { positionX, positionY, scale } =
        transformComponentRef.current.instance.transformState

      const svgWidth = svgRef.current.clientWidth
      const svgHeight = svgRef.current.clientHeight

      const miniMapWidth = miniMapRef.current.clientWidth
      const miniMapHeight = miniMapRef.current.clientHeight

      const viewBoxWidth = (miniMapWidth * scale) / svgWidth
      const viewBoxHeight = (miniMapHeight * scale) / svgHeight

      const viewBoxX = (-positionX / svgWidth) * miniMapWidth
      const viewBoxY = (-positionY / svgHeight) * miniMapHeight

      setViewBox({
        x: viewBoxX * scale,
        y: viewBoxY * scale,
        width: viewBoxWidth,
        height: viewBoxHeight
      })
    }
  }, [])

  useEffect(() => {
    updateViewBox()
  }, [scale, updateViewBox])

  const [stairsDialogOptions, setStairsDialogOptions] = useState<{
    open: boolean
    selectedStairsMapObject: MapObject | null
  }>({
    open: false,
    selectedStairsMapObject: null
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '=' || event.key === '+') {
        transformComponentRef.current?.zoomIn()
      } else if (event.key === '-') {
        transformComponentRef.current?.zoomOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMiniMapClick = (event: React.MouseEvent) => {
    if (
      !transformComponentRef.current ||
      !miniMapRef.current ||
      !svgRef.current
    )
      return

    const miniMapElement = miniMapRef.current
    const { offsetX, offsetY } = event.nativeEvent

    const miniMapWidth = miniMapElement.clientWidth
    const miniMapHeight = miniMapElement.clientHeight

    const mainMapTransformState =
      transformComponentRef.current.instance.transformState
    const mainMapScale = mainMapTransformState.scale || 1

    const svgWidth = svgRef.current.clientWidth
    const svgHeight = svgRef.current.clientHeight

    const newX = (offsetX / miniMapWidth) * svgWidth - viewBox.width / 2
    const newY = (offsetY / miniMapHeight) * svgHeight - viewBox.height / 2

    transformComponentRef.current.setTransform(
      -newX * mainMapScale,
      -newY * mainMapScale,
      mainMapScale,
      300,
      'easeOut'
    )

    updateViewBox()
  }

  const calculateBBox = () => {
    if (selectedElements.length === 0) return null

    const bboxes = selectedElements.map(element => element.getBBox())
    const x = Math.min(...bboxes.map(bbox => bbox.x))
    const y = Math.min(...bboxes.map(bbox => bbox.y))
    const width = Math.max(...bboxes.map(bbox => bbox.x + bbox.width)) - x
    const height = Math.max(...bboxes.map(bbox => bbox.y + bbox.height)) - y

    return { x, y, width, height }
  }

  const bbox = calculateBBox()

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <StairsSelectDialog
        open={stairsDialogOptions.open}
        setOpen={open =>
          setStairsDialogOptions({ ...stairsDialogOptions, open })
        }
        selectedStairsMapObject={stairsDialogOptions.selectedStairsMapObject}
      />
      {map ? (
        <>
          {selectionEnabled && (
            <Selecto
              container={document.body}
              dragContainer={window}
              selectableTargets={['.joint-element', '.joint-cell']}
              selectByClick={true}
              selectFromInside={true}
              continueSelect={true}
              keyContainer={window}
              onSelect={e => {
                const selectedIds = e.added.map(el =>
                  el.getAttribute('model-id')
                )
                console.log(selectedIds)
                const selected = jointCanvas.graph
                  .getCells()
                  .filter(cell => selectedIds.includes(cell.id))

                setSelectedElements(
                  Array.from(new Set([...selectedElements, ...selected]))
                )
              }}
              className="absolute inset-0 z-50"
            />
          )}
          <TransformWrapper
            minScale={0.05}
            initialScale={scale}
            maxScale={2}
            onTransformed={e => {
              if (e.state.scale !== scale) {
                setScale(e.state.scale)
              }
            }}
            onZoom={e => {
              if (e.state.scale !== scale) {
                setScale(e.state.scale)
              }
            }}
            panning={{ disabled: !isShiftPressed, velocityDisabled: true }}
            wheel={{ disabled: true }}
            pinch={{ step: 0.05 }}
            zoomAnimation={{ disabled: true }}
            smooth={true}
            alignmentAnimation={{ disabled: true }}
            velocityAnimation={{ disabled: true, sensitivity: 0 }}
            limitToBounds={true}
            centerZoomedOut={false}
            disablePadding={true}
            ref={transformComponentRef}
            centerOnInit={false}
            doubleClick={{
              disabled: true
            }}
          >
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
                position: 'absolute'
              }}
            >
              <div
                ref={svgRef}
                dangerouslySetInnerHTML={{ __html: map }}
                id="svg-map"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  overflow: 'hidden'
                }}
              />

              <MapCanvas
                className="absolute inset-0 z-30"
                mouseMode={mouseMode}
                setMouseMode={setMouseMode}
                setPanZoomEnabled={setIsShiftPressed}
                onMapObjectDoubleClick={mapObject => {
                  if (
                    mapObject.type === MapObjectType.STAIRS ||
                    mapObject.type === MapObjectType.ELEVATOR ||
                    mapObject.type === MapObjectType.TRANSITION
                  ) {
                    setStairsDialogOptions({
                      open: true,
                      selectedStairsMapObject: mapObject
                    })
                  }
                }}
                selectedElements={selectedElements}
                setSelectedElements={setSelectedElements}
                setSelectionEnabled={setSelectionEnabled}
              />

              {bbox && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${bbox.x}px`,
                    top: `${bbox.y}px`,
                    width: `${bbox.width}px`,
                    height: `${bbox.height}px`,
                    border: '2px dashed red',
                    pointerEvents: 'none',
                    zIndex: 40
                  }}
                />
              )}
            </TransformComponent>
          </TransformWrapper>

          <div
            className="absolute right-2 bottom-2 w-48 h-48 bg-gray-200 border border-gray-400 z-40 cursor-pointer"
            onClick={handleMiniMapClick}
            ref={miniMapRef}
          >
            <svg
              viewBox={`0 0 ${svgRef.current?.clientWidth || 0} ${
                svgRef.current?.clientHeight || 0
              }`}
              width="100%"
              height="100%"
            >
              <g dangerouslySetInnerHTML={{ __html: map }} />
              <rect
                x={viewBox.x}
                y={viewBox.y}
                width={viewBox.width}
                height={viewBox.height}
                fill="none"
                stroke="red"
                strokeWidth="1"
              />
            </svg>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-lg text-gray-500">Откройте SVG файл</div>
        </div>
      )}
    </div>
  )
}

export default MapEditor
