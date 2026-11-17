"use client";

import { useEffect, useMemo, useState } from "react";
import type { LatLngTuple } from "leaflet";
import type { Coordinates } from "@/lib/malawi-locations";

export interface RoadRouteRequest {
  id: string;
  origin: Coordinates;
  destination: Coordinates;
}

export interface RoadRouteGeometry {
  positions: LatLngTuple[];
  status: "loading" | "routed" | "fallback";
}

const ROUTER_URL = "https://router.project-osrm.org/route/v1/driving";
const ROUTE_TIMEOUT_MS = 10_000;
const REQUEST_GAP_MS = 1_000;
const roadGeometryCache = new Map<string, LatLngTuple[]>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchRoadGeometry(
  origin: Coordinates,
  destination: Coordinates,
  signal: AbortSignal,
): Promise<LatLngTuple[]> {
  const coordinates = `${origin.lng.toFixed(5)},${origin.lat.toFixed(5)};${destination.lng.toFixed(5)},${destination.lat.toFixed(5)}`;
  const cachedGeometry = roadGeometryCache.get(coordinates);
  if (cachedGeometry) return cachedGeometry;

  const controller = new AbortController();
  const abortOnUnmount = () => controller.abort();
  signal.addEventListener("abort", abortOnUnmount, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ROUTER_URL}/${coordinates}?overview=full&geometries=geojson&steps=false`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`Routing service returned ${response.status}.`);

    const result: unknown = await response.json();
    if (!isRecord(result) || result.code !== "Ok" || !Array.isArray(result.routes)) {
      throw new Error("Routing service returned no road route.");
    }

    const firstRoute = result.routes[0];
    if (!isRecord(firstRoute) || !isRecord(firstRoute.geometry) || !Array.isArray(firstRoute.geometry.coordinates)) {
      throw new Error("Routing service returned invalid route geometry.");
    }

    const positions = firstRoute.geometry.coordinates.map((point): LatLngTuple => {
      if (
        !Array.isArray(point) ||
        typeof point[0] !== "number" ||
        typeof point[1] !== "number" ||
        !Number.isFinite(point[0]) ||
        !Number.isFinite(point[1])
      ) {
        throw new Error("Routing service returned invalid coordinates.");
      }
      return [point[1], point[0]];
    });

    if (positions.length < 2) throw new Error("Routing service returned an incomplete route.");
    roadGeometryCache.set(coordinates, positions);
    return positions;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", abortOnUnmount);
  }
}

export function useRoadRoutes(requests: readonly RoadRouteRequest[]) {
  const requestKey = JSON.stringify(requests);
  const stableRequests = useMemo(
    () => JSON.parse(requestKey) as RoadRouteRequest[],
    [requestKey],
  );
  const pendingGeometries = useMemo(
    () => Object.fromEntries(
      stableRequests.map((route) => [
        route.id,
        {
          positions: [
            [route.origin.lat, route.origin.lng],
            [route.destination.lat, route.destination.lng],
          ] as LatLngTuple[],
          status: "loading" as const,
        },
      ]),
    ),
    [stableRequests],
  );
  const [routeState, setRouteState] = useState<{
    requestKey: string;
    geometries: Record<string, RoadRouteGeometry>;
  }>({ requestKey: "", geometries: {} });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadRoutes() {
      for (const [index, route] of stableRequests.entries()) {
        if (cancelled) return;
        if (index > 0) await new Promise((resolve) => window.setTimeout(resolve, REQUEST_GAP_MS));
        if (cancelled) return;

        try {
          const positions = await fetchRoadGeometry(route.origin, route.destination, controller.signal);
          if (!cancelled) {
            setRouteState((current) => {
              const geometries = current.requestKey === requestKey
                ? current.geometries
                : pendingGeometries;
              return {
                requestKey,
                geometries: {
                  ...geometries,
                  [route.id]: { positions, status: "routed" },
                },
              };
            });
          }
        } catch {
          if (!cancelled) {
            setRouteState((current) => {
              const geometries = current.requestKey === requestKey
                ? current.geometries
                : pendingGeometries;
              return {
                requestKey,
                geometries: {
                  ...geometries,
                  [route.id]: {
                    positions: [
                      [route.origin.lat, route.origin.lng],
                      [route.destination.lat, route.destination.lng],
                    ],
                    status: "fallback",
                  },
                },
              };
            });
          }
        }
      }
    }

    void loadRoutes();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pendingGeometries, requestKey, stableRequests]);

  return routeState.requestKey === requestKey ? routeState.geometries : pendingGeometries;
}
