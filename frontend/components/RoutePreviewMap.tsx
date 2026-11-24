"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import FitMapToRoute from "@/components/FitMapToRoute";
import { CITY_PIN_ICON, STOP_PIN_ICONS } from "@/components/map-pin-icons";
import { useRoadRoutes, type RoadRouteRequest } from "@/components/road-routing";
import { DISTRICT_COORDINATES, type Coordinates } from "@/lib/malawi-locations";
import type { StopItem } from "@/lib/types";
import { hasCoords } from "@/lib/geo";

export interface RoutePreviewLeg {
  origin: string;
  destination: string;
  pickupPoint: string;
  dropOffPoint: string;
  stopovers: string[];
}

interface RoutePreviewMapProps {
  legs: RoutePreviewLeg[];
  stops: StopItem[];
}

type EndpointRole = "from" | "to";

interface RouteEndpoint {
  id: string;
  city: string;
  coordinates: Coordinates;
  roles: Set<EndpointRole>;
}

function coordinatesForCity(city: string, stops: StopItem[]): Coordinates | null {
  const districtCoordinates = DISTRICT_COORDINATES[city];
  if (districtCoordinates) return districtCoordinates;

  const locatedStop = stops.find(
    (stop): stop is StopItem & { lat: number; lng: number } =>
      stop.city.toLocaleLowerCase() === city.toLocaleLowerCase() && hasCoords(stop),
  );
  return locatedStop ? { lat: locatedStop.lat, lng: locatedStop.lng } : null;
}

function coordinatesForStop(
  stopName: string,
  city: string,
  stops: StopItem[],
): Coordinates | null {
  const locatedStop = stops.find(
    (stop): stop is StopItem & { lat: number; lng: number } =>
      stop.name === stopName &&
      stop.city.toLocaleLowerCase() === city.toLocaleLowerCase() &&
      hasCoords(stop),
  );
  return locatedStop
    ? { lat: locatedStop.lat, lng: locatedStop.lng }
    : coordinatesForCity(city, stops);
}

function appendWaypoint(
  waypoints: { city: string; coordinates: Coordinates | null }[],
  city: string,
  coordinates: Coordinates | null,
) {
  const previous = waypoints[waypoints.length - 1];
  if (
    coordinates &&
    previous?.coordinates &&
    previous.coordinates.lat === coordinates.lat &&
    previous.coordinates.lng === coordinates.lng
  ) {
    return;
  }
  waypoints.push({ city, coordinates });
}

function endpointLabel(roles: Set<EndpointRole>) {
  if (roles.size > 1) return "Transfer point";
  return roles.has("from") ? "From" : "To";
}

function waypointsForLeg(leg: RoutePreviewLeg, stops: StopItem[]) {
  const waypoints: { city: string; coordinates: Coordinates | null }[] = [];
  appendWaypoint(waypoints, leg.origin, coordinatesForStop(leg.pickupPoint, leg.origin, stops));
  leg.stopovers.forEach((city) => {
    appendWaypoint(waypoints, city, coordinatesForCity(city, stops));
  });
  appendWaypoint(
    waypoints,
    leg.destination,
    coordinatesForStop(leg.dropOffPoint, leg.destination, stops),
  );
  return waypoints;
}

export default function RoutePreviewMap({ legs, stops }: RoutePreviewMapProps) {
  const requests = useMemo(() => {
    const segments: RoadRouteRequest[] = [];
    legs.forEach((leg, legIndex) => {
      const waypoints = waypointsForLeg(leg, stops);
      for (let index = 1; index < waypoints.length; index += 1) {
        const origin = waypoints[index - 1];
        const destination = waypoints[index];
        if (!origin.coordinates || !destination.coordinates) continue;
        segments.push({
          id: `${legIndex}-${index}-${origin.city}-${destination.city}`,
          origin: origin.coordinates,
          destination: destination.coordinates,
        });
      }
    });
    return segments;
  }, [legs, stops]);
  const roadRoutes = useRoadRoutes(requests);
  const routeCities = useMemo(
    () => new Set(legs.flatMap((leg) => [leg.origin, ...leg.stopovers, leg.destination].map((city) => city.toLocaleLowerCase()))),
    [legs],
  );
  const locatedStops = useMemo(
    () => stops.filter(
      (stop): stop is StopItem & { lat: number; lng: number } =>
        routeCities.has(stop.city.toLocaleLowerCase()) && hasCoords(stop),
    ),
    [routeCities, stops],
  );
  const unlocatedStopCount = stops.filter(
    (stop) => routeCities.has(stop.city.toLocaleLowerCase()) && !hasCoords(stop),
  ).length;
  const endpoints = useMemo(() => {
    const found = new Map<string, RouteEndpoint>();

    function addEndpoint(
      city: string,
      coordinates: Coordinates | null,
      role: EndpointRole,
    ) {
      if (!coordinates) return;
      const key = `${city.toLocaleLowerCase()}-${coordinates.lat}-${coordinates.lng}`;
      const existing = found.get(key);
      if (existing) {
        existing.roles.add(role);
        return;
      }
      found.set(key, { id: key, city, coordinates, roles: new Set([role]) });
    }

    legs.forEach((leg) => {
      addEndpoint(
        leg.origin,
        coordinatesForStop(leg.pickupPoint, leg.origin, stops),
        "from",
      );
      addEndpoint(
        leg.destination,
        coordinatesForStop(leg.dropOffPoint, leg.destination, stops),
        "to",
      );
    });

    return [...found.values()];
  }, [legs, stops]);
  const routeLines = requests.map((request) => ({
    request,
    geometry: roadRoutes[request.id],
  }));
  const mapPoints = [
    ...routeLines.flatMap(({ geometry }) => geometry?.positions ?? []),
    ...endpoints.map((endpoint): LatLngTuple => [endpoint.coordinates.lat, endpoint.coordinates.lng]),
    ...locatedStops.map((stop): LatLngTuple => [stop.lat, stop.lng]),
  ];
  const isRouting = routeLines.some(({ geometry }) => !geometry || geometry.status === "loading");
  const fallbackCount = routeLines.filter(({ geometry }) => geometry?.status === "fallback").length;
  const unmappedSegmentCount = legs.reduce((count, leg) => {
    const waypoints = waypointsForLeg(leg, stops);
    return count + waypoints.slice(1).filter(
      (waypoint, index) => !waypoint.coordinates || !waypoints[index].coordinates,
    ).length;
  }, 0);

  let routingMessage = "Road-following route shown on OpenStreetMap. Only stops with saved coordinates are pinned.";
  if (isRouting) {
    routingMessage = fallbackCount > 0
      ? `Loading road geometry. ${fallbackCount} segment${fallbackCount === 1 ? " has" : "s have"} already fallen back to a dashed direct line.`
      : "Loading road geometry. Direct-line segments remain visible while road data loads.";
  } else if (fallbackCount > 0) {
    routingMessage = `${fallbackCount} segment${fallbackCount === 1 ? "" : "s"} could not be road-routed; dashed direct-line fallback${fallbackCount === 1 ? " is" : "s are"} shown.`;
  } else if (requests.length === 0) {
    routingMessage = "Road geometry is unavailable for this journey. Located stops, if any, are still shown.";
  }

  if (unmappedSegmentCount > 0) {
    routingMessage += ` ${unmappedSegmentCount} section${unmappedSegmentCount === 1 ? " has" : "s have"} no town coordinates and cannot be drawn.`;
  }
  if (unlocatedStopCount > 0) {
    routingMessage += ` ${unlocatedStopCount} stop${unlocatedStopCount === 1 ? " has" : "s have"} no saved location and ${unlocatedStopCount === 1 ? "is" : "are"} not pinned.`;
  }

  return (
    <div className="route-preview-map-shell">
      <div className="route-preview-map-frame" role="region" aria-label="Selected journey map">
        <MapContainer
          center={[-13.5, 34.2]}
          zoom={7}
          scrollWheelZoom={false}
          className="route-preview-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeLines.map(({ request, geometry }) =>
            geometry ? (
              <Polyline
                key={request.id}
                positions={geometry.positions}
                pathOptions={{
                  color: "#12304A",
                  weight: 5,
                  opacity: 0.9,
                  dashArray: geometry.status === "routed" ? undefined : "7 8",
                }}
              >
                <Popup>
                  {request.origin.lat.toFixed(3)}, {request.origin.lng.toFixed(3)} to{" "}
                  {request.destination.lat.toFixed(3)}, {request.destination.lng.toFixed(3)}
                  <br />
                  {geometry.status === "routed"
                    ? "Road-following route"
                    : geometry.status === "fallback"
                      ? "Road data unavailable · direct-line fallback"
                      : "Loading road geometry · direct-line fallback"}
                </Popup>
              </Polyline>
            ) : null,
          )}
          {endpoints.map((endpoint) => (
            <Marker
              key={`endpoint-${endpoint.id}`}
              position={[endpoint.coordinates.lat, endpoint.coordinates.lng]}
              icon={CITY_PIN_ICON}
            >
              <Popup>
                <strong>{endpoint.city}</strong>
                <br />
                {endpointLabel(endpoint.roles)}
              </Popup>
            </Marker>
          ))}
          {locatedStops.map((stop) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={STOP_PIN_ICONS[stop.kind]}>
              <Popup>
                <strong>{stop.name}</strong>
                <br />
                {stop.city}
                <br />
                {stop.kind === "both" ? "Pickup & drop-off" : stop.kind === "pickup" ? "Pickup" : "Drop-off"}
              </Popup>
            </Marker>
          ))}
          <FitMapToRoute points={mapPoints} padding={[24, 24]} maxZoom={11} />
        </MapContainer>
      </div>
      <p className="route-map-status" role="status" aria-live="polite">
        {routingMessage}
      </p>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-route" /> Route connection</span>
        <span><i className="legend-city" /> From / to town</span>
        <span><i className="legend-pickup" /> Pickup point</span>
        <span><i className="legend-dropoff" /> Drop-off point</span>
        <span><i className="legend-both" /> Pickup and drop-off</span>
      </div>
    </div>
  );
}
