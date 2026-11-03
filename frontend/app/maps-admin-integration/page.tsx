"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "@/components/ClientLeaflet";
import RequireAdmin from "@/components/RequireAdmin";
import { fmtDate } from "@/lib/booking-data";
import { distanceKm, hasCoords } from "@/lib/geo";
import { DISTRICT_COORDINATES, MALAWI_LOCATIONS, type Coordinates } from "@/lib/malawi-locations";
import { KEYS, SEED_FARES, SEED_ROUTES, SEED_STOPS } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import type { Booking, FareItem, ReportItem, ReportStatus, RouteItem, StopItem, StopKind } from "@/lib/types";

type MainPanel = "map" | "admin";
type AdminPanel = "routes" | "stops" | "reports" | "bookings";

const CITY_COORDINATES: Record<string, Coordinates> = {
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

function coordinatesForCity(city: string): Coordinates | null {
  return CITY_COORDINATES[city] ?? null;
}

function stopKindLabel(kind: StopKind) {
  if (kind === "both") return "Pickup & drop-off";
  return kind === "pickup" ? "Pickup" : "Drop-off";
}

function MapAdminIntegrationPage() {
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);
  const stops = useStoredList<StopItem>(KEYS.stops, SEED_STOPS);
  const [mainPanel, setMainPanel] = useState<MainPanel>("map");
  const [panelReady, setPanelReady] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("all");
  const [city, setCity] = useState("Blantyre");
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMainPanel(new URLSearchParams(window.location.search).get("panel") === "admin" ? "admin" : "map");
      setPanelReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
  const mapCenter = useMemo(() => [-13.5, 34.2] as [number, number], []);

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

  if (!panelReady) return <main className="module-shell" aria-busy="true" />;

  return (
    <main className={`module-shell${mainPanel === "admin" ? " admin-login-shell" : ""}`}>
      {mainPanel === "map" ? (
        <>
          <header className="module-intro">
            <p className="module-eyebrow">TRANSPORT MAP</p>
            <h1>Routes, stops, and service information</h1>
            <p>Explore route locations across Malawi and find nearby pickup or drop-off points.</p>
          </header>

          <nav className="module-tabs" aria-label="Map and administration">
            <button type="button" className="is-active" aria-pressed="true">Explore map &amp; nearby stops</button>
            <button type="button" aria-pressed="false" onClick={() => setMainPanel("admin")}>Staff sign in</button>
          </nav>

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
              <div className="network-map">
                <MapContainer center={mapCenter} zoom={7} scrollWheelZoom className="route-map" worldCopyJump>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {routes.map((route) => {
                    const origin = coordinatesForCity(route.origin);
                    const destination = coordinatesForCity(route.destination);
                    if (!origin || !destination) return null;

                    const isSelected = selectedRouteId === "all" || selectedRouteId === route.id;

                    return (
                      <Polyline
                        key={route.id}
                        positions={[[origin.lat, origin.lng], [destination.lat, destination.lng]]}
                        pathOptions={{
                          color: isSelected ? "#12304A" : "#8CA6BF",
                          weight: isSelected ? 5 : 2.5,
                          opacity: isSelected ? 1 : 0.7,
                        }}
                      >
                        <Popup>
                          <strong>{route.origin} → {route.destination}</strong><br />
                          {route.service}
                        </Popup>
                      </Polyline>
                    );
                  })}

                  {Object.entries(CITY_COORDINATES).map(([name, coordinates]) => (
                    <CircleMarker key={name} center={[coordinates.lat, coordinates.lng]} radius={7} pathOptions={{ color: "#12304A", fillColor: "#12304A", fillOpacity: 1 }}>
                      <Popup>{name}</Popup>
                    </CircleMarker>
                  ))}

                  {stops.filter(hasCoords).map((stop) => (
                    <CircleMarker
                      key={stop.id}
                      center={[stop.lat, stop.lng]}
                      radius={stop.kind === "both" ? 6 : 5}
                      pathOptions={{
                        color: stop.kind === "pickup" ? "#2F80ED" : stop.kind === "dropoff" ? "#E67E22" : "#7E57C2",
                        fillColor: stop.kind === "pickup" ? "#2F80ED" : stop.kind === "dropoff" ? "#E67E22" : "#7E57C2",
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <strong>{stop.name}</strong><br />
                        {stop.city}<br />
                        {stopKindLabel(stop.kind)}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>

                <div className="map-legend" aria-label="Map legend">
                  <span><i className="legend-route" /> Route connection</span>
                  <span><i className="legend-pickup" /> Pickup point</span>
                  <span><i className="legend-dropoff" /> Drop-off point</span>
                  <span><i className="legend-both" /> Pickup and drop-off</span>
                </div>
              </div>
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
        <label>Point type<select value={kind} onChange={(event) => setKind(event.target.value as StopKind)}><option value="pickup">Pickup only</option><option value="dropoff">Drop-off only</option><option value="both">Pickup &amp; drop-off</option></select></label>
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
