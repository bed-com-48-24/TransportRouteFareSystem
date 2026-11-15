"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import AdminWorkspace, { isAdminSection, type AdminSection } from "@/components/AdminWorkspace";
import RequireAdmin from "@/components/RequireAdmin";
import { useRoadRoutes } from "@/components/road-routing";
import { useSession } from "@/lib/auth";
import DemoDataNotice from "@/components/DemoDataNotice";
import { distanceKm, hasCoords } from "@/lib/geo";
import { DISTRICT_COORDINATES, MALAWI_LOCATIONS, type Coordinates } from "@/lib/malawi-locations";
import { useBackendFares, useBackendRoutes, useBackendStops } from "@/lib/use-backend-data";
import type { StopKind } from "@/lib/types";

const RouteNetworkMap = dynamic(() => import("@/components/RouteNetworkMap"), {
  ssr: false,
  loading: () => <p className="module-empty">Loading map…</p>,
});

const CITY_COORDINATES: Record<string, Coordinates> = {
  ...DISTRICT_COORDINATES,
  Limbe: { lat: -15.8103, lng: 35.0586 },
  Mzuzu: { lat: -11.4656, lng: 34.0207 },
};

function coordinatesForCity(city: string): Coordinates | null {
  return CITY_COORDINATES[city] ?? null;
}

function stopKindLabel(kind: StopKind) {
  if (kind === "both") return "Pickup & drop-off";
  return kind === "pickup" ? "Pickup" : "Drop-off";
}

export default function MapAdminIntegrationPage() {
  return (
    <Suspense fallback={<main className="module-shell" aria-busy="true" />}>
      <MapAdminContent />
    </Suspense>
  );
}

function MapAdminContent() {
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();
  const rawSection = searchParams.get("section");
  const adminSection: AdminSection = isAdminSection(rawSection) ? rawSection : "overview";
  const mainPanel = searchParams.get("panel") === "admin" ? "admin" : "map";

  const { data: routes, usingDemo: routesAreDemo } = useBackendRoutes();
  const { data: fares } = useBackendFares();
  const { data: stops, usingDemo: stopsAreDemo } = useBackendStops();
  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [city, setCity] = useState("Blantyre");
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const origin = userLocation ?? CITY_COORDINATES[city];
  const { nearbyStops, unlocatedStops } = useMemo(() => {
    const located = stops
      .filter(hasCoords)
      .map((stop) => ({ ...stop, distance: distanceKm(origin.lat, origin.lng, stop.lat, stop.lng) }))
      .sort((first, second) => first.distance - second.distance);
    return {
      nearbyStops: located.filter((stop) => stop.distance <= 30),
      unlocatedStops: stops.filter((stop) => !hasCoords(stop)),
    };
  }, [origin, stops]);

  const visibleRoutes = selectedRouteId === "all" ? routes : routes.filter((route) => route.id === selectedRouteId);
  const roadRoutes = useRoadRoutes(mainPanel === "map" ? routes.flatMap((route) => {
    const originCoordinates = coordinatesForCity(route.origin);
    const destinationCoordinates = coordinatesForCity(route.destination);
    return originCoordinates && destinationCoordinates ? [{ id: route.id, origin: originCoordinates, destination: destinationCoordinates }] : [];
  }) : []);
  const visibleRoutableRoutes = visibleRoutes.filter((route) => coordinatesForCity(route.origin) && coordinatesForCity(route.destination));
  const visibleRouteGeometry = visibleRoutableRoutes.map((route) => roadRoutes[route.id]);
  const isRouting = visibleRouteGeometry.some((geometry) => !geometry || geometry.status === "loading");
  const fallbackRouteCount = visibleRouteGeometry.filter((geometry) => geometry?.status === "fallback").length;
  const mapCenter = useMemo(() => [-13.5, 34.2] as [number, number], []);

  function showAdmin() {
    router.replace("/maps-admin-integration?panel=admin&section=overview");
  }

  function showMap() {
    router.replace("/maps-admin-integration");
  }

  function useMyLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Location is not available in this browser. Choose a town instead.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationMessage("Nearby stops are sorted from your current location.");
        setLocating(false);
      },
      (error) => {
        setUserLocation(null);
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Choose a town to find nearby stops."
            : "Your location could not be found. Choose a town to find nearby stops.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  return (
    <main className="module-shell">
      {mainPanel === "map" ? (
        <>
          <header className="module-intro">
            <p className="module-eyebrow">TRANSPORT MAP</p>
            <h1>Routes, stops, and service information</h1>
            <p>Explore route locations across Malawi and find nearby pickup or drop-off points.</p>
          </header>

          <nav className="module-tabs" aria-label="Map and administration">
            <button type="button" className="is-active" aria-pressed="true">Explore map &amp; nearby stops</button>
            <button type="button" aria-pressed="false" onClick={showAdmin}>
              {session?.role === "admin" ? "Admin workspace" : "Staff sign in"}
            </button>
          </nav>

          <DemoDataNotice show={routesAreDemo || stopsAreDemo} what="routes and stops" />

          <section className="module-section" aria-labelledby="map-heading">
            <div className="module-section-heading">
              <div><p className="module-eyebrow">ROUTE NETWORK</p><h2 id="map-heading">Explore routes across Malawi</h2></div>
              <label className="map-route-filter">Show
                <select value={selectedRouteId} onChange={(event) => setSelectedRouteId(event.target.value)}>
                  <option value="all">All routes</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.origin} to {route.destination}</option>)}
                </select>
              </label>
            </div>
            {routes.length === 0 ? (
              <p className="module-empty">There are no routes to show yet.</p>
            ) : (
              <RouteNetworkMap
                routes={routes}
                stops={stops}
                selectedRouteId={selectedRouteId}
                roadRoutes={roadRoutes}
                cityCoordinates={CITY_COORDINATES}
                mapCenter={mapCenter}
                isRouting={isRouting}
                fallbackRouteCount={fallbackRouteCount}
              />
            )}
            <div className="map-route-list">
              {visibleRoutes.map((route) => {
                const fare = fares.find((item) => item.routeId === route.id);
                return (
                  <article key={route.id}>
                    <strong>{route.origin} <span aria-hidden="true">→</span> {route.destination}</strong>
                    <span>{route.service}</span>
                    <span>{fare ? `Estimated fare: MWK ${fare.amount.toLocaleString("en-MW")}` : "Fare estimate unavailable"}</span>
                  </article>
                );
              })}
            </div>
            <p className="module-footnote">District markers use approximate center coordinates; transport stop markers use recorded stop coordinates. Stops without recorded coordinates are listed below.</p>
          </section>

          <section className="module-section" aria-labelledby="nearby-heading">
            <div className="module-section-heading">
              <div><p className="module-eyebrow">PICKUP &amp; DROP-OFF</p><h2 id="nearby-heading">Find nearby transport points</h2></div>
            </div>
            <div className="nearby-toolbar">
              <label>Choose a town
                <select value={city} onChange={(event) => { setCity(event.target.value); setUserLocation(null); setLocationMessage(""); }}>
                  {MALAWI_LOCATIONS.map((town) => <option key={town} value={town}>{town}</option>)}
                </select>
              </label>
              <button className="secondary-button" type="button" onClick={useMyLocation} disabled={locating}>{locating ? "Finding location…" : "Use my location"}</button>
              <span className="nearby-radius">Within 30 km of {userLocation ? "your location" : city}</span>
            </div>
            {locationMessage && <p className="module-feedback" role="status">{locationMessage}</p>}
            {nearbyStops.length === 0 ? (
              <p className="module-empty">No recorded stops are within 30 km. Choose another town to search.</p>
            ) : (
              <ul className="nearby-stop-list">
                {nearbyStops.map((stop) => (
                  <li key={stop.id}>
                    <span className={`stop-kind ${stop.kind}`}>{stopKindLabel(stop.kind)}</span>
                    <span><strong>{stop.name}</strong><small>{stop.city}</small></span>
                    <span className="stop-distance">{stop.distance.toFixed(1)} km</span>
                  </li>
                ))}
              </ul>
            )}
            {unlocatedStops.length > 0 && (
              <div className="unlocated-stops">
                <h3>Location not recorded yet</h3>
                <ul>{unlocatedStops.map((stop) => <li key={stop.id}>{stop.name} · {stopKindLabel(stop.kind)} · {stop.city}</li>)}</ul>
              </div>
            )}
          </section>
        </>
      ) : (
        <RequireAdmin>
          <AdminWorkspace initialSection={adminSection} onShowMap={showMap} />
        </RequireAdmin>
      )}
    </main>
  );
}
