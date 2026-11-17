"use client";

import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { CITY_PIN_ICON, STOP_PIN_ICONS } from "@/components/map-pin-icons";
import type { RoadRouteGeometry } from "@/components/road-routing";
import { hasCoords } from "@/lib/geo";
import type { Coordinates } from "@/lib/malawi-locations";
import type { RouteItem, StopItem, StopKind } from "@/lib/types";

interface RouteNetworkMapProps {
  routes: RouteItem[];
  stops: StopItem[];
  selectedRouteId: string;
  roadRoutes: Record<string, RoadRouteGeometry>;
  cityCoordinates: Record<string, Coordinates>;
  mapCenter: [number, number];
  isRouting: boolean;
  fallbackRouteCount: number;
}

function stopKindLabel(kind: StopKind) {
  if (kind === "both") return "Pickup & drop-off";
  return kind === "pickup" ? "Pickup" : "Drop-off";
}

export default function RouteNetworkMap({
  routes,
  stops,
  selectedRouteId,
  roadRoutes,
  cityCoordinates,
  mapCenter,
  isRouting,
  fallbackRouteCount,
}: RouteNetworkMapProps) {
  return (
    <div className="network-map">
      <MapContainer center={mapCenter} zoom={6} scrollWheelZoom className="route-map" worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routes.map((route) => {
          const origin = cityCoordinates[route.origin] ?? null;
          const destination = cityCoordinates[route.destination] ?? null;
          if (!origin || !destination) return null;

          const isSelected = selectedRouteId === "all" || selectedRouteId === route.id;
          const geometry = roadRoutes[route.id];
          const positions = geometry?.positions ?? [
            [origin.lat, origin.lng] as [number, number],
            [destination.lat, destination.lng] as [number, number],
          ];

          return (
            <Polyline
              key={route.id}
              positions={positions}
              pathOptions={{
                color: isSelected ? "#12304A" : "#5b7288",
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 1 : 0.75,
                dashArray: geometry?.status === "routed" ? undefined : "6 7",
              }}
            >
              <Popup>
                <strong>{route.origin} → {route.destination}</strong><br />
                {route.service}<br />
                {geometry?.status === "routed"
                  ? "Road-following route"
                  : geometry?.status === "fallback"
                    ? "Road data unavailable · showing a direct-line fallback"
                    : "Loading road geometry · direct-line fallback remains visible"}
              </Popup>
            </Polyline>
          );
        })}

        {Object.entries(cityCoordinates).map(([name, coordinates]) => (
          <Marker key={name} position={[coordinates.lat, coordinates.lng]} icon={CITY_PIN_ICON}>
            <Popup>{name}</Popup>
          </Marker>
        ))}

        {stops.filter(hasCoords).map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={STOP_PIN_ICONS[stop.kind]}
          >
            <Popup>
              <strong>{stop.name}</strong><br />
              {stop.city}<br />
              {stopKindLabel(stop.kind)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <p className="route-map-status" role="status" aria-live="polite">
        {isRouting
          ? "Loading road geometry. Direct-line fallbacks remain visible while routes load."
          : fallbackRouteCount > 0
            ? `${fallbackRouteCount} route${fallbackRouteCount === 1 ? "" : "s"} shown as a direct-line fallback because road data is unavailable.`
            : "Routes follow available roads. Dashed lines indicate a direct-line fallback."}
      </p>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-route" /> Route connection</span>
        <span><i className="legend-pickup" /> Pickup point</span>
        <span><i className="legend-dropoff" /> Drop-off point</span>
        <span><i className="legend-both" /> Pickup and drop-off</span>
      </div>
    </div>
  );
}
