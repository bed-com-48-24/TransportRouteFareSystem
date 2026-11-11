"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MapContainer, Polyline, RouteLocationMarker, TileLayer } from "@/components/ClientLeaflet";
import RequireAdmin from "@/components/RequireAdmin";
import { fmtDate } from "@/lib/booking-data";
import { distanceKm, hasCoords } from "@/lib/geo";
import { DISTRICT_COORDINATES, MALAWI_LOCATIONS, type Coordinates } from "@/lib/malawi-locations";
import { KEYS, SEED_FARES, SEED_ROUTES, SEED_STOPS } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import type { Booking, FareItem, ReportItem, ReportStatus, RouteItem, StopItem, StopKind } from "@/lib/types";

type MainPanel = "map" | "admin";
type AdminPanel = "routes" | "stops" | "reports" | "bookings";
type RoutePoint = [number, number];

const ROUTE_TOWN_COORDINATES: Record<string, Coordinates> = {
  ...DISTRICT_COORDINATES,
  Limbe: { lat: -15.8103, lng: 35.0586 },
  Mzuzu: { lat: -11.4656, lng: 34.0207 },
};

const ADMIN_SECTIONS: { id: AdminPanel; label: string }[] = [
  { id: "routes", label: "Routes & fares" },
  { id: "stops", label: "Pickup & drop-off points" },
  { id: "reports", label: "Passenger reports" },
  { id: "bookings", label: "Bookings" },
];

const MOCK_ADMIN_BOOKINGS: Booking[] = [
  {
    reference: "DEMO-BK-001",
    tripId: "BT-LB-0800",
    route: "Blantyre → Limbe",
    travelDate: "2026-11-03",
    pickup: "Blantyre Bus Depot",
    dropoff: "Limbe Bus Station",
    passengers: 2,
    name: "Sample Passenger One",
    email: "passenger1@example.invalid",
    status: "confirmed",
    createdAt: "2026-11-01T10:00:00.000Z",
  },
  {
    reference: "DEMO-BK-002",
    tripId: "BT-LB-1030",
    route: "Blantyre → Limbe",
    travelDate: "2026-11-03",
    pickup: "Chichiri Shopping Centre",
    dropoff: "Limbe Market",
    passengers: 1,
    name: "Sample Passenger Two",
    email: "passenger2@example.invalid",
    status: "confirmed",
    createdAt: "2026-11-01T11:30:00.000Z",
  },
  {
    reference: "DEMO-BK-003",
    tripId: "BT-ZO-0900",
    route: "Blantyre → Zomba",
    travelDate: "2026-11-04",
    pickup: "Limbe Bus Station",
    dropoff: "Zomba Bus Depot",
    passengers: 3,
    name: "Sample Passenger Three",
    email: "passenger3@example.invalid",
    status: "cancelled",
    createdAt: "2026-11-01T13:15:00.000Z",
  },
];

function stopKindLabel(kind: StopKind) {
  if (kind === "dropoff") return "Drop-off";
  return "Pickup & drop-off";
}

function getRoadRoute(value: unknown): RoutePoint[] | null {
  if (typeof value !== "object" || value === null || !("routes" in value) || !Array.isArray(value.routes)) {
    return null;
  }

  const route = value.routes[0];
  if (typeof route !== "object" || route === null || !("geometry" in route)) return null;
  const geometry = route.geometry;
  if (typeof geometry !== "object" || geometry === null || !("coordinates" in geometry) || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const positions: RoutePoint[] = [];
  for (const point of geometry.coordinates) {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== "number" ||
      !Number.isFinite(point[0]) ||
      point[0] < -180 ||
      point[0] > 180 ||
      typeof point[1] !== "number" ||
      !Number.isFinite(point[1]) ||
      point[1] < -90 ||
      point[1] > 90
    ) {
      return null;
    }
    positions.push([point[1], point[0]]);
  }

  return positions.length >= 2 ? positions : null;
}

function MapAdminIntegrationPage() {
  const stops = useStoredList<StopItem>(KEYS.stops, SEED_STOPS);
  const [mainPanel, setMainPanel] = useState<MainPanel>("map");
  const [panelReady, setPanelReady] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [routeTowns, setRouteTowns] = useState<string[]>([]);
  const [routeResult, setRouteResult] = useState<{
    key: string;
    positions: RoutePoint[];
    status: "ready" | "fallback";
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setMainPanel(params.get("panel") === "admin" ? "admin" : "map");
      const requestedTowns = params.get("route")?.split("|").map((town) => town.trim()) ?? [];
      if (requestedTowns.length >= 2 && requestedTowns.every((town) => town in ROUTE_TOWN_COORDINATES)) {
        setRouteTowns(requestedTowns);
      }
      setPanelReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const routePositions = useMemo<RoutePoint[]>(
    () => routeTowns.map((town) => {
      const coordinates = ROUTE_TOWN_COORDINATES[town];
      return [coordinates.lat, coordinates.lng];
    }),
    [routeTowns],
  );
  const routeKey = routeTowns.join("|");
  const currentRouteResult = routeResult?.key === routeKey ? routeResult : null;
  const routeGeometry = currentRouteResult?.positions ?? routePositions;
  const routeStatus = currentRouteResult?.status ?? "loading";
  const routeCities = useMemo(
    () => new Set(routeTowns.map((town) => town.toLocaleLowerCase())),
    [routeTowns],
  );
  const routeStops = useMemo(
    () => stops
      .filter((stop) => routeCities.has(stop.city.trim().toLocaleLowerCase()))
      .sort((first, second) =>
        routeTowns.findIndex((town) => town.toLocaleLowerCase() === first.city.trim().toLocaleLowerCase()) -
          routeTowns.findIndex((town) => town.toLocaleLowerCase() === second.city.trim().toLocaleLowerCase()) ||
        first.name.localeCompare(second.name),
      ),
    [routeCities, routeTowns, stops],
  );

  useEffect(() => {
    if (routePositions.length < 2) return;

    const controller = new AbortController();
    const coordinates = routePositions.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    async function loadRoadRoute() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
        const result: unknown = await response.json();
        const roadRoute = getRoadRoute(result);
        if (!roadRoute) throw new Error("Routing service returned an invalid route");
        setRouteResult({ key: routeKey, positions: roadRoute, status: "ready" });
      } catch {
        if (controller.signal.aborted) return;
        setRouteResult({ key: routeKey, positions: routePositions, status: "fallback" });
      }
    }

    void loadRoadRoute();
    return () => controller.abort();
  }, [routeKey, routePositions]);

  const nearbyStops = useMemo(() => {
    if (!userLocation) return [];
    return stops
      .filter(hasCoords)
      .map((stop) => ({ ...stop, distance: distanceKm(userLocation.lat, userLocation.lng, stop.lat, stop.lng) }))
      .filter((stop) => stop.distance <= 30)
      .sort((first, second) => first.distance - second.distance);
  }, [userLocation, stops]);

  function useMyLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Location is unavailable in this browser. Enable location services to find nearby stops.");
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
            ? "Location permission was denied. Allow location access in your browser and try again."
            : "Your location could not be found. Check your device settings and try again.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  if (!panelReady) return <main className="module-shell" aria-busy="true" />;

  return (
    <main className={`module-shell${mainPanel === "admin" ? " admin-login-shell" : ""}`}>
      {mainPanel === "map" ? (
        <>
          <header className="module-intro">
            <p className="module-eyebrow">NEARBY TRANSPORT STOPS</p>
            <h1>{routeTowns.length > 0 ? `Stops along ${routeTowns[0]} to ${routeTowns[routeTowns.length - 1]}` : "Find stops near you"}</h1>
            <p>{routeTowns.length > 0 ? "View the selected route and pickup and drop-off stops along the way." : "Share your location to see pickup and drop-off stops within 30 km."}</p>
          </header>

          <section className="module-section" aria-labelledby="nearby-heading">
            <div className="module-section-heading">
              <div><p className="module-eyebrow">{routeTowns.length > 0 ? "SELECTED ROUTE" : "YOUR LOCATION"}</p><h2 id="nearby-heading">{routeTowns.length > 0 ? "Stops along this route" : "Nearby stops"}</h2></div>
              {routeTowns.length === 0 && (
                <button className="secondary-button" type="button" onClick={useMyLocation} disabled={locating}>
                  {locating ? "Finding location…" : userLocation ? "Refresh my location" : "Use my location"}
                </button>
              )}
            </div>
            {locationMessage && <p className="module-feedback" role="status">{locationMessage}</p>}
            {routeTowns.length > 0 ? (
              <>
                <p className="nearby-radius">Route: {routeTowns.join(" → ")}. Pickup and drop-off stops are shown for towns along this route.</p>
                {routeStatus === "fallback" && <p className="module-feedback" role="status">The road route could not be loaded, so the map shows connections between the route towns.</p>}
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
                  <div className="network-map">
                    <MapContainer
                      key={`${routeKey}:${routeStatus}`}
                      bounds={routeGeometry.length > 1 ? routeGeometry : routePositions}
                      boundsOptions={{ paddingTopLeft: [24, 24], paddingBottomRight: [24, 24] }}
                      scrollWheelZoom
                      className="route-map"
                      style={{ height: "clamp(360px, 65vh, 560px)", minHeight: "360px" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {routeGeometry.length > 1 && <Polyline positions={routeGeometry} pathOptions={{ color: "#12304A", weight: 5, opacity: 0.85 }} />}
                      {routeStops.filter(hasCoords).map((stop) => (
                        <RouteLocationMarker
                          key={stop.id}
                          position={[stop.lat, stop.lng]}
                          label={stop.kind === "dropoff" ? "Drop-off" : "Pickup & drop-off"}
                          town={stop.name}
                          details={stop.city}
                        />
                      ))}
                    </MapContainer>
                  </div>
                  <div className="max-h-[470px] overflow-y-auto max-[760px]:max-h-[360px]">
                    {routeStops.length === 0 ? (
                      <p className="module-empty">No pickup or drop-off stops are recorded along this route yet.</p>
                    ) : (
                      <ul className="nearby-stop-list">
                        {routeStops.map((stop) => (
                          <li key={stop.id}>
                            <span className={`stop-kind ${stop.kind}`}>{stopKindLabel(stop.kind)}</span>
                            <span><strong>{stop.name}</strong><small>{stop.city}</small></span>
                            <span className="stop-distance">{hasCoords(stop) ? "On route" : "No map location"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : !userLocation ? (
              <p className="module-empty">Use your location to see nearby pickup and drop-off stops on the map.</p>
            ) : (
              <>
                <p className="nearby-radius">Showing stops within 30 km of your location.</p>
                <div className="network-map">
                  <MapContainer
                    key={`${userLocation.lat}:${userLocation.lng}:${nearbyStops.map((stop) => stop.id).join(",")}`}
                    center={[userLocation.lat, userLocation.lng]}
                    zoom={9}
                    scrollWheelZoom
                    className="route-map"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {nearbyStops.map((stop) => (
                      <RouteLocationMarker
                        key={stop.id}
                        position={[stop.lat, stop.lng]}
                        label={stop.kind === "dropoff" ? "Drop-off" : "Pickup & drop-off"}
                        town={stop.name}
                        details={stop.city}
                      />
                    ))}
                  </MapContainer>
                </div>
                {nearbyStops.length === 0 ? (
                  <p className="module-empty">No recorded stops are within 30 km of your location.</p>
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
              </>
            )}
          </section>
        </>
      ) : (
        <RequireAdmin><AdminDashboard /></RequireAdmin>
      )}
    </main>
  );
}

function AdminDashboard() {
  const [section, setSection] = useState<AdminPanel>("routes");
  return (
    <section className="admin-workspace" aria-labelledby="admin-heading">
      <p className="module-eyebrow">AUTHORIZED ADMINISTRATORS</p>
      <h2 id="admin-heading">Manage transport information</h2>
      <p className="module-copy">Changes are saved in this browser in this demonstration.</p>
      <nav className="admin-tabs" aria-label="Administration sections">
        {ADMIN_SECTIONS.map((item) => (
          <button key={item.id} type="button" aria-pressed={section === item.id} className={section === item.id ? "is-active" : ""} onClick={() => setSection(item.id)}>{item.label}</button>
        ))}
      </nav>
      {section === "routes" && <RouteFareManagement />}
      {section === "stops" && <StopManagement />}
      {section === "reports" && <ReportManagement />}
      {section === "bookings" && <BookingManagement />}
    </section>
  );
}

function RouteFareManagement() {
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [service, setService] = useState("Minibus");
  const [fare, setFare] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  function submitRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedOrigin = origin.trim();
    const normalizedDestination = destination.trim();
    const amount = Number(fare);
    if (normalizedOrigin.length < 2 || normalizedDestination.length < 2 || normalizedOrigin.toLowerCase() === normalizedDestination.toLowerCase()) {
      setFeedback("Enter two different town names.");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setFeedback("Enter an estimated fare as a positive whole number of MWK.");
      return;
    }

    try {
      const currentRoutes = loadList<RouteItem>(KEYS.routes, SEED_ROUTES);
      const currentFares = loadList<FareItem>(KEYS.fares, SEED_FARES);
      const routeId = editingId ?? newId("route");
      const nextRoute = { id: routeId, origin: normalizedOrigin, destination: normalizedDestination, service: service.trim() };
      saveList(KEYS.routes, editingId
        ? currentRoutes.map((route) => route.id === routeId ? nextRoute : route)
        : [...currentRoutes, nextRoute]);
      const existingFare = currentFares.find((item) => item.routeId === routeId);
      saveList(KEYS.fares, existingFare
        ? currentFares.map((item) => item.routeId === routeId ? { ...item, amount } : item)
        : [...currentFares, { id: newId("fare"), routeId, amount }]);
      setOrigin("");
      setDestination("");
      setFare("");
      setService("Minibus");
      setEditingId(null);
      setFeedback(editingId ? "Route and fare updated." : "Route and fare added.");
    } catch {
      setFeedback("The route or fare could not be saved. Check browser storage and try again.");
    }
  }

  function editRoute(route: RouteItem) {
    setEditingId(route.id);
    setOrigin(route.origin);
    setDestination(route.destination);
    setService(route.service);
    setFare(String(fares.find((item) => item.routeId === route.id)?.amount ?? ""));
    setFeedback("");
  }

  function deleteRoute(routeId: string) {
    try {
      saveList(KEYS.routes, loadList<RouteItem>(KEYS.routes, SEED_ROUTES).filter((route) => route.id !== routeId));
      saveList(KEYS.fares, loadList<FareItem>(KEYS.fares, SEED_FARES).filter((item) => item.routeId !== routeId));
      setFeedback("Route and its fare estimate removed.");
    } catch {
      setFeedback("The route could not be removed. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingId ? "Edit route and fare" : "Add a route and estimated fare"}</h3>
      <form className="module-form admin-data-form" onSubmit={submitRoute}>
        <label>Starting town<input list="malawi-route-towns" value={origin} onChange={(event) => setOrigin(event.target.value)} maxLength={60} required /></label>
        <label>Destination town<input list="malawi-route-towns" value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={60} required /></label>
        <datalist id="malawi-route-towns">{MALAWI_LOCATIONS.map((town) => <option key={town} value={town} />)}</datalist>
        <label>Service type<input value={service} onChange={(event) => setService(event.target.value)} maxLength={60} required /></label>
        <label>Estimated fare (MWK)<input type="number" min="1" step="1" value={fare} onChange={(event) => setFare(event.target.value)} required /></label>
        <button className="primary-button" type="submit">{editingId ? "Save changes" : "Add route"}</button>
        {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setOrigin(""); setDestination(""); setFare(""); setFeedback(""); }}>Stop editing</button>}
      </form>
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}
      <div className="admin-record-list">
        {routes.map((route) => (
          <article key={route.id}>
            <div><strong>{route.origin} → {route.destination}</strong><small>{route.service} · {fares.find((item) => item.routeId === route.id) ? `MWK ${fares.find((item) => item.routeId === route.id)?.amount.toLocaleString("en-MW")}` : "Fare not set"}</small></div>
            <div className="admin-record-actions">
              <button type="button" className="text-action" onClick={() => editRoute(route)}>Edit</button>
              <button type="button" className="text-action danger-action" onClick={() => { if (window.confirm(`Remove ${route.origin} to ${route.destination}?`)) deleteRoute(route.id); }}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StopManagement() {
  const stops = useStoredList<StopItem>(KEYS.stops, SEED_STOPS);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<StopKind>("pickup");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  function submitStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedLat = lat.trim() === "" ? null : Number(lat);
    const parsedLng = lng.trim() === "" ? null : Number(lng);
    if (name.trim().length < 2 || city.trim().length < 2) {
      setFeedback("Enter a stop name and town.");
      return;
    }
    if ((parsedLat === null) !== (parsedLng === null)) {
      setFeedback("Enter both coordinates, or leave both blank.");
      return;
    }
    if (parsedLat !== null && !hasCoords({ lat: parsedLat, lng: parsedLng })) {
      setFeedback("Latitude must be from -90 to 90 and longitude from -180 to 180.");
      return;
    }

    try {
      const current = loadList<StopItem>(KEYS.stops, SEED_STOPS);
      const item = { name: name.trim(), city: city.trim(), kind, lat: parsedLat, lng: parsedLng };
      saveList(KEYS.stops, editingId
        ? current.map((stop) => stop.id === editingId ? { ...stop, ...item } : stop)
        : [...current, { id: newId("stop"), ...item }]);
      setName("");
      setCity("");
      setKind("pickup");
      setLat("");
      setLng("");
      setEditingId(null);
      setFeedback(editingId ? "Stop updated." : "Stop added.");
    } catch {
      setFeedback("The stop could not be saved. Please try again.");
    }
  }

  function editStop(stop: StopItem) {
    setEditingId(stop.id);
    setName(stop.name);
    setCity(stop.city);
    setKind(stop.kind);
    setLat(stop.lat?.toString() ?? "");
    setLng(stop.lng?.toString() ?? "");
    setFeedback("");
  }

  function deleteStop(stopId: string) {
    try {
      saveList(KEYS.stops, loadList<StopItem>(KEYS.stops, SEED_STOPS).filter((stop) => stop.id !== stopId));
      setFeedback("Stop removed.");
    } catch {
      setFeedback("The stop could not be removed. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingId ? "Edit pickup or drop-off point" : "Add a pickup or drop-off point"}</h3>
      <form className="module-form admin-data-form" onSubmit={submitStop}>
        <label>Stop name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label>Town<input list="malawi-stop-towns" value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} required /></label>
        <datalist id="malawi-stop-towns">{MALAWI_LOCATIONS.map((town) => <option key={town} value={town} />)}</datalist>
        <label>Point type<select value={kind} onChange={(event) => setKind(event.target.value as StopKind)}><option value="pickup">Pickup (also drop-off)</option><option value="dropoff">Drop-off only</option><option value="both">Pickup &amp; drop-off</option></select></label>
        <label>Latitude <span className="optional-label">Optional</span><input type="number" min="-90" max="90" step="any" value={lat} onChange={(event) => setLat(event.target.value)} /></label>
        <label>Longitude <span className="optional-label">Optional</span><input type="number" min="-180" max="180" step="any" value={lng} onChange={(event) => setLng(event.target.value)} /></label>
        <button className="primary-button" type="submit">{editingId ? "Save changes" : "Add stop"}</button>
        {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setName(""); setCity(""); setLat(""); setLng(""); setFeedback(""); }}>Stop editing</button>}
      </form>
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}
      <div className="admin-record-list">
        {stops.map((stop) => (
          <article key={stop.id}>
            <div><strong>{stop.name}</strong><small>{stopKindLabel(stop.kind)} · {stop.city} · {hasCoords(stop) ? `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}` : "No map coordinates"}</small></div>
            <div className="admin-record-actions">
              <button type="button" className="text-action" onClick={() => editStop(stop)}>Edit</button>
              <button type="button" className="text-action danger-action" onClick={() => { if (window.confirm(`Remove ${stop.name}?`)) deleteStop(stop.id); }}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportManagement() {
  const reports = useStoredList<ReportItem>(KEYS.reports, []);
  const [feedback, setFeedback] = useState("");

  function updateStatus(reportId: string, status: ReportStatus) {
    try {
      const updated = loadList<ReportItem>(KEYS.reports, []).map((report) =>
        report.id === reportId ? { ...report, status } : report,
      );
      saveList(KEYS.reports, updated);
      setFeedback("Report status updated.");
    } catch {
      setFeedback("The report could not be updated. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>Passenger reports</h3>
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}
      {reports.length === 0 ? <p className="module-empty">There are no passenger reports to review yet.</p> : (
        <div className="admin-record-list">
          {[...reports].reverse().map((report) => (
            <article className="admin-report-record" key={report.id}>
              <div><strong>{report.type}: {report.itemName}</strong><small>Reported by {report.reporterName || "Unknown sender"}{report.reporterEmail ? ` · ${report.reporterEmail}` : ""} · {report.location || "Location not provided"} · {new Date(report.createdAt).toLocaleDateString()}</small><p>{report.description}</p></div>
              <label className="status-control">Status<select value={report.status} onChange={(event) => updateStatus(report.id, event.target.value as ReportStatus)}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingManagement() {
  return (
    <div className="admin-section-content">
      <h3>Sample passenger bookings</h3>
      <p className="module-copy">{MOCK_ADMIN_BOOKINGS.length} fictional records for the admin preview. These are not real reservations or passenger details.</p>
      <div className="admin-record-list">
        {MOCK_ADMIN_BOOKINGS.map((booking) => (
          <article key={booking.reference}>
            <div>
              <strong>{booking.route} · {fmtDate(booking.travelDate)}</strong>
              <small>{booking.name} · {booking.passengers} passenger{booking.passengers === 1 ? "" : "s"}</small>
              <small>{booking.pickup} → {booking.dropoff} · Reference {booking.reference}</small>
            </div>
            <span className={`booking-state ${booking.status}`}>{booking.status}</span>
          </article>
        ))}
      </div>
      <p className="module-footnote">This preview is static mock data and is not connected to passenger booking submissions.</p>
    </div>
  );
}

export default MapAdminIntegrationPage;
