export enum MapObjectType {
  ROOM = "room",
  TOILET = "toilet",
  CANTEEN = "canteen",
  ATM = "atm",
  STAIRS = "stairs",
  LECTURE = "lecture",
  ELEVATOR = "elevator",
}

export enum Campus {
  V78 = "В-78",
  V86 = "В-86",
  S20 = "С-20",
  MP1 = "МП-1",
}

export interface MapComponent {
  id: string; // для компонентов или экземпляров это id компонента-родителя, для остального это id Node
  type: MapObjectType;
  useInnerTextAsName: boolean; // использовать текст внутри компонента как название объекта
  name?: string; // отображаемое читаемое название объекта. Если useInnerTextAsName = false, то это название будет использоваться для генерации названия объекта
  description?: string; // описание для всех объектов от этого компонентав
}

export interface MapObject {
  id: string;
  type: MapObjectType;
  name: string; // отображаемое читаемое название объекта
  description?: string;
}

export interface MapConfig {
  // Компоненты, параметры которых будут использовать для генерации названий объектов
  components: MapComponent[];
  // Объекты, добавленные вручную
  objects: MapObject[];
}

export function getShorNameForMapObectType(type: MapObjectType) {
  switch (type) {
    case MapObjectType.ROOM:
      return "r";
    case MapObjectType.TOILET:
      return "t";
    case MapObjectType.CANTEEN:
      return "c";
    case MapObjectType.ATM:
      return "a";
    case MapObjectType.STAIRS:
      return "s";
    case MapObjectType.LECTURE:
      return "l";
    case MapObjectType.ELEVATOR:
      return "e";
    default:
      return "r";
  }
}
