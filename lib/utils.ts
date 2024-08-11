import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { MapObject } from "./figma-map-config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getMapObjectByElement = (
  element: Element,
  mapConfigRef: React.MutableRefObject<any>
): MapObject | null => {
  const closest = element.closest("[data-object]");
  if (!closest) return null;

  const mapObjectHtmlElement = closest.getAttribute("data-object");
  if (!mapObjectHtmlElement) return null;

  const [, , objectId] = mapObjectHtmlElement.split("__");
  if (!objectId) return null;

  return (
    mapConfigRef.current.config.objects.find(
      (object) => object.id === objectId
    ) || null
  );
};
