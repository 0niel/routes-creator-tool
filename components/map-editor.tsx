"use client"

import React, { useEffect, useRef, useState } from "react"

import "jointjs/dist/joint.css"
import "jointjs/css/layout.css"
import "jointjs/css/themes/modern.css"

import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch"
import ScaleButtons from "./scale-buttons"
import { useSvgMapStore } from "@/lib/stores/svg-map-store"
import { MapObjectType } from "@/lib/figma-map-config"
import { MouseMode } from "@/lib/mouse-mode"
import MapCanvas from "./map-canvas"

const MapEditor = () => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null)
  const svgRef = useRef<HTMLDivElement>(null)

  const { map, setMap } = useSvgMapStore()
  const [mouseMode, setMouseMode] = React.useState(MouseMode.NONE)
  const mouseModeRef = useRef(mouseMode)
  useEffect(() => {
    if (mouseMode === MouseMode.CREATE_PORT) {
      document.body.style.cursor = "crosshair"
    } else if (mouseMode === MouseMode.NONE) {
      document.body.style.cursor = "default"
    }

    mouseModeRef.current = mouseMode
  }, [mouseMode])
  const [panZoomEnabled, setPanZoomEnabled] = React.useState(true)
  const [scale, setScale] = React.useState(1.0)

  useEffect(() => {
    if (svgRef.current && transformComponentRef.current) {
      const svgElement = svgRef.current.querySelector("svg")
      if (svgElement) {
        const svgBBox = svgElement.getBoundingClientRect()
        const svgWidth = svgBBox.width
        const svgHeight = svgBBox.height

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Calculate scale to fit SVG within viewport
        const scaleX = viewportWidth / svgWidth
        const scaleY = viewportHeight / svgHeight
        const scaleToFit = Math.min(scaleX, scaleY, 1)

        // Calculate positions to center SVG
        const positionX = (viewportWidth - svgWidth * scaleToFit) / 2
        const positionY = (viewportHeight - svgHeight * scaleToFit) / 2

        transformComponentRef.current.setTransform(
          positionX,
          positionY,
          scaleToFit,
          500,
          "easeOut"
        )

        setScale(scaleToFit)
      }
    }
  }, [map])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <div className="flex flex-col flex-grow overflow-hidden relative">
        {map ? (
          <TransformWrapper
            minScale={0.05}
            initialScale={scale}
            maxScale={2}
            onTransformed={(e) => {
              if (e.state.scale !== scale) {
                setScale(e.state.scale)
              }
            }}
            onZoom={(e) => {
              if (e.state.scale !== scale) {
                setScale(e.state.scale)
              }
            }}
            panning={{ disabled: !panZoomEnabled, velocityDisabled: true }}
            wheel={{ disabled: !panZoomEnabled, step: 0.05 }}
            pinch={{ step: 0.05 }}
            zoomAnimation={{ disabled: true }}
            smooth={true}
            alignmentAnimation={{ disabled: true }}
            velocityAnimation={{ disabled: true, sensitivity: 0 }}
            limitToBounds={false}
            centerZoomedOut={true}
            disablePadding={false}
            doubleClick={{ disabled: true }}
            ref={transformComponentRef}
            centerOnInit={true}
          >
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative", // Ensure relative positioning for contained elements
              }}
            >
              <div
                ref={svgRef}
                dangerouslySetInnerHTML={{ __html: map }}
                id="svg-map"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  overflow: "hidden",
                }}
              />

              <MapCanvas
                className="absolute inset-0 z-30"
                mouseMode={mouseMode}
                setMouseMode={setMouseMode}
                setPanZoomEnabled={setPanZoomEnabled}
                onMapObjectDoubleClick={(mapObject) => {
                  if (mapObject.type === MapObjectType.STAIRS) {
                    // Handle double click on map object
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
