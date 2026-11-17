import { divIcon } from "leaflet";
import type { StopKind } from "@/lib/types";

type PinKind = "city" | "origin" | "destination" | "both-ends" | StopKind;

function createPinIcon(kind: PinKind) {
  const isCity = kind === "city";
  return divIcon({
    className: "map-pin-icon",
    html: `<span class="map-pin map-pin--${kind}"><span class="map-pin__center"></span></span>`,
    iconSize: isCity ? [24, 31] : [28, 36],
    iconAnchor: isCity ? [12, 30] : [14, 35],
    popupAnchor: [0, -32],
  });
}

export const CITY_PIN_ICON = createPinIcon("city");
export const ORIGIN_PIN_ICON = createPinIcon("origin");
export const DESTINATION_PIN_ICON = createPinIcon("destination");
export const BOTH_ENDS_PIN_ICON = createPinIcon("both-ends");
export const STOP_PIN_ICONS: Record<StopKind, ReturnType<typeof divIcon>> = {
  pickup: createPinIcon("pickup"),
  dropoff: createPinIcon("dropoff"),
  both: createPinIcon("both"),
};
