"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import {
  BOTH_ENDS_PIN_ICON,
  DESTINATION_PIN_ICON,
  ORIGIN_PIN_ICON,
} from "@/components/map-pin-icons";
import type { RoadRouteGeometry } from "@/components/road-routing";
import { fmtDate } from "@/lib/booking-data";
import { travelEstimate } from "@/lib/geo";
import type { Coordinates } from "@/lib/malawi-locations";
import type { Trip } from "@/lib/types";

interface TripMapProps {
  trips: Trip[];
  userPosition?: Coordinates | null;
  cityCoordinates: Record<string, Coordinates>;
  tripRoadRoutes: Record<string, RoadRouteGeometry>;
  isTripRouting: boolean;
  tripFallbackCount: number;
}

interface MapEndpoint {
  id: string;
  town: string;
  coordinates: Coordinates;
  isOrigin: boolean;
  isDestination: boolean;
}

export default function TripMap({
  trips,
  userPosition,
  cityCoordinates,
  tripRoadRoutes,
  isTripRouting,
  tripFallbackCount,
}: TripMapProps) {
  const endpoints = useMemo(() => {
    const found = new Map<string, MapEndpoint>();

    function addEndpoint(town: string, coordinates: Coordinates | undefined, role: "origin" | "destination") {
      if (!coordinates) return;
      const id = `${town.toLocaleLowerCase()}-${coordinates.lat}-${coordinates.lng}`;
      const existing = found.get(id);
      if (existing) {
        if (role === "origin") existing.isOrigin = true;
        else existing.isDestination = true;
        return;
      }
      found.set(id, {
        id,
        town,
        coordinates,
        isOrigin: role === "origin",
        isDestination: role === "destination",
      });
    }

    trips.forEach((trip) => {
      const [origin, destination] = trip.route.split(" → ");
      if (origin) addEndpoint(origin, cityCoordinates[origin], "origin");
      if (destination) addEndpoint(destination, cityCoordinates[destination], "destination");
    });

    return [...found.values()];
  }, [trips, cityCoordinates]);

  const departurePoints = useMemo(() => {
    const seen = new Set<string>();
    return trips.flatMap((trip) => {
      const [origin] = trip.route.split(" → ");
      const coordinates = origin ? cityCoordinates[origin] : undefined;
      if (!origin || !coordinates) return [];
      const key = `${coordinates.lat}-${coordinates.lng}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ town: origin, coordinates }];
    });
  }, [trips, cityCoordinates]);

  return (
    <div className="network-map" role="region" aria-label="Booking route map">
      <MapContainer center={[-13.4, 34.2]} zoom={6} scrollWheelZoom className="route-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trips.map((trip) => {
          const [origin, destination] = trip.route.split(" → ");
          const originCoordinates = cityCoordinates[origin];
          const destinationCoordinates = cityCoordinates[destination];
          if (!originCoordinates || !destinationCoordinates) return null;
          const geometry = tripRoadRoutes[trip.id];
          const positions = geometry?.positions ?? [
            [originCoordinates.lat, originCoordinates.lng] as [number, number],
            [destinationCoordinates.lat, destinationCoordinates.lng] as [number, number],
          ];
          return (
            <Polyline
              key={`${trip.id}:${trip.date}`}
              positions={positions}
              pathOptions={{
                color: "#12304A",
                weight: 4,
                opacity: 0.9,
                dashArray: geometry?.status === "routed" ? undefined : "6 7",
              }}
            >
              <Popup>
                <strong>{trip.route}</strong><br />
                {fmtDate(trip.date)} · {trip.departure}<br />
                Estimated fare: MWK {trip.fare.toLocaleString("en-MW")}
                <br />
                {geometry?.status === "routed"
                  ? "Road-following route"
                  : geometry?.status === "fallback"
                    ? "Road data unavailable · showing a direct-line fallback"
                    : "Loading road geometry · direct-line fallback remains visible"}
                <br />
                <Link className="map-trip-select" href={`/transport-booking/details/${trip.id}?date=${trip.date}`}>Choose this trip</Link>
              </Popup>
            </Polyline>
          );
        })}
        {endpoints.map((endpoint) => {
          const isBoth = endpoint.isOrigin && endpoint.isDestination;
          const icon = isBoth
            ? BOTH_ENDS_PIN_ICON
            : endpoint.isOrigin
              ? ORIGIN_PIN_ICON
              : DESTINATION_PIN_ICON;
          const label = isBoth
            ? "Departure town and final destination"
            : endpoint.isOrigin
              ? "Departure town"
              : "Final destination";

          return (
            <Marker
              key={endpoint.id}
              position={[endpoint.coordinates.lat, endpoint.coordinates.lng]}
              icon={icon}
            >
              <Popup>
                <strong>{endpoint.town}</strong><br />
                {label}
              </Popup>
            </Marker>
          );
        })}
        {userPosition && departurePoints.map((point) => (
          <Polyline
            key={`user-to-${point.town}`}
            positions={[
              [userPosition.lat, userPosition.lng],
              [point.coordinates.lat, point.coordinates.lng],
            ]}
            pathOptions={{
              color: "#0ea5e9",
              weight: 3,
              opacity: 0.9,
              dashArray: "2 8",
            }}
          >
            <Popup>
              <strong>Your position → {point.town}</strong><br />
              {travelEstimate(userPosition.lat, userPosition.lng, point.coordinates.lat, point.coordinates.lng).label}
              <br />
              Straight-line distance shown dotted; time is a road estimate.
            </Popup>
          </Polyline>
        ))}
        {userPosition && (
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#0ea5e9",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>Your current position</strong><br />
              Dotted lines point to the departure town of each scheduled trip.
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
      <p className="route-map-status" role="status" aria-live="polite">
        {isTripRouting
          ? "Loading road geometry. Direct-line fallbacks remain visible while routes load."
          : tripFallbackCount > 0
            ? `${tripFallbackCount} trip${tripFallbackCount === 1 ? "" : "s"} shown as a direct-line fallback because road data is unavailable.`
            : "Trip routes follow available roads. Dashed lines indicate a direct-line fallback."}
      </p>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-origin" /> Departure town</span>
        <span><i className="legend-destination" /> Final destination</span>
        <span><i className="legend-route" /> Route connection</span>
        <span><i className="legend-user" /> Your position</span>
        <span><i className="legend-user-line" /> Way to departure</span>
      </div>
    </div>
  );
}
