import { useEffect } from "react"
import { MouseMode } from "@/lib/mouse-mode"

export const useKeyboardHandlers = (
  setMouseMode: (mode: MouseMode) => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyW") {
        setMouseMode(MouseMode.CREATE_PORT)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setMouseMode(MouseMode.NONE)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [setMouseMode])
}
