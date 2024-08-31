'use client'

import React, { useEffect, useRef, useState } from 'react'

import 'jointjs/css/layout.css'
import 'jointjs/css/themes/modern.css'
import 'jointjs/dist/joint.css'

import { MapObject, MapObjectType } from '@/lib/figma-map-config'
import { MouseMode } from '@/lib/mouse-mode'
import { useSvgMapStore } from '@/lib/stores/svg-map-store'
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper
} from 'react-zoom-pan-pinch'
import MapCanvas from './map-canvas'
import StairsSelectDialog from './stairs-select-dialog'

const MapEditor = () => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null)
  const svgRef = useRef<HTMLDivElement>(null)

  const { map, setMap } = useSvgMapStore()
  const [mouseMode, setMouseMode] = React.useState(MouseMode.NONE)
  const mouseModeRef = useRef(mouseMode)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  useEffect(() => {
    if (mouseMode === MouseMode.CREATE_PORT) {
      document.body.style.cursor = 'crosshair'
    } else if (mouseMode === MouseMode.NONE) {
      document.body.style.cursor = 'default'
    }

    mouseModeRef.current = mouseMode
  }, [mouseMode])

  const [panZoomEnabled, setPanZoomEnabled] = React.useState(true)
  const [scale, setScale] = React.useState(1.0)
  const [stairsDialogOptions, setStairsDialogOptions] = React.useState<{
    open: boolean
    selectedStairsMapObject: MapObject | null
  }>({
    open: false,
    selectedStairsMapObject: null
  })

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="flex flex-col flex-grow overflow-hidden relative">
        <StairsSelectDialog
          open={stairsDialogOptions.open}
          setOpen={open =>
            setStairsDialogOptions({ ...stairsDialogOptions, open })
          }
          selectedStairsMapObject={stairsDialogOptions.selectedStairsMapObject}
        />
        {map ? (
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
            panning={{ disabled: !panZoomEnabled, velocityDisabled: true }}
            wheel={{ disabled: true }}
            pinch={{ step: 0.05 }}
            zoomAnimation={{ disabled: true }}
            smooth={true}
            alignmentAnimation={{ disabled: true }}
            velocityAnimation={{ disabled: true, sensitivity: 0 }}
            limitToBounds={false}
            centerZoomedOut={true}
            disablePadding={false}
            ref={transformComponentRef}
            centerOnInit={false}
            doubleClick={{
              disabled: false,
              mode: 'zoomOut'
            }}
          >
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
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
                setPanZoomEnabled={setPanZoomEnabled}
                onMapObjectDoubleClick={mapObject => {
                  console.log('mapObject', mapObject)
                  if (
                    mapObject.type === MapObjectType.STAIRS ||
                    mapObject.type === MapObjectType.ELEVATOR
                  ) {
                    setStairsDialogOptions({
                      open: true,
                      selectedStairsMapObject: mapObject
                    })
                  }
                }}
              />
            </TransformComponent>
          </TransformWrapper>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-lg text-gray-500">Откройте SVG файл</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapEditor
