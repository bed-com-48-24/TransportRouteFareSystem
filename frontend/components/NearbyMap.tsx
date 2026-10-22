"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { StopItem } from "@/lib/types";

type Located = StopItem & { lat: number; lng: number; km?: number };

export default function NearbyMap({
  center,
  stops,
  user,
}: {
  center: [number, number];
  stops: Located[];
  user: [number, number] | null;
}) {
  return (
    <MapContainer
      key={center.join(",")} // re-centre when the search point changes
      center={center}
      zoom={13}
      style={{ height: 380, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {user && (
        <CircleMarker center={user} radius={9} pathOptions={{ color: "#1d4ed8", fillOpacity: 0.9 }}>
          <Popup>You are here</Popup>
        </CircleMarker>
      )}
      {stops.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={8}
          pathOptions={{ color: s.kind === "pickup" ? "#15803d" : "#b91c1c", fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{s.name}</strong>
            <br />
            {s.kind === "pickup" ? "Pickup point" : "Drop-off point"} · {s.city}
            {s.km !== undefined && <><br />{s.km.toFixed(1)} km away</>}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
