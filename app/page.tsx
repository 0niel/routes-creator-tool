import { MainMenu } from "@/components/main-menu"
import MapEditor from "@/components/map-editor"
import Image from "next/image"

export default function Home() {
  return (
    <main className="flex h-screen w-screen flex-col">
      <MainMenu />

      <MapEditor />
    </main>
  )
}
