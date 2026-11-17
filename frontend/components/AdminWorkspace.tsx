"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  adminReservedSeatNumbers,
  availableSeatNumbers,
  availableSeats,
  fmtDate,
} from "@/lib/booking-data";
import { readAdminProfile, updateAdminCompanyName, useSession } from "@/lib/auth";
import DemoDataNotice from "@/components/DemoDataNotice";
import AdminOperations from "@/components/AdminOperations";
import { hasCoords, travelEstimate } from "@/lib/geo";
import { MALAWI_LOCATIONS, TRANSPORT_TOWN_COORDINATES } from "@/lib/malawi-locations";
import {
  notifyBookingStatus,
  notifyCompanyUpdate,
  notifyReportUpdate,
  notifyRouteUpdate,
} from "@/lib/notifications";
import { ensureRouteStops, ensureStop, resolveStopId } from "@/lib/admin-api";
import { KEYS, MOCK_REPORTS, SEED_FARES, SEED_ROUTES, SEED_STOPS } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import { suggestedVehicleCapacity } from "@/lib/vehicle-capacity";
import {
  useAdminBackendRoutes,
  useAdminBookings,
  useAdminTrips,
  useAdminUsers,
  useBackendFares,
  useBackendRoutes,
  useBackendStops,
} from "@/lib/use-backend-data";
import { fromStopItem, weekdaysForDate } from "@/services/adapters";
import { ApiError } from "@/services/http";
import * as apiBookings from "@/services/bookings.service";
import * as apiFares from "@/services/fares.service";
import * as apiRoutes from "@/services/routes.service";
import * as apiSchedules from "@/services/schedules.service";
import * as apiStops from "@/services/stops.service";
import * as apiVehicles from "@/services/vehicles.service";
import type { Booking as ApiBooking, Fare, Schedule, Vehicle, Weekday } from "@/services/types";
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
  | "management"
  | "routes"
  | "schedules"
  | "stops"
  | "reports"
  | "bookings"
  | "passengers"
  | "company"
  | "operations";

export const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "management", label: "Management" },
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
    const timer = window.setTimeout(() => setSection(initialSection === "overview" ? "overview" : "management"), 0);
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
          <h2 id="admin-heading">Company admin workspace</h2>
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

      {section === "overview" && <OverviewPanel onNavigate={() => chooseSection("management")} />}
      {section !== "overview" && <>
        <div className="admin-overview-management" aria-label="Admin management forms">
          <RouteFareManagement />
          <TripScheduleManagement />
          <StopManagement />
          <BookingManagement />
          <PassengerManagement />
          <AdminOperations />
          <div className="admin-management-lower" aria-label="Feedback, notifications, and company profile">
            <h3>Feedback, notifications, and company profile</h3>
            <ReportManagement />
            <CompanyProfileManagement />
          </div>
        </div>
      </>}
    </section>
  );
}

function OverviewPanel({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const { data: routes, usingDemo: routesAreDemo, error: routesError, loading: routesLoading, reload: reloadRoutes } = useBackendRoutes();
  const { data: fares, error: faresError, loading: faresLoading, reload: reloadFares } = useBackendFares();
  const { data: stops } = useBackendStops();
  const { data: trips, error: tripsError } = useAdminTrips();
  const { data: bookings, usingDemo: bookingsAreDemo, error: bookingsError } = useAdminBookings();
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
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
    { id: "routes", label: "Published routes", value: routesLoading ? "…" : String(routes.length), hint: faresLoading ? "Loading fare estimates…" : `${fares.length} fare estimate${fares.length === 1 ? "" : "s"} attached` },
    { id: "stops", label: "Pickup & drop-off points", value: String(stops.length), hint: `${stops.filter(hasCoords).length} with map coordinates` },
    { id: "schedules", label: "Upcoming departures", value: String(upcomingTrips.length), hint: `${seatsAvailable} bookable seats left` },
    { id: "bookings", label: "Confirmed bookings", value: String(confirmedBookings.length), hint: `${seatsBooked} passenger seat${seatsBooked === 1 ? "" : "s"} sold` },
    { id: "passengers", label: "Registered passengers", value: String(accounts.length), hint: "Guest bookings also appear in Passengers" },
    { id: "bookings", label: "Revenue collected", value: `MWK ${revenue.toLocaleString("en-MW")}`, hint: `${paidBookings.length} paid booking${paidBookings.length === 1 ? "" : "s"}` },
    { id: "reports", label: "Reports to review", value: String(openReports.length), hint: `${reports.length} report${reports.length === 1 ? "" : "s"} in total` },
    { id: "company", label: "Company profile", value: "Manage", hint: "Update the company name or message passengers" },
  ];

  return (
    <div className="admin-section-content">
      <div className="admin-activity-heading">
        <h3>Today at a glance</h3>
        <button type="button" className="secondary-button" onClick={() => { reloadRoutes(); reloadFares(); }} disabled={routesLoading || faresLoading}>
          {routesLoading || faresLoading ? "Refreshing…" : "Refresh routes & fares"}
        </button>
      </div>
      <DemoDataNotice show={routesAreDemo || bookingsAreDemo} what="routes and bookings" />
      <DemoDataNotice show what="customer reports" />
      {(routesError || faresError || tripsError || bookingsError || usersError) && (
        <p className="module-error" role="alert">
          {routesError || faresError || tripsError || bookingsError || usersError}
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
  const { data: routes, usingDemo: routesAreDemo, reload: reloadRoutes, error: routesError } = useAdminBackendRoutes();
  const { data: fares, reload: reloadFares } = useBackendFares();
  const { data: stops, loading: stopsLoading, error: stopsError, reload: reloadStops } = useBackendStops();
  const { data: trips } = useAdminTrips();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [service, setService] = useState("Minibus");
  const [featured, setFeatured] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [intermediateStopIds, setIntermediateStopIds] = useState<string[]>([]);
  const [fare, setFare] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const shownRoutes = routes.filter((route) =>
    !normalizedQuery ||
    `${route.origin} ${route.destination} ${route.service}`.toLowerCase().includes(normalizedQuery),
  );
  const availableIntermediateStops = stops.filter((stop) =>
    ![origin.trim().toLowerCase(), destination.trim().toLowerCase()].includes(stop.city.trim().toLowerCase()),
  );

  function fillRouteDetails(nextOrigin: string, nextDestination: string) {
    const start = nextOrigin.trim();
    const end = nextDestination.trim();
    if (!start || !end) return;

    const matchingRoute = routes.find((route) =>
      route.id !== editingId &&
      route.origin.toLowerCase() === start.toLowerCase() &&
      route.destination.toLowerCase() === end.toLowerCase(),
    );
    if (matchingRoute) {
      setService(matchingRoute.service);
      setPickupLocation(matchingRoute.pickupLocation || start);
      setDistanceKm(matchingRoute.distance ? String(matchingRoute.distance / 1000) : "");
      setFeatured(matchingRoute.featured ?? false);
      setIntermediateStopIds((matchingRoute.intermediateStopIds ?? []).map(String));
      setFare(String(fares.find((item) => item.routeId === matchingRoute.id)?.amount ?? ""));
      return;
    }

    setPickupLocation(start);
    const coordinateFor = (town: string) => Object.entries(TRANSPORT_TOWN_COORDINATES)
      .find(([name]) => name.toLowerCase() === town.toLowerCase())?.[1];
    const startCoords = coordinateFor(start);
    const endCoords = coordinateFor(end);
    if (startCoords && endCoords) {
      const estimate = travelEstimate(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
      setDistanceKm(estimate.km > 0 ? String(estimate.km) : "");
    } else {
      setDistanceKm("");
    }
    setFare("");
    setIntermediateStopIds([]);
  }

  async function submitRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingRoute) return;
    const normalizedOrigin = origin.trim();
    const normalizedDestination = destination.trim();
    const amount = Number(fare);
    const distance = distanceKm.trim() ? Number(distanceKm) * 1000 : undefined;
    if (normalizedOrigin.length < 2 || normalizedDestination.length < 2 || normalizedOrigin.toLowerCase() === normalizedDestination.toLowerCase()) {
      setFeedback("Enter two different town names.");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setFeedback("Enter an estimated fare as a positive whole number of MWK.");
      return;
    }
    if (distance !== undefined && (!Number.isFinite(distance) || distance <= 0)) {
      setFeedback("Route distance must be a positive number of kilometres, or left blank.");
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

    setIsSavingRoute(true);
    setFeedback("Saving route and fare…");
    let savedRouteId = editingId ?? "";
    try {
      if (routesAreDemo) {
        const currentRoutes = loadList<RouteItem>(KEYS.routes, SEED_ROUTES);
        const currentFares = loadList<FareItem>(KEYS.fares, SEED_FARES);
        const routeId = editingId ?? newId("route");
        savedRouteId = routeId;
        const nextRoute = { id: routeId, origin: normalizedOrigin, destination: normalizedDestination, service: service.trim(), featured, pickupLocation: pickupLocation.trim() || null, distance };
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
            featured,
            pickupLocation: pickupLocation.trim() || undefined,
            distance,
          });
        } else {
          const created = await apiRoutes.create({
            name: `${normalizedOrigin} → ${normalizedDestination}`,
            ...stopIds,
            intermediateStopIds: intermediateStopIds.map(Number),
            companyName: service.trim(),
            featured,
            pickupLocation: pickupLocation.trim() || undefined,
            distance,
          });
          routeId = created.id;
        }
        savedRouteId = String(routeId);

        if (editingId) {
          await apiRoutes.updateStops(routeId, [stopIds.originStopId, ...intermediateStopIds.map(Number), stopIds.destinationStopId]);
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

      if (savedRouteId) window.dispatchEvent(new CustomEvent("admin-route-saved", { detail: { routeId: savedRouteId, fare: amount } }));

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
      setFeatured(false);
      setPickupLocation("");
      setDistanceKm("");
      setIntermediateStopIds([]);
      setEditingId(null);
      setFeedback(editingId ? "Route and fare updated for passenger search." : "Route and fare added for passenger search.");
    } catch (reason) {
      setFeedback(
        reason instanceof Error && reason.message
          ? reason.message
          : "The route or fare could not be saved. Please try again.",
      );
    } finally {
      setIsSavingRoute(false);
    }
  }

  function editRoute(route: RouteItem) {
    setEditingId(route.id);
    setOrigin(route.origin);
    setDestination(route.destination);
    setService(route.service);
    setFeatured(route.featured ?? false);
    setPickupLocation(route.pickupLocation ?? "");
    setDistanceKm(route.distance ? String(route.distance / 1000) : "");
    setIntermediateStopIds((route.intermediateStopIds ?? []).map(String));
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

  async function toggleRouteAvailability(route: RouteItem) {
    const nextActive = route.isActive === false;
    try {
      await apiRoutes.update(Number(route.id), { isActive: nextActive });
      reloadRoutes();
      setFeedback(nextActive ? "Route is now available to passengers." : "Route is now hidden from passenger search.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "The route availability could not be changed.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingId ? "Edit route and fare" : "Add a route and estimated fare"}</h3>
      <DemoDataNotice show={routesAreDemo} what="routes and fares" />
      {routesError && <p className="module-error" role="alert">{routesError}</p>}
      <form className="module-form admin-data-form" onSubmit={submitRoute}>
        <label>Starting town<input list="malawi-route-towns" value={origin} onChange={(event) => {
          const value = event.target.value;
          setOrigin(value);
          fillRouteDetails(value, destination);
        }} maxLength={60} required /></label>
        <label>Destination town<input list="malawi-route-towns" value={destination} onChange={(event) => {
          const value = event.target.value;
          setDestination(value);
          fillRouteDetails(origin, value);
        }} maxLength={60} required /></label>
        <datalist id="malawi-route-towns">{MALAWI_LOCATIONS.map((town) => <option key={town} value={town} />)}</datalist>
        <label>Service type
          <select value={service} onChange={(event) => setService(event.target.value)} required>
            <option value="Minibus">Minibus</option>
            <option value="Bus">Bus</option>
            <option value="Coach">Coach</option>
            <option value="Shuttle">Shuttle</option>
          </select>
        </label>
        <p className="module-footnote">Suggested capacity: {suggestedVehicleCapacity(service)} seats. The selected fleet vehicle sets the schedule capacity.</p>
        <label className="admin-feature-route"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Feature this route on the home page</label>
        <label>Primary pickup location<input value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} maxLength={120} /></label>
        <label>Approx. route distance (km)<input type="number" min="0.1" step="0.1" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} /></label>
        <fieldset className="admin-stop-picker">
          <legend>Intermediate stops (select in journey order)</legend>
          {stopsLoading ? <span className="module-copy">Loading stops…</span>
            : stopsError ? <span className="module-error" role="alert">Stops could not be loaded. <button type="button" className="text-action" onClick={reloadStops}>Retry</button></span>
            : availableIntermediateStops.length === 0
              ? <span className="module-copy">No intermediate stops available. <a className="text-action" href="#admin-stop-management">Add pickup/drop-off points</a>.</span>
              : availableIntermediateStops.map((stop) => (
              <label key={stop.id}><input type="checkbox" checked={intermediateStopIds.includes(stop.id)} onChange={(event) => setIntermediateStopIds((selected) => event.target.checked ? [...selected, stop.id] : selected.filter((id) => id !== stop.id))} />{stop.name} · {stop.city}</label>
            ))}
        </fieldset>
        <label>Estimated fare (MWK)<input type="number" min="1" step="1" value={fare} onChange={(event) => setFare(event.target.value)} required /></label>
        <button className="primary-button" type="submit" disabled={isSavingRoute}>{isSavingRoute ? "Saving route…" : editingId ? "Save changes" : "Add route"}</button>
        {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setOrigin(""); setDestination(""); setFare(""); setFeedback(""); }}>Stop editing</button>}
        {feedback && <p className="module-feedback" role={isSavingRoute ? "status" : "alert"}>{feedback}</p>}
      </form>

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
                  <small>{route.isActive === false ? "Hidden from passengers" : "Available to passengers"} · {route.featured ? "Featured on home" : "Not featured"}</small>
                  {(route.pickupLocation || route.distance) && <small>{route.pickupLocation || "Pickup location not set"}{route.distance ? ` · ${(route.distance / 1000).toLocaleString("en-MW")} km` : ""}</small>}
                </div>
                <div className="admin-record-actions">
                  <button type="button" className="text-action" onClick={() => editRoute(route)}>Edit</button>
                  <button type="button" className="text-action" onClick={() => void toggleRouteAvailability(route)}>{route.isActive === false ? "Publish" : "Hide"}</button>
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
  const { data: routes, loading: routesLoading, error: routesError, reload: reloadRoutes } = useBackendRoutes();
  const { data: fares } = useBackendFares();
  const { data: stops } = useBackendStops();
  const { data: trips, usingDemo: tripsAreDemo, reload: reloadTrips, error: tripsError } = useAdminTrips();
  const { data: bookings } = useAdminBookings();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleFeedback, setVehicleFeedback] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("Minibus");
  const [newVehicleCapacity, setNewVehicleCapacity] = useState("15");
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState("");
  const [operatingDays, setOperatingDays] = useState<Weekday[]>([]);
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
  const [removingScheduleId, setRemovingScheduleId] = useState<string | null>(null);
  const loadVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      setVehicles((await apiVehicles.list()).filter((vehicle) => vehicle.isActive !== false));
      setVehiclesError("");
    } catch (reason) {
      setVehiclesError(reason instanceof Error ? reason.message : "Vehicles could not be loaded.");
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadVehicles(); }, 0);
    const refreshFleet = () => { void loadVehicles(); };
    window.addEventListener("backend-data-changed", refreshFleet);
    window.addEventListener("focus", refreshFleet);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("backend-data-changed", refreshFleet);
      window.removeEventListener("focus", refreshFleet);
    };
  }, [loadVehicles]);

  async function addVehicleToFleet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seatCapacity = Number(newVehicleCapacity);
    if (newPlate.trim().length < 2) {
      setVehicleFeedback("Enter the vehicle registration or plate number.");
      return;
    }
    if (newVehicleType.trim().length < 2) {
      setVehicleFeedback("Enter the type of vehicle.");
      return;
    }
    if (!Number.isSafeInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 200) {
      setVehicleFeedback("Seat capacity must be a whole number from 1 to 200.");
      return;
    }

    setVehicleSaving(true);
    setVehicleFeedback("");
    try {
      const plateNumber = newPlate.trim();
      const created = await apiVehicles.create({
        plateNumber,
        vehicleType: newVehicleType.trim(),
        capacity: seatCapacity,
      });
      const items = (await apiVehicles.list()).filter((vehicle) => vehicle.isActive !== false);
      setVehicles(items);
      setVehiclesError("");
      const match = items.find((item) => item.id === created?.id)
        ?? items.find((item) => item.plateNumber === plateNumber);
      if (match) {
        setVehicleId(String(match.id));
        setCapacity(String(match.capacity));
      }
      setNewPlate("");
      setNewVehicleType("Minibus");
      setNewVehicleCapacity("15");
      setVehicleFeedback(`Vehicle ${plateNumber} added to the fleet and selected for this departure.`);
    } catch (reason) {
      setVehicleFeedback(reason instanceof Error ? reason.message : "The vehicle could not be added.");
    } finally {
      setVehicleSaving(false);
    }
  }
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

  const chooseRoute = useCallback((nextRouteId: string) => {
    setRouteId(nextRouteId);
    setFare(String(fares.find((item) => item.routeId === nextRouteId)?.amount ?? ""));
    const selectedRoute = routes.find((item) => item.id === nextRouteId);
    if (selectedRoute) setCapacity(String(suggestedVehicleCapacity(selectedRoute.service)));
    setPickup("");
    setDropoff("");
    setFeedback("");
  }, [fares, routes]);

  useEffect(() => {
    function selectSavedRoute(event: Event) {
      const detail = (event as CustomEvent<{ routeId?: unknown; fare?: unknown }>).detail;
      if (typeof detail?.routeId === "string" && detail.routeId) {
        chooseRoute(detail.routeId);
        if (typeof detail.fare === "number") setFare(String(detail.fare));
      }
    }
    window.addEventListener("admin-route-saved", selectSavedRoute);
    return () => window.removeEventListener("admin-route-saved", selectSavedRoute);
  }, [chooseRoute]);


  function resetForm() {
    setEditingTripId(null);
    setRouteId("");
    setVehicleId("");
    setDate("");
    setOperatingDays([]);
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
    setVehicleId(trip.vehicleId ?? "");
    setDate(trip.date);
    setOperatingDays(trip.daysOfWeek ?? weekdaysForDate(trip.date));
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
    if (!vehicleId || !vehicles.some((item) => String(item.id) === vehicleId)) {
      setFeedback("Choose a vehicle from the fleet before scheduling this departure.");
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
        daysOfWeek: operatingDays.length ? operatingDays : weekdaysForDate(date),
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
          (originalTrip.daysOfWeek ?? []).join(",") !== (nextTrip.daysOfWeek ?? []).join(",") ||
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
        const departureStopId = await resolveStopId(
          nextTrip.pickup[0] ?? "",
          routeRecord.originStopId ?? routeRecord.stops?.[0]?.stopId ?? 0,
        );
        const payload = {
          routeId: Number(selectedRoute.id),
          vehicleId: Number(vehicleId),
          departureStopId,
          departureTime: departure,
          arrivalAt: arrival,
          fare: amount,
          daysOfWeek: nextTrip.daysOfWeek ?? weekdaysForDate(date),
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
    setRemovingScheduleId(trip.id);
    setFeedback("Removing scheduled trip…");
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
    } finally {
      setRemovingScheduleId(null);
    }
  }

  return (
    <div className="admin-section-content">
      <h3>{editingTripId ? "Edit a scheduled departure" : "Schedule a departure"}</h3>
      <DemoDataNotice show={tripsAreDemo} what="scheduled departures" />
      {tripsError && <p className="module-error" role="alert">{tripsError}</p>}
      {vehiclesError && (
        <div className="module-error" role="alert">
          <p>{vehiclesError}</p>
          <button type="button" className="secondary-button" onClick={() => void loadVehicles()} disabled={vehiclesLoading}>
            {vehiclesLoading ? "Retrying…" : "Retry loading fleet"}
          </button>
        </div>
      )}
      <p className="module-copy">Only departures scheduled here can be booked by passengers. Choose a future travel date.</p>
      {routesError && <p className="module-error" role="alert">Routes could not be loaded. <button type="button" className="text-action" onClick={reloadRoutes}>Retry</button></p>}
      {vehiclesLoading ? (
        <p className="module-empty">Loading fleet vehicles…</p>
      ) : vehicles.length === 0 && !vehiclesError ? (
        <div className="module-empty">
          <p className="admin-vehicle-empty-copy">Your fleet has no vehicles yet. Add one here, or manage the full fleet in Drivers &amp; fleet, before scheduling a departure.</p>
          <form className="module-form admin-data-form admin-vehicle-quick-add" onSubmit={addVehicleToFleet}>
            <label>Registration / plate
              <input value={newPlate} onChange={(event) => setNewPlate(event.target.value)} maxLength={30} required />
            </label>
            <label>Vehicle type
              <select value={newVehicleType} onChange={(event) => {
                const type = event.target.value;
                setNewVehicleType(type);
                setNewVehicleCapacity(String(suggestedVehicleCapacity(type)));
              }} required>
                <option value="Minibus">Minibus</option><option value="Bus">Bus</option><option value="Coach">Coach</option><option value="Shuttle">Shuttle</option>
              </select>
            </label>
            <label>Passenger seats (suggested)
              <input type="number" min="1" max="200" step="1" value={newVehicleCapacity} onChange={(event) => setNewVehicleCapacity(event.target.value)} required />
            </label>
            <p className="module-footnote">Capacity fills from vehicle type; adjust it to match the actual vehicle.</p>
            <button className="primary-button" type="submit" disabled={vehicleSaving}>
              {vehicleSaving ? "Adding vehicle…" : "Add vehicle to fleet"}
            </button>
          </form>
          {vehicleFeedback && <p className="module-feedback" role="status">{vehicleFeedback}</p>}
        </div>
      ) : (
        vehicleFeedback && <p className="module-feedback" role="status">{vehicleFeedback}</p>
      )}
      {routes.length === 0 ? (
        <p className="module-empty">Add a route and fare in Routes &amp; fares before scheduling a departure.</p>
      ) : (
        <form className="module-form admin-data-form" onSubmit={submitSchedule}>
          <label>Route
            <select value={routeId} onChange={(event) => chooseRoute(event.target.value)} required disabled={routesLoading || routes.length === 0}>
              <option value="">{routesLoading ? "Loading routes…" : routes.length === 0 ? "No routes available" : "Choose a starting town and destination"}</option>
              {routes.map((item) => <option key={item.id} value={item.id}>From {item.origin} to {item.destination}</option>)}
            </select>
          </label>
          <label>Vehicle
            <select value={vehicleId} onChange={(event) => {
              const nextId = event.target.value;
              setVehicleId(nextId);
              const selectedVehicle = vehicles.find((item) => String(item.id) === nextId);
              if (selectedVehicle) setCapacity(String(selectedVehicle.capacity));
            }} required disabled={vehiclesLoading || vehicles.length === 0}>
              <option value="">
                {vehiclesLoading
                  ? "Loading fleet vehicles…"
                  : vehicles.length === 0
                    ? "No fleet vehicles available"
                    : "Choose a fleet vehicle"}
              </option>
              {vehicles.map((item) => <option key={item.id} value={item.id}>{item.plateNumber} · {item.vehicleType} · {item.capacity} seats</option>)}
            </select>
          </label>
          <label>First departure date<input type="date" min={localDateValue()} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <fieldset className="admin-stop-picker">
            <legend>Weekly operating days</legend>
            <span className="module-copy">Select repeat days, or leave blank to repeat on the first departure date&apos;s weekday.</span>
            {(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as Weekday[]).map((day) => (
              <label key={day}><input type="checkbox" checked={operatingDays.includes(day)} onChange={(event) => setOperatingDays((current) => event.target.checked ? [...current, day] : current.filter((item) => item !== day))} />{day}</label>
            ))}
          </fieldset>
          <label>Departure time<input type="time" value={departure} onChange={(event) => setDeparture(event.target.value)} required /></label>
          <label>Arrival time<input type="time" value={arrival} onChange={(event) => setArrival(event.target.value)} required /></label>
          <label>Passenger seats<input type="number" min="1" max="200" step="1" value={capacity} readOnly required /></label>
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
          <button className="primary-button" type="submit" disabled={vehiclesLoading || vehicles.length === 0}>{editingTripId ? "Save departure" : "Add scheduled trip"}</button>
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
                  <button type="button" className="text-action danger-action" disabled={removingScheduleId !== null} onClick={() => void removeSchedule(trip)}>{removingScheduleId === trip.id ? "Removing…" : "Remove"}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

type BackendRoute = Awaited<ReturnType<typeof apiRoutes.listForAdmin>>[number];

type StopUsage = {
  endpointRoutes: { route: BackendRoute; endpoint: "origin" | "destination" }[];
  intermediateRoutes: { route: BackendRoute; stopIds: number[] }[];
  fares: Fare[];
  schedules: Schedule[];
  bookings: ApiBooking[];
};

function sameStopName(left: string | null | undefined, right: string | null | undefined): boolean {
  const first = (left ?? "").trim().toLowerCase();
  return first.length > 0 && first === (right ?? "").trim().toLowerCase();
}

/** Ordered stop names from the backend's formatted `routeStops` labels. */
function orderedRouteStopNames(route: BackendRoute): string[] {
  const names: string[] = [];
  for (const row of route.routeStops ?? []) {
    for (const value of Object.values(row)) {
      if (typeof value?.name === "string" && value.name.trim()) names.push(value.name.trim());
    }
  }
  return names;
}

function routeLabel(route: BackendRoute): string {
  const company = route.companyName?.trim();
  return company ? `${route.name} (${company})` : route.name;
}

/** Every admin booking, following the backend's 100-row pages. */
async function loadAllAdminBookings(): Promise<ApiBooking[]> {
  const pageSize = 100;
  const first = await apiBookings.listForAdminPage({ page: 1, pageSize });
  const rows = [...first.data];
  const pageCount = Math.max(1, Math.ceil(first.total / pageSize));
  for (let page = 2; page <= pageCount; page += 1) {
    const next = await apiBookings.listForAdminPage({ page, pageSize });
    rows.push(...next.data);
  }
  return rows;
}

/**
 * Finds every record that references a stop. Route endpoints cannot be detached,
 * schedule/booking links must be preserved, but intermediate route stops can be
 * removed from the route automatically.
 */
async function loadStopUsage(stop: StopItem, knownStops: StopItem[]): Promise<StopUsage> {
  const [routes, schedules, bookings] = await Promise.all([
    apiRoutes.listForAdmin(),
    apiSchedules.listForAdmin().catch(() => [] as Schedule[]),
    loadAllAdminBookings().catch(() => [] as ApiBooking[]),
  ]);
  const fareResults = await Promise.allSettled(
    routes.map((route) => apiRoutes.listFares(route.id)),
  );
  const fares = fareResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  const endpointRoutes: StopUsage["endpointRoutes"] = [];
  const intermediateRoutes: StopUsage["intermediateRoutes"] = [];

  for (const route of routes) {
    const names = orderedRouteStopNames(route);
    const originName = route.originStop?.name ?? names[0];
    const destinationName = route.destinationStop?.name ?? names[names.length - 1];

    if (sameStopName(originName, stop.name)) {
      endpointRoutes.push({ route, endpoint: "origin" });
      continue;
    }
    if (sameStopName(destinationName, stop.name)) {
      endpointRoutes.push({ route, endpoint: "destination" });
      continue;
    }
    if (!names.some((name) => sameStopName(name, stop.name))) continue;

    const ids = names.map((name) => {
      const matches = knownStops.filter((candidate) => sameStopName(candidate.name, name));
      return matches.length === 1 ? Number(matches[0].id) : null;
    });
    intermediateRoutes.push({
      route,
      stopIds: ids.filter((id): id is number => id !== null),
    });
  }

  return { endpointRoutes, intermediateRoutes, fares, schedules, bookings };
}

/**
 * The live backend rejects POST /routes/:id/stops (its DTO has no validators
 * and the global pipe forbids the property). Recreate the route without the
 * stop instead, carrying over its fares so passengers keep the same prices.
 */
async function rebuildRouteWithoutStop(
  route: BackendRoute,
  stopIds: number[],
  stopId: number,
  fares: Fare[],
): Promise<void> {
  const replacement = await apiRoutes.create({
    name: route.name,
    originStopId: stopIds[0],
    destinationStopId: stopIds[stopIds.length - 1],
    intermediateStopIds: stopIds.slice(1, -1),
    distance: route.distance ?? undefined,
    companyName: route.companyName ?? undefined,
    pickupLocation: route.pickupLocation ?? undefined,
    featured: route.featured ?? false,
  });

  if (route.isActive === false || route.active === false) {
    await apiRoutes.update(replacement.id, { isActive: false }).catch(() => undefined);
  }

  const keptFares = fares.filter(
    (fare) =>
      fare.routeId === route.id &&
      fare.originStopId !== stopId &&
      fare.destinationStopId !== stopId,
  );
  for (const fare of keptFares) {
    await apiFares.create(replacement.id, {
      originStopId: fare.originStopId,
      destinationStopId: fare.destinationStopId,
      amount: Number(fare.amount),
      currency: fare.currency,
    });
  }

  const result = await apiRoutes.remove(route.id);
  if (result && typeof result === "object" && "message" in result) {
    const detail = (result as { message?: unknown }).message;
    throw new Error(typeof detail === "string" ? detail : `${route.name} could not be replaced.`);
  }
}

function StopManagement() {
  const { data: stops, usingDemo: stopsAreDemo, reload: reloadStops, error: stopsError } = useBackendStops();
  const { data: routes } = useAdminBackendRoutes();
  const { data: trips } = useAdminTrips();
  const [routeId, setRouteId] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<StopKind>("pickup");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [stopNotice, setStopNotice] = useState<{
    stopId: string;
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const shownStops = stops.filter((stop) =>
    !normalizedQuery || `${stop.name} ${stop.city} ${stopKindLabel(stop.kind)}`.toLowerCase().includes(normalizedQuery),
  );

  function fillStopFromRoute(selectedRouteId: string, pointKind: StopKind) {
    const route = routes.find((item) => item.id === selectedRouteId);
    if (!route) return;
    const town = pointKind === "dropoff" ? route.destination : route.origin;
    const coords = Object.entries(TRANSPORT_TOWN_COORDINATES)
      .find(([location]) => location.toLowerCase() === town.toLowerCase())?.[1];
    const pointLabel = pointKind === "pickup" ? "Pickup" : pointKind === "dropoff" ? "Drop-off" : "Pickup & Drop-off";
    setCity(town);
    setName(`${town} ${pointLabel}`);
    setLat(coords ? String(coords.lat) : "");
    setLng(coords ? String(coords.lng) : "");
  }

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
      setRouteId("");
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

  async function hideStop(stop: StopItem, reason: string) {
    try {
      await apiStops.update(Number(stop.id), { isActive: false });
      reloadStops();
      setStopNotice({
        stopId: stop.id,
        tone: "success",
        message: `${stop.name} is now hidden from passenger pickup and drop-off lists. ${reason}`,
      });
      setFeedback(`${stop.name} was hidden instead of deleted, so its existing records stay valid.`);
    } catch (reasonError) {
      setStopNotice({
        stopId: stop.id,
        tone: "error",
        message:
          reasonError instanceof Error && reasonError.message
            ? reasonError.message
            : "The stop could not be hidden. Please try again.",
      });
    }
  }

  async function deleteStop(stop: StopItem) {
    if (busyStopId) return;
    setBusyStopId(stop.id);
    setStopNotice(null);
    setFeedback("");

    try {
      if (stopsAreDemo) {
        saveList(KEYS.stops, loadList<StopItem>(KEYS.stops, SEED_STOPS).filter((item) => item.id !== stop.id));
        reloadStops();
        setStopNotice({ stopId: stop.id, tone: "success", message: `${stop.name} removed.` });
        return;
      }

      const stopId = Number(stop.id);
      if (!Number.isSafeInteger(stopId)) throw new Error("This stop has an invalid backend id.");

      const usage = await loadStopUsage(stop, stops);
      const detachedRoutes = usage.intermediateRoutes.filter(
        ({ stopIds }) => stopIds.length >= 2 && stopIds.includes(stopId),
      );
      const fallbackRoutes = usage.intermediateRoutes.filter(
        ({ stopIds }) => stopIds.length < 2 || !stopIds.includes(stopId),
      );
      const routesToRemove = [
        ...usage.endpointRoutes.map(({ route }) => route),
        ...fallbackRoutes.map(({ route }) => route),
      ];
      const routeRemovalIds = new Set(routesToRemove.map((route) => route.id));
      const schedulesAtStop = usage.schedules.filter((schedule) => schedule.departureStopId === stopId);
      const blockedSchedules = usage.schedules.filter((schedule) => routeRemovalIds.has(schedule.routeId));
      const bookingsAtStop = usage.bookings.filter(
        (booking) => booking.originStopId === stopId || booking.destinationStopId === stopId,
      );
      const blockedScheduleIds = new Set(blockedSchedules.map((schedule) => schedule.id));
      const bookingsOnRemovedRoutes = usage.bookings.filter((booking) =>
        blockedScheduleIds.has(booking.scheduleId),
      );

      // Booking rows cannot be discarded: keep the stop and hide it instead.
      if (bookingsAtStop.length > 0 || bookingsOnRemovedRoutes.length > 0) {
        const parts = [
          bookingsAtStop.length > 0
            ? `${bookingsAtStop.length} booking${bookingsAtStop.length === 1 ? "" : "s"} start or end here`
            : "",
          bookingsOnRemovedRoutes.length > 0
            ? `${bookingsOnRemovedRoutes.length} booking${bookingsOnRemovedRoutes.length === 1 ? "" : "s"} use trips on a route that would have to be removed`
            : "",
        ].filter(Boolean);
        const confirmed = window.confirm(
          `${stop.name} cannot be deleted because ${parts.join(" and ")}. Booking history must be kept, so the stop can only be hidden. Hide it from passenger pickup and drop-off lists instead?`,
        );
        if (confirmed) await hideStop(stop, "Existing bookings still reference it.");
        else setStopNotice({ stopId: stop.id, tone: "info", message: "Deletion cancelled. The stop was not changed." });
        return;
      }

      // Schedules must be reassigned or removed before a stop can go.
      if (schedulesAtStop.length > 0 || blockedSchedules.length > 0) {
        const parts = [
          schedulesAtStop.length > 0
            ? `${schedulesAtStop.length} scheduled trip${schedulesAtStop.length === 1 ? "" : "s"} depart from it`
            : "",
          blockedSchedules.length > 0
            ? `${blockedSchedules.length} scheduled trip${blockedSchedules.length === 1 ? "" : "s"} still run on a route that would have to be removed`
            : "",
        ].filter(Boolean);
        const confirmed = window.confirm(
          `${stop.name} is still used by ${parts.join("; ")}. Delete or reassign those first. Hide the stop from passenger lists instead?`,
        );
        if (confirmed) await hideStop(stop, "Scheduled trips still reference it.");
        else setStopNotice({ stopId: stop.id, tone: "info", message: "Deletion cancelled. The stop was not changed." });
        return;
      }

      // Ask about route removal before touching anything, so declining the
      // prompt leaves every record unchanged.
      if (routesToRemove.length > 0) {
        const routeNames = routesToRemove.map(routeLabel).join(", ");
        const confirmed = window.confirm(
          `${stop.name} is part of ${routeNames}. A route cannot keep running without all of its stops, so removing this stop will also remove ${routesToRemove.length === 1 ? "that route" : "those routes"} and their fare estimates. Continue?`,
        );
        if (!confirmed) {
          setStopNotice({
            stopId: stop.id,
            tone: "info",
            message: "Deletion cancelled. The stop and its routes were not changed.",
          });
          return;
        }
      }

      // Intermediate stops can be detached. The live backend's route-stop
      // endpoint rejects its own payload, so fall back to rebuilding the route.
      // Run this before route removal so a guard failure changes nothing else.
      for (const { route, stopIds } of detachedRoutes) {
        const remaining = stopIds.filter((id) => id !== stopId);
        try {
          await apiRoutes.updateStops(route.id, remaining);
        } catch (error) {
          const routeHasSchedules = usage.schedules.some((schedule) => schedule.routeId === route.id);
          if (routeHasSchedules) {
            throw new Error(
              `Route ${routeLabel(route)} could not be updated without this stop, and it has scheduled trips, so it cannot be rebuilt safely. Remove its scheduled trips first.`,
            );
          }
          // Only rebuild when the backend rejected the payload itself. A
          // network/auth failure would make the replacement route pointless.
          const rejectedPayload =
            error instanceof ApiError &&
            (error.status === 400 || error.status === 404 || error.status === 500);
          if (!rejectedPayload) throw error;
          await rebuildRouteWithoutStop(route, remaining, stopId, usage.fares);
        }
      }

      // Routes that cannot keep running without this stop must be removed.
      for (const route of routesToRemove) {
        const routeFares = await apiRoutes.listFares(route.id).catch(() => [] as Fare[]);
        await Promise.allSettled(routeFares.map((fare) => apiFares.remove(fare.id)));
        const result = await apiRoutes.remove(route.id);
        if (result && typeof result === "object" && "message" in result) {
          const detail = (result as { message?: unknown }).message;
          throw new Error(typeof detail === "string" ? detail : `${route.name} could not be removed.`);
        }
      }

      const blockingFares = usage.fares.filter(
        (fare) => fare.originStopId === stopId || fare.destinationStopId === stopId,
      );
      await Promise.allSettled(blockingFares.map((fare) => apiFares.remove(fare.id)));

      await apiStops.remove(stopId);
      reloadStops();
      const removedRoutes = routesToRemove.length;
      setStopNotice({
        stopId: stop.id,
        tone: "success",
        message: `${stop.name} was removed${removedRoutes > 0 ? ` together with ${removedRoutes} route${removedRoutes === 1 ? "" : "s"}` : ""}. Other admin lists refresh when you open them.`,
      });
      setFeedback(`${stop.name} is no longer offered to passengers.`);
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "The stop could not be removed.";
      const confirmed = window.confirm(
        `${message}\n\n${stop.name} is probably still linked to routes, trips, or bookings. Hide it from passenger pickup and drop-off lists instead?`,
      );
      if (confirmed) await hideStop(stop, "Other records still reference it.");
      else setStopNotice({ stopId: stop.id, tone: "error", message });
    } finally {
      setBusyStopId(null);
    }
  }

  return (
    <div className="admin-section-content" id="admin-stop-management">
      <h3>{editingId ? "Edit pickup or drop-off point" : "Add a pickup or drop-off point"}</h3>
      <DemoDataNotice show={stopsAreDemo} what="stops" />
      {stopsError && <p className="module-error" role="alert">{stopsError}</p>}
      <form className="module-form admin-data-form" onSubmit={submitStop}>
        <label>Route
          <select value={routeId} onChange={(event) => {
            const nextRouteId = event.target.value;
            setRouteId(nextRouteId);
            fillStopFromRoute(nextRouteId, kind);
          }}>
            <option value="">Choose route to fill stop details</option>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.origin} → {route.destination}</option>)}
          </select>
        </label>
        <label>Stop name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label>Town<input list="malawi-stop-towns" value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} required /></label>
        <datalist id="malawi-stop-towns">{MALAWI_LOCATIONS.map((town) => <option key={town} value={town} />)}</datalist>
        <label>Point type<select value={kind} onChange={(event) => {
          const nextKind = event.target.value as StopKind;
          setKind(nextKind);
          fillStopFromRoute(routeId, nextKind);
        }}><option value="pickup">Pickup only</option><option value="dropoff">Drop-off only</option><option value="both">Pickup &amp; drop-off</option></select></label>
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
      {stopNotice && (
        <p className={`module-feedback ${stopNotice.tone}`} role={stopNotice.tone === "error" ? "alert" : "status"}>
          {stopNotice.message}
        </p>
      )}

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
                  {stopNotice?.stopId === stop.id && stopNotice.tone === "error" && (
                    <small className="admin-record-note error" role="alert">{stopNotice.message}</small>
                  )}
                </div>
                <div className="admin-record-actions">
                  <button type="button" className="text-action" onClick={() => editStop(stop)} disabled={busyStopId === stop.id}>Edit</button>
                  <button
                    type="button"
                    className="text-action danger-action"
                    disabled={busyStopId === stop.id}
                    onClick={() => { if (window.confirm(`Remove ${stop.name}?`)) deleteStop(stop); }}
                  >
                    {busyStopId === stop.id ? "Removing…" : "Remove"}
                  </button>
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
  const [updatingReference, setUpdatingReference] = useState<string | null>(null);
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
    if (updatingReference) return;
    if (status === "cancelled" && !window.confirm(`Cancel booking ${reference} for ${target.name}?`)) return;
    if (status === "cancelled" && target.travelDate < localDateValue()) {
      setError(`Booking ${reference} is for a past trip and cannot be cancelled.`);
      return;
    }

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
    setUpdatingReference(reference);
    setFeedback(status === "cancelled" ? `Cancelling booking ${reference}…` : `Updating booking ${reference}…`);
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
      setFeedback("");
      return;
    } finally {
      setUpdatingReference(null);
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
      <p className="module-copy">{bookings.length} total · {confirmedCount} confirmed · {cancelledCount} cancelled · {paidCount} paid · MWK {revenue.toLocaleString("en-MW")}</p>

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
                    <button type="button" className="text-action danger-action" disabled={updatingReference !== null} onClick={() => void setStatus(booking.reference, "cancelled")}>{updatingReference === booking.reference ? "Cancelling…" : "Cancel booking"}</button>
                  ) : (
                    <button type="button" className="text-action" disabled={updatingReference !== null} onClick={() => void setStatus(booking.reference, "confirmed")}>{updatingReference === booking.reference ? "Updating…" : "Re-confirm booking"}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportManagement() {
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
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
          report.reporterEmail,
        );
      } catch {
        // The report is saved; a blocked notification store must not undo it.
      }
      setFeedback(`Demo report ${report.id.toUpperCase()} updated. The browser-only demo notification feed was refreshed.`);
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
      <DemoDataNotice show what="customer reports and staff notes" />

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
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
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
      notifyCompanyUpdate(`Update for ${person.name}: ${text}`, "Passenger update", person.email);
      setMessage("");
      setMessaging(null);
      setFeedback(`Demo update saved for ${person.name} in this browser. It was not sent to the backend.`);
    } catch {
      setFeedback("The passenger update could not be saved. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>Passengers and booking contacts</h3>
      <DemoDataNotice show={bookingsAreDemo} what="passengers and bookings" />
      {bookingsError && <p className="module-error" role="alert">{bookingsError}</p>}
      <p className="module-copy">{registeredCount} registered · {guestCount} guest contacts</p>

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
                {person.registered && <span className="module-footnote" title="The backend has no account deletion endpoint yet">Account removal unavailable</span>}
              </div>
            </article>
          ))}
        </div>
      )}
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
      setFeedback("Demo announcement saved in this browser. It was not sent to the backend.");
    } catch {
      setError("The announcement could not be saved. Please try again.");
    }
  }

  return (
    <div className="admin-section-content">
      <h3>Company profile and announcements</h3>
      <DemoDataNotice show what="company profile settings and announcements" />

      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}

      <div className="admin-company-grid">
        <form className="module-form admin-data-form" onSubmit={saveProfile}>
          <h4>Company details</h4>
          <label>Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} minLength={2} maxLength={100} required /></label>
          <label>Company email<input type="email" value={email} readOnly aria-describedby="company-email-note" /></label>
          <p id="company-email-note" className="module-footnote">Admin sign-in email cannot be changed.</p>
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
          <p className="module-footnote">Announcements are demo-only and stored in this browser; the backend has no announcement endpoint.</p>
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
