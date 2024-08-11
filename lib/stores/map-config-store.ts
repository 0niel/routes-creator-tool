import { create } from "zustand";
import { type MapConfig } from "../figma-map-config";

export interface StairsRef {
  fromId: string;
  toIds: string[];
}

interface MapConfigStore {
  config: MapConfig;
  setConfig: (config: MapConfig) => void;
  editerFloor: number;
  setEditerFloor: (floor: number) => void;
  stairsRefs: StairsRef[];
  setStairsRefs: (stairsRefs: StairsRef[]) => void;
}

export const useMapConfigStore = create<MapConfigStore>((set) => ({
  config: {
    components: [],
    objects: [],
  } as MapConfig,
  setConfig: (config) => set({ config }),
  editerFloor: 0,
  setEditerFloor: (floor) => set({ editerFloor: floor }),
  stairsRefs: [],
  setStairsRefs: (stairsRefs) => set({ stairsRefs }),
}));
