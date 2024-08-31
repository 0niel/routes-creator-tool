import { MainMenu } from '@/components/main-menu'
import MapEditor from '@/components/map-editor'

export default function Home() {
  return (
    <main className="flex h-screen w-screen flex-col">
      <MainMenu />

      <MapEditor />
    </main>
  )
}
