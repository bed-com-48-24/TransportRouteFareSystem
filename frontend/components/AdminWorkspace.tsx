"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  adminReservedSeatNumbers,
  availableSeatNumbers,
  availableSeats,
  fmtDate,
} from "@/lib/booking-data";
import { readAdminProfile, updateAdminCompanyName, useSession } from "@/lib/auth";
import DemoDataNotice from "@/components/DemoDataNotice";
import { hasCoords } from "@/lib/geo";
import { MALAWI_LOCATIONS } from "@/lib/malawi-locations";
import {
  notifyBookingStatus,
  notifyCompanyUpdate,
  notifyReportUpdate,
  notifyRouteUpdate,
} from "@/lib/notifications";
import { ensureRouteStops, ensureStop, ensureVehicle, resolveStopId } from "@/lib/admin-api";
import { KEYS, MOCK_REPORTS, SEED_FARES, SEED_ROUTES, SEED_STOPS } from "@/lib/seed";
import { loadList, newId, saveList } from "@/lib/storage";
import {
  useAdminBookings,
  useAdminTrips,
  useAdminUsers,
  useBackendFares,
  useBackendRoutes,
  useBackendStops,
} from "@/lib/use-backend-data";
import { fromStopItem, weekdaysForDate } from "@/services/adapters";
import * as apiBookings from "@/services/bookings.service";
import * as apiFares from "@/services/fares.service";
import * as apiRoutes from "@/services/routes.service";
import * as apiSchedules from "@/services/schedules.service";
import * as apiStops from "@/services/stops.service";
import type {
  Booking,
  FareItem,
  ReportItem,
  ReportStatus,
  RouteItem,
  StopItem,
  StopKind,
  Trip,
} from "@/lib/types";

export type AdminSection =
  | "overview"
  | "routes"
  | "schedules"
  | "stops"
  | "reports"
  | "bookings"
  | "passengers"
  | "company";

export const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "routes", label: "Routes & fares" },
  { id: "schedules", label: "Trip schedules" },
  { id: "stops", label: "Pickup & drop-off points" },
  { id: "bookings", label: "Bookings" },
  { id: "reports", label: "Customer reports" },
  { id: "passengers", label: "Passengers" },
  { id: "company", label: "Company profile" },
];

export function isAdminSection(value: string | null): value is AdminSection {
  return ADMIN_SECTIONS.some((section) => section.id === value);
}

const EMPTY_TRIPS: Trip[] = [];
const EMPTY_BOOKINGS: Booking[] = [];

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stopKindLabel(kind: StopKind) {
  if (kind === "both") return "Pickup & drop-off";
  return kind === "pickup" ? "Pickup" : "Drop-off";
}

function paymentMethodLabel(method?: Booking["paymentMethod"]) {
  switch (method) {
    case "tnm": return "TNM Mpamba";
    case "airtel": return "Airtel Money";
    case "bank": return "Bank transfer";
    case "card": return "Card";
    default: return "Not recorded";
  }
}

function formatMoment(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-MW");
}

function routeLabelForTrip(trip: Trip, routes: RouteItem[]) {
  return routes.find((route) => `${route.origin} → ${route.destination}`.toLowerCase() === trip.route.toLowerCase());
}

export default function AdminWorkspace({
  initialSection = "overview",
  onShowMap,
}: {
  initialSection?: AdminSection;
  onShowMap?: () => void;
}) {
  const router = useRouter();
  const [section, setSection] = useState<AdminSection>(initialSection);

  useEffect(() => {
    const timer = window.setTimeout(() => setSection(initialSection), 0);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  function chooseSection(next: AdminSection) {
    setSection(next);
    router.replace(
      `${window.location.pathname}?panel=admin&section=${next}`,
      { scroll: false },
    );
  }

  return (
    <section className="admin-workspace" aria-labelledby="admin-heading">
      <div className="admin-workspace-heading">
        <div>
          <p className="module-eyebrow">AUTHORIZED ADMINISTRATORS</p>
          <h2 id="admin-heading">Company admin workspace</h2>
          <p className="module-copy">
            Routes, fares, departures, stops, and bookings are read from and saved to the YendaRoute
            backend. Customer reports and notifications stay in this browser for now.
          </p>
        </div>
        {onShowMap && (
          <button className="secondary-button" type="button" onClick={onShowMap}>
            View public map
          </button>
        )}
      </div>

      <nav className="admin-tabs" aria-label="Administration sections">
        {ADMIN_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={section === item.id}
            className={section === item.id ? "is-active" : ""}
            onClick={() => chooseSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {section === "overview" && <OverviewPanel onNavigate={chooseSection} />}
      {section === "routes" && <RouteFareManagement />}
      {section === "schedules" && <TripScheduleManagement />}
      {section === "stops" && <StopManagement />}
      {section === "bookings" && <BookingManagement />}
      {section === "reports" && <ReportManagement />}
      {section === "passengers" && <PassengerManagement />}
      {section === "company" && <CompanyProfileManagement />}
    </section>
  );
}

function OverviewPanel({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const { data: routes, usingDemo: routesAreDemo, error: routesError } = useBackendRoutes();
  const { data: fares } = useBackendFares();
  const { data: stops } = useBackendStops();
  const { data: trips, error: tripsError } = useAdminTrips();
  const { data: bookings, usingDemo: bookingsAreDemo, error: bookingsError } = useAdminBookings();
  const reports: ReportItem[] = [];
  const { data: accounts, error: usersError } = useAdminUsers();
  const today = localDateValue();

  const upcomingTrips = trips.filter((trip) => trip.date >= today);
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const paidBookings = confirmedBookings.filter((booking) => booking.paymentStatus === "paid");
  const revenue = paidBookings.reduce((total, booking) => total + (booking.amountPaid ?? 0), 0);
  const openReports = reports.filter((report) => report.status === "open" || report.status === "reviewing");
  const seatsBooked = confirmedBookings.reduce((total, booking) => total + booking.passengers, 0);
  const seatsAvailable = upcomingTrips.reduce(
    (total, trip) => total + availableSeats(trip, bookings),
    0,
  );
  const recentBookings = [...bookings]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 5);
  const recentReports = [...reports]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 5);

  const stats: { id: AdminSection; label: string; value: string; hint: string }[] = [
    { id: "routes", label: "Published routes", value: String(routes.length), hint: `${fares.length} fare estimate${fares.length === 1 ? "" : "s"} attached` },
    { id: "schedules", label: "Upcoming departures", value: String(upcomingTrips.length), hint: `${seatsAvailable} bookable seats left` },
    { id: "bookings", label: "Confirmed bookings", value: String(confirmedBookings.length), hint: `${seatsBooked} passenger seat${seatsBooked === 1 ? "" : "s"} sold` },
    { id: "reports", label: "Reports to review", value: String(openReports.length), hint: `${reports.length} report${reports.length === 1 ? "" : "s"} in total` },
    { id: "passengers", label: "Registered passengers", value: String(accounts.length), hint: "Guest bookings also appear in Passengers" },
    { id: "stops", label: "Pickup & drop-off points", value: String(stops.length), hint: `${stops.filter(hasCoords).length} with map coordinates` },
    { id: "bookings", label: "Revenue collected", value: `MWK ${revenue.toLocaleString("en-MW")}`, hint: `${paidBookings.length} paid booking${paidBookings.length === 1 ? "" : "s"}` },
    { id: "company", label: "Company profile", value: "Manage", hint: "Update the company name or message passengers" },
  ];

  return (
    <div className="admin-section-content">
      <h3>Today at a glance</h3>
      <DemoDataNotice show={routesAreDemo || bookingsAreDemo} what="admin records" />
      {(routesError || tripsError || bookingsError || usersError) && (
        <p className="module-error" role="alert">
          {routesError || tripsError || bookingsError || usersError}
        </p>
      )}
      <p className="module-copy">
        Live figures come from the YendaRoute backend. Customer reports and notifications are kept
        in this browser because the backend has no reports endpoint yet.
      </p>

      <div className="admin-overview-grid">
        {stats.map((stat) => (
          <button
            key={`${stat.id}-${stat.label}`}
            type="button"
            className="admin-stat"
            onClick={() => onNavigate(stat.id)}
          >
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </button>
        ))}
      </div>

      <div className="admin-overview-columns">
        <section className="admin-activity" aria-labelledby="recent-bookings-heading">
          <div className="admin-activity-heading">
            <h3 id="recent-bookings-heading">Latest passenger bookings</h3>
            <button type="button" className="text-action" onClick={() => onNavigate("bookings")}>Manage bookings</button>
          </div>
          {recentBookings.length === 0 ? (
            <p className="module-empty">No passenger bookings yet. Bookings appear here as soon as a passenger reserves a seat.</p>
          ) : (
            <ul className="admin-activity-list">
              {recentBookings.map((booking) => (
                <li key={booking.reference}>
                  <div>
                    <strong>{booking.route}</strong>
                    <small>{fmtDate(booking.travelDate)} · {booking.name} · {booking.passengers} seat{booking.passengers === 1 ? "" : "s"}</small>
                  </div>
                  <div className="admin-activity-tags">
                    {booking.paymentStatus === "paid" && <span className="admin-tag is-paid">Paid</span>}
                    <span className={`booking-state ${booking.status}`}>{booking.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-activity" aria-labelledby="recent-reports-heading">
          <div className="admin-activity-heading">
            <h3 id="recent-reports-heading">Latest customer reports</h3>
            <button type="button" className="text-action" onClick={() => onNavigate("reports")}>Review reports</button>
          </div>
          {recentReports.length === 0 ? (
            <p className="module-empty">No reports have been submitted yet.</p>
          ) : (
            <ul className="admin-activity-list">
              {recentReports.map((report) => (
                <li key={report.id}>
                  <div>
                    <strong>{report.type}: {report.itemName}</strong>
                    <small>{report.reporterName || report.reporterEmail || "Guest reporter"} · {formatMoment(report.createdAt)}</small>
                  </div>
                  <span className={`report-status-badge is-${report.status}`}>{REPORT_STATUS_LABELS[report.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-alignment" aria-labelledby="alignment-heading">
        <h3 id="alignment-heading">How administration stays aligned with passengers</h3>
        <ul>
          <li>Routes and fares published here power passenger route search, saved routes, and fare estimates.</li>
          <li>Trip schedules created here are the only departures passengers can book and select seats on.</li>
          <li>Booking changes made here update seat availability, the passenger&apos;s bookings page, and their notifications.</li>
          <li>Report status changes and staff notes appear in the passenger&apos;s report updates and notification feed.</li>
          <li>Pickup and drop-off changes are carried through to scheduled trips and future passenger bookings.</li>
        </ul>
      </section>
    </div>
  );
}

function RouteFareManagement() {
  const { data: routes, usingDemo: routesAreDemo, reload: reloadRoutes, error: routesError } = useBackendRoutes();
  const { data: fares, reload: reloadFares } = useBackendFares();
  const { data: trips } = useAdminTrips();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [service, setService] = useState("Minibus");
  const [fare, setFare] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const shownRoutes = routes.filter((route) =>
    !normalizedQuery ||
    `${route.origin} ${route.destination} ${route.service}`.toLowerCase().includes(normalizedQuery),
  );

  async function submitRoute(event: FormEvent<HTMLFormElement>) {
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
    const existingRoute = routes.find((route) => route.id === editingId);
    if (
      existingRoute &&
      trips.some((trip) => trip.route.toLocaleLowerCase() === `${existingRoute.origin} → ${existingRoute.destination}`.toLocaleLowerCase()) &&
      (existingRoute.origin.toLocaleLowerCase() !== normalizedOrigin.toLocaleLowerCase() ||
        existingRoute.destination.toLocaleLowerCase() !== normalizedDestination.toLocaleLowerCase())
    ) {
      setFeedback("Remove this route's scheduled trips before changing its towns.");
      return;
    }

    try {
      if (routesAreDemo) {
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
        reloadRoutes();
        reloadFares();
      } else {
        const stopIds = await ensureRouteStops(normalizedOrigin, normalizedDestination);
        let routeId: number;

        if (editingId) {
          routeId = Number(editingId);
          await apiRoutes.update(routeId, {
            name: `${normalizedOrigin} → ${normalizedDestination}`,
            companyName: service.trim(),
          });
        } else {
          const created = await apiRoutes.create({
            name: `${normalizedOrigin} → ${normalizedDestination}`,
            ...stopIds,
            companyName: service.trim(),
          });
          routeId = created.id;
        }

        const existingFare = fares.find((item) => item.routeId === String(routeId));
        if (existingFare) {
          await apiFares.update(Number(existingFare.id), { amount });
        } else {
          await apiFares.create(routeId, { ...stopIds, amount });
        }
        reloadRoutes();
        reloadFares();
      }

      try {
        notifyRouteUpdate(
          `${editingId ? "Route and fare updated" : "New route and fare added"}: ${normalizedOrigin} → ${normalizedDestination}${service.trim() ? ` (${service.trim()})` : ""} · MWK ${amount.toLocaleString("en-MW")}. Passengers can now search this journey.`,
          editingId ?? `${normalizedOrigin}-${normalizedDestination}`,
        );
      } catch {
        // The route is saved; a blocked notification store must not undo it.
      }
      setOrigin("");
      setDestination("");
      setFare("");
      setService("Minibus");
      setEditingId(null);
      setFeedback(editingId ? "Route and fare updated for passenger search." : "Route and fare added for passenger search.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The route or fare could not be saved. Please try again.",
      );
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

  async function deleteRoute(routeId: string) {
    const route = routes.find((item) => item.id === routeId);
    if (route && trips.some((trip) =>
      trip.route.toLocaleLowerCase() === `${route.origin} → ${route.destination}`.toLocaleLowerCase(),
    )) {
      setFeedback("Remove this route's scheduled trips before removing the route.");
      return;
    }
    try {
      if (routesAreDemo) {
        saveList(KEYS.routes, loadList<RouteItem>(KEYS.routes, SEED_ROUTES).filter((item) => item.id !== routeId));
        saveList(KEYS.fares, loadList<FareItem>(KEYS.fares, SEED_FARES).filter((item) => item.routeId !== routeId));
        reloadRoutes();
        reloadFares();
      } else {
        const numericId = Number(routeId);
        const routeFares = fares.filter((item) => item.routeId === routeId);
        await Promise.allSettled(routeFares.map((item) => apiFares.remove(Number(item.id))));
        await apiRoutes.remove(numericId);
        reloadRoutes();
        reloadFares();
      }

      try {
        notifyRouteUpdate(
          `Route removed: ${route ? `${route.origin} → ${route.destination}` : routeId}. Its fare estimate was removed too, so passengers can no longer search it.`,
          routeId,
        );
      } catch {
        // The route is removed; a blocked notification store must not undo it.
      }
      setFeedback("Route and its fare estimate removed.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The route could not be removed. Please try again.",
      );
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingId ? "Edit route and fare" : "Add a route and estimated fare"}</h3>
      <DemoDataNotice show={routesAreDemo} what="routes and fares" />
      {routesError && <p className="module-error" role="alert">{routesError}</p>}
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

      <div className="admin-toolbar">
        <label>Find a route
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Town, destination, or service" />
        </label>
        <span className="module-count">{shownRoutes.length} of {routes.length}</span>
      </div>

      {shownRoutes.length === 0 ? (
        <p className="module-empty">No routes match this search.</p>
      ) : (
        <div className="admin-record-list">
          {shownRoutes.map((route) => {
            const routeFare = fares.find((item) => item.routeId === route.id);
            const scheduled = trips.filter((trip) => trip.route.toLowerCase() === `${route.origin} → ${route.destination}`.toLowerCase()).length;
            return (
              <article key={route.id}>
                <div>
                  <strong>{route.origin} → {route.destination}</strong>
                  <small>
                    {route.service} · {routeFare ? `MWK ${routeFare.amount.toLocaleString("en-MW")}` : "Fare not set"} ·{" "}
                    {scheduled} scheduled departure{scheduled === 1 ? "" : "s"}
                  </small>
                </div>
                <div className="admin-record-actions">
                  <button type="button" className="text-action" onClick={() => editRoute(route)}>Edit</button>
                  <button type="button" className="text-action danger-action" onClick={() => { if (window.confirm(`Remove ${route.origin} to ${route.destination}?`)) deleteRoute(route.id); }}>Remove</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TripScheduleManagement() {
  const { data: routes } = useBackendRoutes();
  const { data: fares } = useBackendFares();
  const { data: stops } = useBackendStops();
  const { data: trips, usingDemo: tripsAreDemo, reload: reloadTrips, error: tripsError } = useAdminTrips();
  const { data: bookings } = useAdminBookings();
  const [routeId, setRouteId] = useState("");
  const [date, setDate] = useState("");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [fare, setFare] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tripFilter, setTripFilter] = useState<"all" | "upcoming" | "past">("all");
  const [feedback, setFeedback] = useState("");
  const route = routes.find((item) => item.id === routeId);
  const pickupOptions = route
    ? stops.filter((stop) => stop.city.toLowerCase() === route.origin.toLowerCase() && (stop.kind === "pickup" || stop.kind === "both"))
    : [];
  const dropoffOptions = route
    ? stops.filter((stop) => stop.city.toLowerCase() === route.destination.toLowerCase() && (stop.kind === "dropoff" || stop.kind === "both"))
    : [];
  const today = localDateValue();
  const normalizedQuery = query.trim().toLowerCase();
  const shownTrips = [...trips]
    .filter((trip) => !normalizedQuery || `${trip.route} ${trip.date} ${trip.departure}`.toLowerCase().includes(normalizedQuery))
    .filter((trip) => tripFilter === "all" || (tripFilter === "upcoming" ? trip.date >= today : trip.date < today))
    .sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure));

  function chooseRoute(nextRouteId: string) {
    setRouteId(nextRouteId);
    setFare(String(fares.find((item) => item.routeId === nextRouteId)?.amount ?? ""));
    setPickup("");
    setDropoff("");
    setFeedback("");
  }

  function resetForm() {
    setEditingTripId(null);
    setRouteId("");
    setDate("");
    setDeparture("");
    setArrival("");
    setCapacity("40");
    setFare("");
    setPickup("");
    setDropoff("");
  }

  function startEdit(trip: Trip) {
    const matchingRoute = routeLabelForTrip(trip, routes);
    setEditingTripId(trip.id);
    setRouteId(matchingRoute?.id ?? "");
    setDate(trip.date);
    setDeparture(trip.departure);
    setArrival(trip.arrival);
    setCapacity(String(trip.capacity));
    setFare(String(trip.fare));
    setPickup(trip.pickup[0] ?? "");
    setDropoff(trip.dropoff[0] ?? "");
    setFeedback("");
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    const selectedRoute = routes.find((item) => item.id === routeId);
    const amount = Number(fare);
    const seatCapacity = Number(capacity);
    const todayValue = localDateValue();

    if (!selectedRoute) {
      setFeedback("Choose a route before adding a schedule.");
      return;
    }
    if (!date || date < todayValue || !departure || !arrival || departure === arrival) {
      setFeedback("Choose a future date and valid departure and arrival times.");
      return;
    }
    if (!Number.isSafeInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 200) {
      setFeedback("Seat capacity must be a whole number from 1 to 200.");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount < 1) {
      setFeedback("Enter a positive whole-number fare in MWK.");
      return;
    }

    try {
      if (trips.some((trip) =>
        trip.id !== editingTripId &&
        trip.route.toLowerCase() === `${selectedRoute.origin} → ${selectedRoute.destination}`.toLowerCase() &&
        trip.date === date &&
        trip.departure === departure,
      )) {
        setFeedback("A departure for this route, date, and time is already scheduled.");
        return;
      }

      const nextTrip: Trip = {
        id: editingTripId ?? newId("trip"),
        route: `${selectedRoute.origin} → ${selectedRoute.destination}`,
        pickup: [pickup || pickupOptions[0]?.name || selectedRoute.origin],
        dropoff: [dropoff || dropoffOptions[0]?.name || selectedRoute.destination],
        date,
        departure,
        arrival,
        capacity: seatCapacity,
        fare: amount,
      };
      const originalTrip = editingTripId ? trips.find((trip) => trip.id === editingTripId) : undefined;
      const confirmedBookings = editingTripId
        ? bookings.filter((booking) => booking.tripId === editingTripId && booking.status === "confirmed")
        : [];

      if (originalTrip && confirmedBookings.length > 0) {
        const detailsChanged =
          originalTrip.route !== nextTrip.route ||
          originalTrip.date !== nextTrip.date ||
          originalTrip.departure !== nextTrip.departure ||
          originalTrip.arrival !== nextTrip.arrival ||
          originalTrip.pickup.join("|") !== nextTrip.pickup.join("|") ||
          originalTrip.dropoff.join("|") !== nextTrip.dropoff.join("|");
        if (detailsChanged) {
          setFeedback("This departure has confirmed bookings. Remove or cancel those bookings before changing its route, date, times, or stops.");
          return;
        }
        const highestBookedSeat = Math.max(
          0,
          ...confirmedBookings.flatMap((booking) => booking.seats ?? []),
        );
        const minimumCapacity = Math.max(
          highestBookedSeat,
          confirmedBookings.reduce((total, booking) => total + booking.passengers, 0) +
            adminReservedSeatNumbers(originalTrip).length,
        );
        if (seatCapacity < minimumCapacity) {
          setFeedback(`Seat capacity must stay at least ${minimumCapacity} while this departure has confirmed bookings.`);
          return;
        }
      }

      if (tripsAreDemo) {
        const currentTrips = loadList<Trip>(KEYS.trips, EMPTY_TRIPS);
        saveList(KEYS.trips, editingTripId
          ? currentTrips.map((trip) => trip.id === editingTripId ? nextTrip : trip)
          : [...currentTrips, nextTrip]);
      } else {
        // The backend stores a weekly schedule, so the chosen date becomes its weekday.
        const routeRecord = await apiRoutes.get(Number(selectedRoute.id));
        const vehicleId = await ensureVehicle(seatCapacity);
        const departureStopId = await resolveStopId(
          nextTrip.pickup[0] ?? "",
          routeRecord.originStopId ?? routeRecord.stops?.[0]?.stopId ?? 0,
        );
        const payload = {
          routeId: Number(selectedRoute.id),
          vehicleId,
          departureStopId,
          departureTime: departure,
          arrivalAt: arrival,
          fare: amount,
          daysOfWeek: weekdaysForDate(date),
        };

        if (editingTripId) {
          await apiSchedules.update(Number(editingTripId), payload);
        } else {
          await apiSchedules.create(payload);
        }
        reloadTrips();
      }

      try {
        notifyRouteUpdate(
          `${editingTripId ? "Departure updated" : "New departure scheduled"}: ${nextTrip.route} on ${fmtDate(nextTrip.date)} at ${nextTrip.departure}, ${nextTrip.capacity} seats, MWK ${nextTrip.fare.toLocaleString("en-MW")}. Passengers can ${editingTripId ? "still " : "now "}book this trip.`,
          nextTrip.id,
        );
      } catch {
        // The schedule is saved; a blocked notification store must not undo it.
      }
      resetForm();
      setFeedback(editingTripId ? "Scheduled departure updated for passengers." : "Trip scheduled. Passengers can now book this departure.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The schedule could not be saved. Please try again.",
      );
    }
  }

  async function removeSchedule(trip: Trip) {
    if (bookings.some((booking) => booking.tripId === trip.id && booking.status === "confirmed")) {
      setFeedback("This departure has confirmed bookings and cannot be removed. Cancel the bookings first.");
      return;
    }
    if (!window.confirm(`Remove the ${trip.route} departure on ${fmtDate(trip.date)} at ${trip.departure}?`)) return;
    try {
      if (tripsAreDemo) {
        saveList(KEYS.trips, loadList<Trip>(KEYS.trips, EMPTY_TRIPS).filter((item) => item.id !== trip.id));
        reloadTrips();
      } else {
        await apiSchedules.remove(Number(trip.id));
        reloadTrips();
      }
      try {
        notifyRouteUpdate(
          `Departure removed: ${trip.route} on ${fmtDate(trip.date)} at ${trip.departure}. It can no longer be booked.`,
          trip.id,
        );
      } catch {
        // The departure is removed; a blocked notification store must not undo it.
      }
      if (editingTripId === trip.id) resetForm();
      setFeedback("Scheduled departure removed.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The departure could not be removed. Please try again.",
      );
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingTripId ? "Edit a scheduled departure" : "Schedule a departure"}</h3>
      <DemoDataNotice show={tripsAreDemo} what="scheduled departures" />
      {tripsError && <p className="module-error" role="alert">{tripsError}</p>}
      <p className="module-copy">Only departures scheduled here can be booked by passengers. Choose a future travel date.</p>
      {routes.length === 0 ? (
        <p className="module-empty">Add a route and fare in Routes &amp; fares before scheduling a departure.</p>
      ) : (
        <form className="module-form admin-data-form" onSubmit={submitSchedule}>
          <label>Route
            <select value={routeId} onChange={(event) => chooseRoute(event.target.value)} required>
              <option value="">Choose a published route</option>
              {routes.map((item) => <option key={item.id} value={item.id}>{item.origin} → {item.destination}</option>)}
            </select>
          </label>
          <label>Travel date<input type="date" min={localDateValue()} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label>Departure time<input type="time" value={departure} onChange={(event) => setDeparture(event.target.value)} required /></label>
          <label>Arrival time<input type="time" value={arrival} onChange={(event) => setArrival(event.target.value)} required /></label>
          <label>Seats<input type="number" min="1" max="200" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required /></label>
          <label>Fare per passenger (MWK)<input type="number" min="1" step="1" value={fare} onChange={(event) => setFare(event.target.value)} required /></label>
          {route && pickupOptions.length > 0 && (
            <label>Boarding point
              <select value={pickup} onChange={(event) => setPickup(event.target.value)}>
                <option value="">Use first pickup point</option>
                {pickupOptions.map((stop) => <option key={stop.id} value={stop.name}>{stop.name}</option>)}
              </select>
            </label>
          )}
          {route && dropoffOptions.length > 0 && (
            <label>Drop-off point
              <select value={dropoff} onChange={(event) => setDropoff(event.target.value)}>
                <option value="">Use first drop-off point</option>
                {dropoffOptions.map((stop) => <option key={stop.id} value={stop.name}>{stop.name}</option>)}
              </select>
            </label>
          )}
          <button className="primary-button" type="submit">{editingTripId ? "Save departure" : "Add scheduled trip"}</button>
          {editingTripId && <button className="secondary-button" type="button" onClick={() => { resetForm(); setFeedback(""); }}>Stop editing</button>}
        </form>
      )}
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}

      <div className="admin-toolbar">
        <label>Find a departure
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Route, date, or time" />
        </label>
        <label>Show
          <select value={tripFilter} onChange={(event) => setTripFilter(event.target.value as "all" | "upcoming" | "past")}>
            <option value="all">All departures</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </label>
        <span className="module-count">{shownTrips.length} of {trips.length}</span>
      </div>

      <h3>Scheduled trips</h3>
      {shownTrips.length === 0 ? (
        <p className="module-empty">No scheduled trips match this view.</p>
      ) : (
        <div className="admin-record-list">
          {shownTrips.map((trip) => {
            const bookedSeats = bookings
              .filter((booking) => booking.tripId === trip.id && booking.status === "confirmed")
              .reduce((total, booking) => total + booking.passengers, 0);
            const seatsLeft = availableSeats(trip, bookings);
            const isPast = trip.date < today;
            return (
              <article key={trip.id}>
                <div>
                  <strong>{trip.route} · {fmtDate(trip.date)}</strong>
                  <small>{trip.departure}–{trip.arrival} · {trip.capacity} seats · MWK {trip.fare.toLocaleString("en-MW")} · {bookedSeats} booked · {seatsLeft} left</small>
                  <small>{trip.pickup.join(", ")} → {trip.dropoff.join(", ")}</small>
                </div>
                <div className="admin-record-actions">
                  <span className={`admin-tag ${isPast ? "is-muted" : "is-upcoming"}`}>{isPast ? "Past" : "Upcoming"}</span>
                  <button type="button" className="text-action" onClick={() => startEdit(trip)}>Edit</button>
                  <button type="button" className="text-action danger-action" onClick={() => removeSchedule(trip)}>Remove</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StopManagement() {
  const { data: stops, usingDemo: stopsAreDemo, reload: reloadStops, error: stopsError } = useBackendStops();
  const { data: trips } = useAdminTrips();
  const { data: bookings } = useAdminBookings();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<StopKind>("pickup");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const shownStops = stops.filter((stop) =>
    !normalizedQuery || `${stop.name} ${stop.city} ${stopKindLabel(stop.kind)}`.toLowerCase().includes(normalizedQuery),
  );

  function tripsUsing(nameToFind: string) {
    return trips.filter((trip) => trip.pickup.includes(nameToFind) || trip.dropoff.includes(nameToFind));
  }

  async function submitStop(event: FormEvent<HTMLFormElement>) {
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
      const item = { name: name.trim(), city: city.trim(), kind, lat: parsedLat, lng: parsedLng };

      if (stopsAreDemo) {
        const current = loadList<StopItem>(KEYS.stops, SEED_STOPS);
        const previous = editingId ? current.find((stop) => stop.id === editingId) : undefined;
        saveList(KEYS.stops, editingId
          ? current.map((stop) => stop.id === editingId ? { ...stop, ...item } : stop)
          : [...current, { id: newId("stop"), ...item }]);

        let updatedTrips = 0;
        let updatedBookings = 0;
        if (previous && previous.name !== item.name) {
          const currentTrips = loadList<Trip>(KEYS.trips, EMPTY_TRIPS);
          const nextTrips = currentTrips.map((trip) => {
            const pickup = trip.pickup.map((point) => point === previous.name ? item.name : point);
            const dropoff = trip.dropoff.map((point) => point === previous.name ? item.name : point);
            if (pickup.some((point, index) => point !== trip.pickup[index]) || dropoff.some((point, index) => point !== trip.dropoff[index])) {
              updatedTrips += 1;
              return { ...trip, pickup, dropoff };
            }
            return trip;
          });
          if (updatedTrips > 0) saveList(KEYS.trips, nextTrips);

          const currentBookings = loadList<Booking>(KEYS.bookings, EMPTY_BOOKINGS);
          const nextBookings = currentBookings.map((booking) => {
            const nextPickup = booking.pickup === previous.name ? item.name : booking.pickup;
            const nextDropoff = booking.dropoff === previous.name ? item.name : booking.dropoff;
            if (nextPickup !== booking.pickup || nextDropoff !== booking.dropoff) {
              updatedBookings += 1;
              return { ...booking, pickup: nextPickup, dropoff: nextDropoff };
            }
            return booking;
          });
          if (updatedBookings > 0) saveList(KEYS.bookings, nextBookings);
        }
        reloadStops();
      } else if (editingId) {
        await apiStops.update(Number(editingId), fromStopItem(item));
        reloadStops();
      } else {
        await ensureStop(item.name, item.city, item.kind);
        reloadStops();
      }

      setName("");
      setCity("");
      setKind("pickup");
      setLat("");
      setLng("");
      setEditingId(null);
      const extra = [
        !stopsAreDemo && editingId ? "Stop renamed; its routes show the new name." : "",
      ].filter(Boolean).join(" · ");
      setFeedback(
        (editingId ? "Stop updated." : "Stop added.") + (extra ? ` ${extra}.` : ""),
      );
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The stop could not be saved. Please try again.",
      );
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

  async function deleteStop(stop: StopItem) {
    const linkedTrips = tripsUsing(stop.name);
    const linkedBookings = bookings.filter((booking) => booking.pickup === stop.name || booking.dropoff === stop.name);
    if (linkedTrips.length > 0 || linkedBookings.length > 0) {
      setFeedback(
        `${stop.name} is used by ${linkedTrips.length} scheduled trip${linkedTrips.length === 1 ? "" : "s"} and ${linkedBookings.length} booking${linkedBookings.length === 1 ? "" : "s"}. Remove or update those first.`,
      );
      return;
    }
    try {
      if (stopsAreDemo) {
        saveList(KEYS.stops, loadList<StopItem>(KEYS.stops, SEED_STOPS).filter((item) => item.id !== stop.id));
      } else {
        await apiStops.remove(Number(stop.id));
      }
      reloadStops();
      setFeedback("Stop removed.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The stop could not be removed. Please try again.",
      );
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingId ? "Edit pickup or drop-off point" : "Add a pickup or drop-off point"}</h3>
      <DemoDataNotice show={stopsAreDemo} what="stops" />
      {stopsError && <p className="module-error" role="alert">{stopsError}</p>}
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

      <div className="admin-toolbar">
        <label>Find a stop
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Stop, town, or point type" />
        </label>
        <span className="module-count">{shownStops.length} of {stops.length}</span>
      </div>

      {shownStops.length === 0 ? (
        <p className="module-empty">No stops match this search.</p>
      ) : (
        <div className="admin-record-list">
          {shownStops.map((stop) => {
            const linkedTrips = tripsUsing(stop.name);
            return (
              <article key={stop.id}>
                <div>
                  <strong>{stop.name}</strong>
                  <small>{stopKindLabel(stop.kind)} · {stop.city} · {hasCoords(stop) ? `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}` : "No map coordinates"}</small>
                  <small>{linkedTrips.length > 0 ? `Used by ${linkedTrips.length} scheduled trip${linkedTrips.length === 1 ? "" : "s"}` : "Not used by a scheduled trip yet"}</small>
                </div>
                <div className="admin-record-actions">
                  <button type="button" className="text-action" onClick={() => editStop(stop)}>Edit</button>
                  <button type="button" className="text-action danger-action" onClick={() => { if (window.confirm(`Remove ${stop.name}?`)) deleteStop(stop); }}>Remove</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingManagement() {
  const { data: bookings, usingDemo: bookingsAreDemo, reload: reloadBookings, error: bookingsError } = useAdminBookings();
  const { data: trips } = useAdminTrips();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const confirmedCount = bookings.filter((booking) => booking.status === "confirmed").length;
  const cancelledCount = bookings.length - confirmedCount;
  const paidCount = bookings.filter((booking) => booking.paymentStatus === "paid").length;
  const revenue = bookings
    .filter((booking) => booking.status === "confirmed" && booking.paymentStatus === "paid")
    .reduce((total, booking) => total + (booking.amountPaid ?? 0), 0);

  const shown = [...bookings]
    .filter((booking) =>
      (!normalizedQuery || [booking.reference, booking.name, booking.email, booking.route, booking.pickup, booking.dropoff].some((value) => value.toLowerCase().includes(normalizedQuery))) &&
      (statusFilter === "all" || booking.status === statusFilter) &&
      (paymentFilter === "all" || (paymentFilter === "paid" ? booking.paymentStatus === "paid" : booking.paymentStatus !== "paid")),
    )
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  async function setStatus(reference: string, status: Booking["status"]) {
    const target = bookings.find((booking) => booking.reference === reference);
    if (!target || target.status === status) return;

    if (status === "confirmed" && !bookingsAreDemo) {
      setError(
        `The backend cannot re-confirm ${reference}. Ask the passenger to make a new booking instead.`,
      );
      return;
    }

    if (status === "confirmed") {
      const trip = trips.find((item) => item.id === target.tripId);
      if (!trip) {
        setError(`Cannot re-confirm ${reference}: its scheduled trip is no longer available.`);
        return;
      }
      const others = bookings.filter((booking) => booking.reference !== reference);
      const available = availableSeatNumbers(trip, others);
      const availableSet = new Set(available);
      if (target.seats?.length && !target.seats.every((seat) => availableSet.has(seat))) {
        setError(`Cannot re-confirm ${reference}: one of its seats has since been taken.`);
        return;
      }
      if (available.length < target.passengers) {
        setError(`Cannot re-confirm ${reference}: the trip has only ${available.length} seat${available.length === 1 ? "" : "s"} left.`);
        return;
      }
    }

    setError("");
    const updatedBooking = { ...target, status };
    try {
      if (bookingsAreDemo) {
        const all = loadList<Booking>(KEYS.bookings, EMPTY_BOOKINGS);
        saveList(KEYS.bookings, all.map((booking) => (booking.reference === reference ? updatedBooking : booking)));
      } else {
        await apiBookings.cancel(reference);
      }
      reloadBookings();
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "The booking status could not be updated. Please try again.",
      );
      return;
    }

    try {
      notifyBookingStatus(
        updatedBooking,
        status === "cancelled" ? "booking-cancelled" : "booking-reconfirmed",
        status === "cancelled"
          ? `Your booking for ${target.route} on ${fmtDate(target.travelDate)} was cancelled by the transport company. The seats have been released for other passengers.`
          : `Your booking for ${target.route} on ${fmtDate(target.travelDate)} was confirmed again by the transport company.`,
      );
    } catch (reason) {
      setFeedback(
        reason instanceof Error
          ? `Booking status was updated, but its notification could not be saved: ${reason.message}`
          : "Booking status was updated, but its notification could not be saved.",
      );
      return;
    }
    setFeedback(
      status === "cancelled"
        ? `Booking ${reference} cancelled. Seats are available again and the passenger was notified.`
        : `Booking ${reference} confirmed again. The passenger was notified.`,
    );
  }

  return (
    <div className="admin-section-content">
      <h3>Passenger bookings</h3>
      <DemoDataNotice show={bookingsAreDemo} what="bookings" />
      {bookingsError && <p className="module-error" role="alert">{bookingsError}</p>}
      <p className="module-copy">
        {bookings.length} reservation{bookings.length === 1 ? "" : "s"} {bookingsAreDemo ? "in this browser" : "from the backend"} · {confirmedCount} confirmed ·{" "}
        {cancelledCount} cancelled · {paidCount} paid · MWK {revenue.toLocaleString("en-MW")} collected.
      </p>

      <div className="admin-toolbar">
        <label>Search bookings
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, name, email, route, or stop" />
        </label>
        <label>Booking status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | Booking["status"])}>
            <option value="all">All bookings</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>Payment
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as "all" | "paid" | "pending")}>
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending / not recorded</option>
          </select>
        </label>
        <span className="module-count">{shown.length} shown</span>
      </div>

      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}

      {shown.length === 0 ? (
        <p className="module-empty">No bookings match this view.</p>
      ) : (
        <div className="admin-record-list">
          {shown.map((booking) => {
            const trip = trips.find((item) => item.id === booking.tripId);
            return (
              <article className="admin-booking-record" key={booking.reference}>
                <div>
                  <strong>{booking.route} · {fmtDate(booking.travelDate)}</strong>
                  <small>{booking.name} ({booking.email}) · {booking.passengers} passenger{booking.passengers === 1 ? "" : "s"} · Seats {booking.seats?.length ? booking.seats.join(", ") : "not recorded"}</small>
                  <small>{booking.pickup} → {booking.dropoff} · Reference {booking.reference} · Booked {formatMoment(booking.createdAt)}</small>
                  {booking.paymentStatus === "paid" ? (
                    <small className="admin-payment-line">
                      Paid MWK {(booking.amountPaid ?? 0).toLocaleString("en-MW")} via {booking.paymentProvider ?? paymentMethodLabel(booking.paymentMethod)}
                      {booking.payerPhone ? ` (${booking.payerPhone})` : ""}
                      {booking.payerAccountLast4 ? ` (account •••• ${booking.payerAccountLast4})` : ""}
                      {booking.paymentReference ? ` · Ref ${booking.paymentReference}` : ""}
                      {booking.paymentCode ? ` · Code ${booking.paymentCode}` : ""}
                    </small>
                  ) : (
                    <small className="admin-payment-line is-pending">Payment not recorded</small>
                  )}
                  <small>{trip ? `Trip departs ${trip.departure} and arrives ${trip.arrival}` : "The scheduled trip for this booking no longer exists."}</small>
                </div>
                <div className="admin-booking-actions">
                  <div className="admin-activity-tags">
                    {booking.paymentStatus === "paid" && <span className="admin-tag is-paid">Paid</span>}
                    <span className={`booking-state ${booking.status}`}>{booking.status}</span>
                  </div>
                  {booking.status === "confirmed" ? (
                    <button type="button" className="text-action danger-action" onClick={() => setStatus(booking.reference, "cancelled")}>Cancel booking</button>
                  ) : (
                    <button type="button" className="text-action" onClick={() => setStatus(booking.reference, "confirmed")}>Re-confirm booking</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="module-footnote">
        Cancelling a booking releases its seats immediately. Re-confirming checks the live seat map first,
        including the seat reserved for the transport admin.
      </p>
    </div>
  );
}

function ReportManagement() {
  const reports: ReportItem[] = [];
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");

  const shown = [...reports]
    .filter((report) => filter === "all" || report.status === filter)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  function updateReport(report: ReportItem, patch: Partial<ReportItem>) {
    try {
      const nextReport = { ...report, ...patch };
      saveList(
        KEYS.reports,
        loadList<ReportItem>(KEYS.reports, MOCK_REPORTS).map((item) => item.id === report.id ? nextReport : item),
      );
      const statusLabel = REPORT_STATUS_LABELS[nextReport.status];
      const note = nextReport.adminNote.trim();
      try {
        notifyReportUpdate(
          `Report ${report.id.toUpperCase()} (${report.type}: ${report.itemName}) is now ${statusLabel.toLowerCase()}.${note ? ` Staff note: ${note}` : ""}`,
          report.id,
        );
      } catch {
        // The report is saved; a blocked notification store must not undo it.
      }
      setFeedback(`Report ${report.id.toUpperCase()} updated. The passenger notification feed was refreshed.`);
    } catch {
      setFeedback("The report could not be updated. Please try again.");
    }
  }

  function saveNote(report: ReportItem) {
    const note = (noteDrafts[report.id] ?? report.adminNote).trim();
    updateReport(report, { adminNote: note });
  }

  function deleteReport(report: ReportItem) {
    if (!window.confirm(`Delete report ${report.id.toUpperCase()}? This cannot be undone.`)) return;
    try {
      saveList(KEYS.reports, loadList<ReportItem>(KEYS.reports, MOCK_REPORTS).filter((item) => item.id !== report.id));
      setFeedback("Report deleted.");
    } catch {
      setFeedback("The report could not be deleted. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>Customer submitted reports</h3>
      <p className="module-copy">
        {reports.length} report{reports.length === 1 ? "" : "s"} in total. Reports and staff notes are
        kept in this browser because the backend has no reports endpoint yet.
      </p>

      <div className="admin-toolbar">
        <label>Show reports
          <select value={filter} onChange={(event) => setFilter(event.target.value as "all" | ReportStatus)}>
            <option value="all">All ({reports.length})</option>
            <option value="open">Open ({reports.filter((report) => report.status === "open").length})</option>
            <option value="reviewing">Reviewing ({reports.filter((report) => report.status === "reviewing").length})</option>
            <option value="resolved">Resolved ({reports.filter((report) => report.status === "resolved").length})</option>
            <option value="dismissed">Dismissed ({reports.filter((report) => report.status === "dismissed").length})</option>
          </select>
        </label>
        <span className="module-count">{shown.length} shown</span>
      </div>

      {feedback && <p className="module-feedback" role="status">{feedback}</p>}
      {shown.length === 0 ? (
        <p className="module-empty">There are no customer reports in this view.</p>
      ) : (
        <div className="admin-record-list">
          {shown.map((report) => (
            <article className="admin-report-record" key={report.id}>
              <div>
                <strong>{report.type}: {report.itemName}</strong>
                <small>
                  {report.reporterName || "Guest reporter"}
                  {report.reporterEmail ? ` · ${report.reporterEmail}` : " · No email provided"} ·{" "}
                  {report.location || "Location not provided"} · {formatMoment(report.createdAt)} · Ref {report.id.toUpperCase()}
                </small>
                <p>{report.description}</p>
                <label className="admin-note-field">
                  Staff note shown to the passenger
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={noteDrafts[report.id] ?? report.adminNote}
                    onChange={(event) => setNoteDrafts((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Explain what was checked or what changed…"
                  />
                </label>
                <div className="admin-report-actions">
                  <label className="status-control">
                    Status
                    <select value={report.status} onChange={(event) => updateReport(report, { status: event.target.value as ReportStatus })}>
                      <option value="open">Open</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </label>
                  <button type="button" className="secondary-button" onClick={() => saveNote(report)}>Save note</button>
                  <button type="button" className="text-action danger-action" onClick={() => deleteReport(report)}>Delete</button>
                </div>
              </div>
              <span className={`report-status-badge is-${report.status}`}>{REPORT_STATUS_LABELS[report.status]}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type PassengerRow = {
  key: string;
  name: string;
  email: string;
  registered: boolean;
  bookingCount: number;
  reportCount: number;
  lastActivity: string;
};

function PassengerManagement() {
  const { data: accounts } = useAdminUsers();
  const { data: bookings, usingDemo: bookingsAreDemo, error: bookingsError } = useAdminBookings();
  const reports: ReportItem[] = [];
  const [query, setQuery] = useState("");
  const [messaging, setMessaging] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const people = useMemo(() => {
    const map = new Map<string, PassengerRow>();
    const ensure = (name: string, email: string, registered: boolean) => {
      const key = email.trim().toLowerCase();
      if (!key) return null;
      const existing = map.get(key);
      if (existing) {
        if (!existing.name && name) existing.name = name;
        existing.registered = existing.registered || registered;
        return existing;
      }
      const row: PassengerRow = {
        key,
        name: name.trim() || key,
        email: key,
        registered,
        bookingCount: 0,
        reportCount: 0,
        lastActivity: "",
      };
      map.set(key, row);
      return row;
    };

    for (const account of accounts) ensure(account.fullName, account.email ?? "", true);

    for (const booking of bookings) {
      const row = ensure(booking.name, booking.email, false);
      if (row) {
        row.bookingCount += 1;
        if (booking.createdAt > row.lastActivity) row.lastActivity = booking.createdAt;
      }
    }

    for (const report of reports) {
      if (!report.reporterEmail) continue;
      const row = ensure(report.reporterName ?? "", report.reporterEmail, false);
      if (row) {
        row.reportCount += 1;
        if (report.createdAt > row.lastActivity) row.lastActivity = report.createdAt;
      }
    }

    return [...map.values()].sort((first, second) => first.name.localeCompare(second.name));
  }, [accounts, bookings, reports]);

  const shown = people.filter((person) =>
    !normalizedQuery || `${person.name} ${person.email}`.toLowerCase().includes(normalizedQuery),
  );
  const registeredCount = people.filter((person) => person.registered).length;
  const guestCount = people.length - registeredCount;

  function sendMessage(person: PassengerRow) {
    const text = message.trim();
    if (text.length < 3) {
      setFeedback("Write at least 3 characters before sending an update.");
      return;
    }
    try {
      notifyCompanyUpdate(`Update for ${person.name}: ${text}`, "Passenger update");
      setMessage("");
      setMessaging(null);
      setFeedback(`Update queued for ${person.name}. It appears in the passenger notification feed.`);
    } catch {
      setFeedback("The passenger update could not be saved. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>Passengers and booking contacts</h3>
      <DemoDataNotice show={bookingsAreDemo} what="passengers and bookings" />
      {bookingsError && <p className="module-error" role="alert">{bookingsError}</p>}
      <p className="module-copy">
        {registeredCount} registered passenger account{registeredCount === 1 ? "" : "s"} and {guestCount} guest
        contact{guestCount === 1 ? "" : "s"} from the backend accounts, bookings, and local reports.
      </p>

      <div className="admin-toolbar">
        <label>Find a passenger
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email address" />
        </label>
        <span className="module-count">{shown.length} of {people.length}</span>
      </div>

      {feedback && <p className="module-feedback" role="status">{feedback}</p>}

      {shown.length === 0 ? (
        <p className="module-empty">No passengers or booking contacts match this view.</p>
      ) : (
        <div className="admin-record-list">
          {shown.map((person) => (
            <article className="admin-passenger-record" key={person.key}>
              <div>
                <strong>{person.name}</strong>
                <small>
                  {person.email} · {person.registered ? "Registered account" : "Guest contact"} ·{" "}
                  {person.bookingCount} booking{person.bookingCount === 1 ? "" : "s"} ·{" "}
                  {person.reportCount} report{person.reportCount === 1 ? "" : "s"}
                </small>
                <small>Last activity: {person.lastActivity ? formatMoment(person.lastActivity) : "No booking or report yet"}</small>
                {messaging === person.key && (
                  <div className="admin-message-form">
                    <label>
                      Message for {person.name}
                      <textarea
                        rows={2}
                        maxLength={400}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="e.g. Your departure time has changed. Please check your booking."
                      />
                    </label>
                    <div className="admin-record-actions">
                      <button type="button" className="primary-button" onClick={() => sendMessage(person)}>Send update</button>
                      <button type="button" className="secondary-button" onClick={() => { setMessaging(null); setMessage(""); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="admin-record-actions">
                <span className={`admin-tag ${person.registered ? "is-registered" : "is-muted"}`}>
                  {person.registered ? "Registered" : "Guest"}
                </span>
                <button
                  type="button"
                  className="text-action"
                  onClick={() => {
                    setMessaging((current) => current === person.key ? null : person.key);
                    setMessage("");
                    setFeedback("");
                  }}
                >
                  {messaging === person.key ? "Close" : "Message"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="module-footnote">
        Passenger accounts and bookings come from the backend. Reports and notification messages are
        still stored in this browser because the backend has no reports endpoint yet.
      </p>
    </div>
  );
}

function CompanyProfileManagement() {
  const session = useSession();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.email) return;
    const timer = window.setTimeout(() => {
      const profile = readAdminProfile(session.email);
      setEmail(profile?.email ?? session.email);
      setCompanyName(profile?.companyName ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session?.email]);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");
    if (!session?.email) {
      setError("Sign in as an administrator to update the company profile.");
      return;
    }
    try {
      const updated = updateAdminCompanyName(session.email, companyName);
      setCompanyName(updated.companyName);
      try {
        notifyCompanyUpdate(
          `${updated.companyName} updated its company profile. Passenger routes, fares, and schedules are unchanged.`,
          "Company profile",
        );
      } catch {
        // The profile is saved; a blocked notification store must not undo it.
      }
      setFeedback("Company profile updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The company profile could not be saved.");
    }
  }

  function sendAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");
    const text = announcement.trim();
    if (text.length < 5 || text.length > 500) {
      setError("Write an announcement between 5 and 500 characters.");
      return;
    }
    try {
      notifyCompanyUpdate(text, "Company announcement");
      setAnnouncement("");
      setFeedback("Announcement sent to the passenger notification feed.");
    } catch {
      setError("The announcement could not be saved. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>Company profile and announcements</h3>
      <p className="module-copy">
        This is the company identity used when you sign in and when passengers receive updates from your
        transport company.
      </p>

      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}

      <div className="admin-company-grid">
        <form className="module-form admin-data-form" onSubmit={saveProfile}>
          <h4>Company details</h4>
          <label>Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} minLength={2} maxLength={100} required /></label>
          <label>Company email<input type="email" value={email} readOnly aria-describedby="company-email-note" /></label>
          <p id="company-email-note" className="module-footnote">The company email is the administrator sign-in identity and cannot be changed here.</p>
          <button className="primary-button" type="submit">Save company profile</button>
        </form>

        <form className="module-form admin-data-form" onSubmit={sendAnnouncement}>
          <h4>Message passengers</h4>
          <label>Announcement
            <textarea
              rows={5}
              maxLength={500}
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              placeholder="e.g. New Blantyre to Lilongwe departures are now open for booking."
            />
          </label>
          <p className="module-footnote">Announcements appear in the notification feed on passenger pages in this browser.</p>
          <button className="primary-button" type="submit">Send announcement</button>
        </form>
      </div>

      <section className="admin-alignment" aria-labelledby="company-checks-heading">
        <h3 id="company-checks-heading">Administrator checklist</h3>
        <ul>
          <li>Publish the routes and fare estimates passengers can search.</li>
          <li>Schedule future departures so passengers can pick seats and pay in the demo checkout.</li>
          <li>Keep pickup and drop-off points accurate; renaming a stop updates its scheduled trips and bookings.</li>
          <li>Review bookings and reports, then send updates so passengers see the outcome immediately.</li>
        </ul>
      </section>
    </div>
  );
}
