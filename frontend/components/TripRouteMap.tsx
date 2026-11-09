"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = [number, number];

type Props = {
  from: string;
  to: string;
  start: Point;
  end: Point;
  route?: { positions: Point[]; distance: number; duration: number };
  loading: boolean;
};

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

// Teardrop pin with a city label beside it
function pinIcon(color: string, label: string) {
  return L.divIcon({
    className: "trip-pin-icon",
    html: `<div class="trip-pin">
      <svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0Z" fill="${color}"/>
        <circle cx="12" cy="11.5" r="4.5" fill="#fff"/>
      </svg>
      <span class="trip-pin-label">${label}</span>
    </div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40], // the tip of the pin sits exactly on the location
  });
}

// Blue "≈ 3 h 30 min (≈ 220 km)" label on the route
function badgeIcon(text: string) {
  return L.divIcon({
    className: "trip-badge-icon",
    html: `<div class="trip-badge">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M4 16c0 .9.4 1.7 1 2.2V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.8c.6-.5 1-1.3 1-2.2V6c0-3.5-3.6-4-8-4S4 2.5 4 6v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z"/>
      </svg>
      <span>${text}</span>
    </div>`,
    iconSize: [190, 40],
    iconAnchor: [95, 20],
  });
}

export default function TripRouteMap({ from, to, start, end, route, loading }: Props) {
  const startIcon = useMemo(() => pinIcon("#16a34a", from), [from]); // green
  const endIcon = useMemo(() => pinIcon("#ef4444", to), [to]);       // red

  const midpoint = route ? route.positions[Math.floor(route.positions.length / 2)] : null;
  const badgeText = route
    ? `≈ ${formatDuration(route.duration)} (≈ ${Math.round(route.distance / 1000)} km)`
    : "";

  return (
    <div className="summary-map-wrap">
      <MapContainer
        key={`${start.join(",")}-${end.join(",")}-${route ? "route" : "plain"}`}
        bounds={route?.positions ?? [start, end]}
        boundsOptions={{ padding: [40, 40] }}
        scrollWheelZoom={false}
        zoomControl={false}
        className="summary-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {route ? (
          <Polyline positions={route.positions} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.9 }} />
        ) : (
          !loading && <Polyline positions={[start, end]} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6 8" }} />
        )}

        <Marker position={start} icon={startIcon} />
        <Marker position={end} icon={endIcon} />
        {midpoint && <Marker position={midpoint} icon={badgeIcon(badgeText)} interactive={false} />}
      </MapContainer>
      {loading && <p className="summary-map-status">Loading route…</p>}
    </div>
  );
}