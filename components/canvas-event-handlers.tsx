import { dia } from "jointjs"
import { MouseMode } from "@/lib/mouse-mode"
import { getMapObjectByElement } from "@/lib/utils"
import { MapObject } from "@/lib/figma-map-config"
import { createPortElement, getLinkToolsView } from "@/lib/joint-utils"

interface SetupCanvasEventsProps {
  setPanZoomEnabled: (enabled: boolean) => void
  setMouseMode: (mode: MouseMode) => void
  onMapObjectDoubleClick: (mapObject: MapObject) => void
  mapConfigRef: React.MutableRefObject<any>
  mouseModeRef: React.MutableRefObject<MouseMode>
}

export const setupCanvasEvents = (
  paper: dia.Paper,
  {
    setPanZoomEnabled,
    setMouseMode,
    onMapObjectDoubleClick,
    mapConfigRef,
    mouseModeRef,
  }: SetupCanvasEventsProps
) => {
  paper.on({
    "blank:pointerdown": (evt: dia.Event, x: number, y: number) => {
      if (mouseModeRef.current === MouseMode.CREATE_PORT && evt.button === 0) {
        createPortElement(x, y, paper)
        setMouseMode(MouseMode.NONE)
      } else {
        setPanZoomEnabled(true)
      }
    },
    "cell:pointerup blank:pointerup": () => setPanZoomEnabled(false),
    "cell:pointermove": (cellView: dia.CellView) => {
      const rect = cellView.el.getBoundingClientRect()
      const elements = document.elementsFromPoint(rect.left, rect.top)

      for (const el of elements) {
        const mapObject = getMapObjectByElement(el, mapConfigRef)
        if (mapObject) {
          cellView.model.attr({
            ".id/text": mapObject.id || "",
            ".label/text": mapObject.name || "",
          })
        }
      }
    },
    "link:mouseenter": (linkView: dia.LinkView) =>
      linkView.addTools(getLinkToolsView()),
    "link:mouseleave": (linkView: dia.LinkView) => linkView.removeTools(),
    "cell:pointerdblclick": (cellView: dia.CellView) => {
      const objId = cellView.model.attr(".id/text") as string | undefined
      const mapObject = mapConfigRef.current.config.objects.find(
        (object) => object.id === objId
      )
      if (mapObject) {
        onMapObjectDoubleClick(mapObject)
      }
    },
    "cell:contextmenu": (cellView: dia.CellView) => {
      const objId = cellView.model.attr(".id/text") as string | undefined
      if (objId) {
        const cell = paper.findViewByModel(cellView.model)
        cell?.model.remove()
      }
    },
  })
}
