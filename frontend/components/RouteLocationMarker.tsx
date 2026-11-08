"use client";

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";

const locationIcons = {
  Pickup: L.divIcon({
    className: "booking-location-icon",
    html: '<svg class="booking-location-symbol" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1.5C8 1.5 1.5 8 1.5 16c0 10.1 14.5 24.5 14.5 24.5S30.5 26.1 30.5 16C30.5 8 24 1.5 16 1.5Z" fill="#fff" stroke="#173b57" stroke-width="2.5"/><circle cx="16" cy="16" r="9" fill="#173b57"/><text x="16" y="20" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="11" font-weight="700">P</text></svg>',
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    popupAnchor: [0, -38],
  }),
  "Drop-off": L.divIcon({
    className: "booking-location-icon",
    html: '<svg class="booking-location-symbol" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1.5C8 1.5 1.5 8 1.5 16c0 10.1 14.5 24.5 14.5 24.5S30.5 26.1 30.5 16C30.5 8 24 1.5 16 1.5Z" fill="#fff" stroke="#173b57" stroke-width="2.5"/><circle cx="16" cy="16" r="9" fill="#173b57"/><text x="16" y="20" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="11" font-weight="700">D</text></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 40],
  popupAnchor: [0, -38],
  }),
};

export default function RouteLocationMarker({
  position,
  label,
  town,
}: {
  position: [number, number];
  label: keyof typeof locationIcons;
  town: string;
}) {
  return (
    <Marker position={position} icon={locationIcons[label]} title={`${label}: ${town}`}>
      <Popup>{label}: {town}</Popup>
    </Marker>
  );
}
