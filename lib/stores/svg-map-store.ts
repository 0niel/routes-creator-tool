import { create } from 'zustand'

interface SvgMapStore {
  map?: string | null
  setMap: (map: string) => void
}

export const useSvgMapStore = create<SvgMapStore>(set => ({
  map: null,
  setMap: map => set({ map })
}))
