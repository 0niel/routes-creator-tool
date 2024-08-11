"use client"

import React, { useRef, ChangeEvent } from "react"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { useSvgMapStore } from "@/lib/stores/svg-map-store"

export const MainMenu: React.FC = () => {
  const { map, setMap } = useSvgMapStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result
        if (typeof result === "string") {
          setMap(result)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleOpenFileClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Файл</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={handleOpenFileClick}>Открыть SVG</MenubarItem>
          <MenubarSeparator />
        </MenubarContent>
      </MenubarMenu>
      <input
        type="file"
        accept=".svg"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </Menubar>
  )
}
