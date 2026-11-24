"use client";

import { useEffect } from "react";
import type { LatLngTuple } from "leaflet";
import { useMap } from "react-leaflet";

interface FitMapToRouteProps {
  points: LatLngTuple[];
  fallbackCenter?: LatLngTuple;
  fallbackZoom?: number;
  padding?: [number, number];
  maxZoom?: number;
}

/**
 * Keeps every map focused on the route the passenger/admin is looking at.
 * The point list is serialized because road geometry arrives asynchronously
 * and arrays are recreated on each render.
 */
export default function FitMapToRoute({
  points,
  fallbackCenter = [-13.4, 34.2],
  fallbackZoom = 6,
  padding = [30, 30],
  maxZoom = 13,
}: FitMapToRouteProps) {
  const map = useMap();
  const pointKey = JSON.stringify(points);
  const fallbackKey = fallbackCenter.join(",");
  const paddingKey = padding.join(",");

  useEffect(() => {
    const routePoints = JSON.parse(pointKey) as LatLngTuple[];
    const [fallbackLat, fallbackLng] = fallbackKey.split(",").map(Number);
    const [paddingVertical, paddingHorizontal] = paddingKey.split(",").map(Number);

    // Wait for the container to have its final size before measuring bounds,
    // especially when the map lives in a stretched grid column.
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();
      if (routePoints.length > 1) {
        map.fitBounds(routePoints, {
          padding: [paddingVertical, paddingHorizontal],
          maxZoom,
          animate: true,
        });
      } else if (routePoints.length === 1) {
        map.setView(routePoints[0], Math.max(fallbackZoom, 9));
      } else {
        map.setView([fallbackLat, fallbackLng], fallbackZoom);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [map, pointKey, fallbackKey, fallbackZoom, paddingKey, maxZoom]);

  return null;
}
