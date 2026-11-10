"use client";

import L from "leaflet";
import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export default function RouteLocationMarker({
  position,
  label,
  town,
  details,
}: {
  position: [number, number];
  label: "Pickup" | "Drop-off" | "Pickup & drop-off";
  town: string;
  details?: string;
}) {
  const icon = useMemo(() => {
    const color = label === "Pickup" ? "#16966a" : label === "Drop-off" ? "#e34d59" : "#7851a9";
    return L.divIcon({
      className: `booking-location-icon booking-location-icon--${label === "Pickup" ? "pickup" : label === "Drop-off" ? "dropoff" : "both"}`,
      html: `<svg class="booking-location-symbol" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1.5C8 1.5 1.5 8 1.5 16c0 10.1 14.5 24.5 14.5 24.5S30.5 26.1 30.5 16C30.5 8 24 1.5 16 1.5Z" fill="${color}"/><circle cx="16" cy="16" r="5" fill="#fff"/></svg><span class="booking-location-label">${escapeHtml(town)}</span>`,
      iconSize: [180, 42],
      iconAnchor: [16, 40],
      popupAnchor: [0, -38],
    });
  }, [label, town]);

  return (
    <Marker position={position} icon={icon} title={`${label}: ${town}`}>
      <Popup>{label}: {town}{details ? ` · ${details}` : ""}</Popup>
    </Marker>
  );
}
