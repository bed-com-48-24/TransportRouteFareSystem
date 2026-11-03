"use client";

import dynamic from "next/dynamic";

export const CircleMarker = dynamic(
  () => import("react-leaflet").then((module) => module.CircleMarker),
  { ssr: false },
);
export const MapContainer = dynamic(
  () => import("react-leaflet").then((module) => module.MapContainer),
  {
    ssr: false,
    loading: () => <div className="route-map" aria-label="Loading map" />,
  },
);
export const Polyline = dynamic(
  () => import("react-leaflet").then((module) => module.Polyline),
  { ssr: false },
);
export const Popup = dynamic(
  () => import("react-leaflet").then((module) => module.Popup),
  { ssr: false },
);
export const TileLayer = dynamic(
  () => import("react-leaflet").then((module) => module.TileLayer),
  { ssr: false },
);
