'use client'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger
} from '@/components/ui/menubar'
import { generateGraph } from '@/lib/graph'
import { useJointCanvasStore } from '@/lib/stores/joint-canvas-store'
import { useMapConfigStore } from '@/lib/stores/map-config-store'
import { useSvgMapStore } from '@/lib/stores/svg-map-store'
import React, { ChangeEvent, useEffect, useRef, useState } from 'react'

export const MainMenu: React.FC = () => {
  const { map, setMap } = useSvgMapStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const jointCanvas = useJointCanvasStore()
  const figmaMapConfig = useMapConfigStore()

  const [isSvgImported, setIsSvgImported] = useState(false)
  const [isGraphImported, setIsGraphImported] = useState(false)
  const [isFigmaConfigImported, setIsFigmaConfigImported] = useState(false)

  useEffect(() => {
    const cachedFigmaConfig = localStorage.getItem('figmaConfig')
    if (cachedFigmaConfig) {
      try {
        const json = JSON.parse(cachedFigmaConfig)
        figmaMapConfig.setConfig(json)
        setIsFigmaConfigImported(true)
      } catch (error) {
        console.error('Error parsing cached Figma config:', error)
        localStorage.removeItem('figmaConfig')
      }
    }
  }, []) // Removed figmaMapConfig from the dependency array

  const handleOpenFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleSvgImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          setMap(result)
          setIsSvgImported(true)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleGraphImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result
        if (text) {
          try {
            const json = JSON.parse(text as string)
            if (Array.isArray(json.cells)) {
              jointCanvas.graph.fromJSON(json)
              setIsGraphImported(true)
            } else {
              console.error("Invalid graph JSON: 'cells' array is missing")
            }
          } catch (error) {
            console.error('Error parsing JSON:', error)
          }
        }
      }
      reader.readAsText(file)
    }
  }

  const handleFigmaConfigImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result
        if (text) {
          try {
            const json = JSON.parse(text as string)
            if (json.components && json.objects) {
              figmaMapConfig.setConfig(json)
              setIsFigmaConfigImported(true)
              localStorage.setItem('figmaConfig', JSON.stringify(json))
            } else {
              console.error('Invalid Figma config JSON')
            }
          } catch (error) {
            console.error('Error parsing JSON:', error)
          }
        }
      }
      reader.readAsText(file)
    }
  }

  const handleRoutesExport = () => {
    try {
      const generated = generateGraph(
        jointCanvas.graph,
        figmaMapConfig.stairsRefs
      )
      const json = JSON.stringify(generated, null, 2)
      const file = new File([json], 'graph.json', {
        type: 'application/json'
      })

      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = 'routes.json'
      a.click()
    } catch (error) {
      console.error('Error generating or exporting graph:', error)
    }
  }

  const handleJointjsGraphExport = () => {
    try {
      const json = jointCanvas.graph.toJSON()
      const file = new Blob([JSON.stringify(json)], {
        type: 'application/json'
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = 'graph.json'
      a.click()
    } catch (error) {
      console.error('Error generating or exporting graph:', error)
    }
  }

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Файл</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleOpenFileClick}>
            {isSvgImported && (
              <Checkbox checked={true} disabled className="mr-2" />
            )}
            Открыть SVG
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleOpenFileClick}>
            {isGraphImported && (
              <Checkbox checked={true} disabled className="mr-2" />
            )}
            Импорт JointJS графа
          </MenubarItem>
          <MenubarItem onClick={handleOpenFileClick}>
            {isFigmaConfigImported && (
              <Checkbox checked={true} disabled className="mr-2" />
            )}
            Импорт Figma конфигурации
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={handleRoutesExport}>
            Экспорт маршрута
          </MenubarItem>
          <MenubarItem onClick={handleJointjsGraphExport}>
            Экспорт JointJS графа
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <input
        type="file"
        accept=".svg,.json"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={e => {
          const fileType = e.target.files?.[0]?.type
          if (fileType === 'image/svg+xml') {
            handleSvgImport(e)
          } else if (fileType === 'application/json') {
            const reader = new FileReader()
            const file = e.target.files?.[0]
            if (file) {
              reader.onload = event => {
                const text = event.target?.result
                if (text) {
                  try {
                    const json = JSON.parse(text as string)

                    if (json.components && json.objects) {
                      handleFigmaConfigImport(e)
                    } else if (Array.isArray(json.cells)) {
                      handleGraphImport(e)
                    } else {
                      console.error('Unknown JSON structure')
                    }
                  } catch (error) {
                    console.error('Error parsing JSON:', error)
                  }
                }
              }
              reader.readAsText(file)
            }
          }
        }}
      />
    </Menubar>
  )
}
