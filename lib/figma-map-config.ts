export enum MapObjectType {
  ROOM = 'room',
  TOILET = 'toilet',
  CANTEEN = 'canteen',
  ATM = 'atm',
  STAIRS = 'stairs',
  LECTURE = 'lecture',
  ELEVATOR = 'elevator',
  PARK = 'park',
  DRESSING_ROOM = 'dressing_room',
  LIBRARY = 'library',
  CLOSET = 'closet',
  GUARD_POST = 'guard_post',
  TRANSITION = 'transition'
}

export enum Campus {
  SOKOL = 'Сокол'
}

export interface MapComponent {
  id: string
  type: MapObjectType
  useInnerTextAsName: boolean
  name?: string
  description?: string
  metadata?: Record<string, any>
}

export interface MapObject {
  id: string
  type: MapObjectType
  name: string
  description?: string
  metadata?: Record<string, any>
}

export interface MapConfig {
  components: MapComponent[]
  objects: MapObject[]
}

export function getShortNameForMapObjectType(type: MapObjectType) {
  const typeShortNames = {
    [MapObjectType.ROOM]: 'r',
    [MapObjectType.TOILET]: 't',
    [MapObjectType.CANTEEN]: 'c',
    [MapObjectType.ATM]: 'a',
    [MapObjectType.STAIRS]: 's',
    [MapObjectType.LECTURE]: 'l',
    [MapObjectType.ELEVATOR]: 'e',
    [MapObjectType.PARK]: 'p',
    [MapObjectType.DRESSING_ROOM]: 'dr',
    [MapObjectType.LIBRARY]: 'lib',
    [MapObjectType.CLOSET]: 'cl',
    [MapObjectType.GUARD_POST]: 'gp',
    [MapObjectType.TRANSITION]: 'tr'
  }
  return typeShortNames[type] || 'r'
}
