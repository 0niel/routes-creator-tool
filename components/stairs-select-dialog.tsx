import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapObject, MapObjectType } from '@/lib/figma-map-config'
import { StairsRef, useMapConfigStore } from '@/lib/stores/map-config-store'
import React, { useEffect, useState } from 'react'
import { ScrollArea } from './ui/scroll-area'

interface MapToolsDialogProps {
  selectedStairsMapObject: MapObject | null
  open: boolean
  setOpen: (open: boolean) => void
}

const StairsSelectDialog: React.FC<MapToolsDialogProps> = ({
  selectedStairsMapObject,
  open,
  setOpen,
}) => {
  const figmaMapConfig = useMapConfigStore()

  const [selectedOtherStairsIds, setSelectedOtherStairsIds] = useState<string[]>([])
  const [stairsRefs, setStairsRefs] = useState<StairsRef[]>([])

  useEffect(() => {
    const cachedStairsRefs = localStorage.getItem('stairsRefs')
    if (cachedStairsRefs) {
      const parsedStairsRefs = JSON.parse(cachedStairsRefs) as StairsRef[]
      setStairsRefs(parsedStairsRefs)
    }
  }, [])

  useEffect(() => {
    if (selectedStairsMapObject) {
      const stairsRef = stairsRefs.find(
        (stairsRef) => stairsRef.fromId === selectedStairsMapObject.id
      )
      if (stairsRef) {
        setSelectedOtherStairsIds(stairsRef.toIds)
      } else {
        setSelectedOtherStairsIds([])
      }
    }
  }, [selectedStairsMapObject, stairsRefs])

  const handleOk = () => {
    if (selectedStairsMapObject) {
      const updatedStairsRefs = stairsRefs.map((stairsRef) =>
        stairsRef.fromId === selectedStairsMapObject.id
          ? { ...stairsRef, toIds: selectedOtherStairsIds }
          : stairsRef
      )

      if (!stairsRefs.some((stairsRef) => stairsRef.fromId === selectedStairsMapObject.id)) {
        updatedStairsRefs.push({
          fromId: selectedStairsMapObject.id,
          toIds: selectedOtherStairsIds,
        } as StairsRef)
      }

      setStairsRefs(updatedStairsRefs)
      figmaMapConfig.setStairsRefs(updatedStairsRefs)
      localStorage.setItem('stairsRefs', JSON.stringify(updatedStairsRefs))
    }
    setOpen(false)
  }

  const handleClearCache = () => {
    localStorage.removeItem('stairsRefs')
    setStairsRefs([])
    setSelectedOtherStairsIds([])
  }

  const [filter, setFilter] = useState('')
  const [importData, setImportData] = useState('')

  const handleAdd = (idToAdd: string) => {
    setSelectedOtherStairsIds([...selectedOtherStairsIds, idToAdd])
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        if (!e.target?.result) return
        setImportData(e.target.result.toString())

        const dataToImport = JSON.parse(e.target.result.toString()) as {
          stairsRefs: StairsRef[]
        }

        setStairsRefs(dataToImport.stairsRefs)
        figmaMapConfig.setStairsRefs(dataToImport.stairsRefs)
        localStorage.setItem('stairsRefs', JSON.stringify(dataToImport.stairsRefs))
      }
      reader.readAsText(file)
    } catch (error) {
      console.log('Error importing data:', error)
    }
  }

  const handleExport = () => {
    const dataToExport = {
      stairsRefs: stairsRefs,
    }
    const exportedData = JSON.stringify(dataToExport)

    const element = document.createElement('a')
    const file = new Blob([exportedData], {
      type: 'application/json',
    })
    element.href = URL.createObjectURL(file)
    element.download = 'stairs.json'
    document.body.appendChild(element) // Required for this to work in FireFox
    element.click()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выберите куда ведёт этот объект</DialogTitle>
        </DialogHeader>

        <Input
          type="text"
          placeholder="Фильтр"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <ScrollArea className="mt-4 h-96">
          {figmaMapConfig.config.objects
            .filter(
              (object) =>
                object.type === MapObjectType.STAIRS ||
                object.type == MapObjectType.TRANSITION ||
                object.type == MapObjectType.ELEVATOR
            )
            .filter((object) => object.id !== selectedStairsMapObject?.id)
            .filter((object) => object.id.includes(filter))
            .map((object) => (
              <div key={object.id} className="flex items-center justify-between">
                {selectedOtherStairsIds.includes(object.id) ? (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      setSelectedOtherStairsIds(
                        selectedOtherStairsIds.filter((id) => id !== object.id)
                      )
                    }
                  >
                    Удалить
                  </Button>
                ) : (
                  <Button onClick={() => handleAdd(object.id)}>Добавить</Button>
                )}
                <div className="ml-4">{object.id}</div>
              </div>
            ))}
        </ScrollArea>

        <div className="mt-4 space-x-2">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="importFile">Импортировать JSON файл</Label>
            <Input id="importFile" type="file" onChange={handleImport} />
          </div>
          <Button onClick={handleExport}>Экспорт</Button>
          <Button variant="destructive" onClick={handleClearCache}>
            Очистить кэш
          </Button>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Связанные лестницы и этажи</AccordionTrigger>
            <AccordionContent>
              {selectedOtherStairsIds.map((id) => {
                const connectedStairs = figmaMapConfig.config.objects.find(
                  (object) => object.id === id
                )
                return (
                  <div key={id}>
                    <strong>Лестница:</strong> {id} <br />
                  </div>
                )
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter>
          <Button onClick={handleOk}>Ок</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StairsSelectDialog
