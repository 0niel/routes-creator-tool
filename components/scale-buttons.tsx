import { Minus, Plus } from 'lucide-react'
import { Button } from './ui/button'

interface ScaleButtonsProps {
  onZoomIn: () => void
  onZoomOut: () => void
}

const ScaleButtons: React.FC<ScaleButtonsProps> = ({ onZoomIn, onZoomOut }) => {
  return (
    <div className="flex w-12 flex-col space-y-2 rounded-lg border border-gray-300 bg-gray-50 p-2 sm:w-full">
      <Button type="button" onClick={onZoomIn} variant={'secondary'}>
        <Plus size={24} />
      </Button>
      <div>
        <hr className="border-gray-300" />
      </div>
      <Button type="button" onClick={onZoomOut} variant={'secondary'}>
        <Minus size={24} />
      </Button>
    </div>
  )
}

export default ScaleButtons
