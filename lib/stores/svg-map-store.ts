import { create } from "zustand";
import { type MapConfig } from "../figma-map-config";


interface SvgMapStore {
    map?: string | null;
    setMap: (map: string) => void;
}

export const useSvgMapStore = create<SvgMapStore>((set) => ({
    map: null,
    setMap: (map) => set({ map }),

}));
