"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  adminReservedSeatNumbers,
  fmtDate,
} from "@/lib/booking-data";
import { readAdminProfile, updateAdminCompanyName, useSession } from "@/lib/auth";
import AdminOperations from "@/components/AdminOperations";
import ListPagination from "@/components/ListPagination";
import { revealAdminEditor, useAdminFeedbackReveal } from "@/components/admin-reveal";
import { LIST_PAGE_SIZE, sortByLabel } from "@/lib/list-utils";
import { hasCoords, travelEstimate } from "@/lib/geo";
import { MALAWI_LOCATIONS, TRANSPORT_TOWN_COORDINATES } from "@/lib/malawi-locations";
import {
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
  | "routes"
  | "stops"
  | "schedules"
  | "bookings"
  | "passengers"
  | "operations"
  | "reports"
  | "company"
  | "management"; // Legacy deep links open "routes".

export const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "routes", label: "Routes & fares" },
  { id: "stops", label: "Stops" },
  { id: "schedules", label: "Schedules" },
  { id: "bookings", label: "Bookings" },
  { id: "passengers", label: "Passengers" },
  { id: "operations", label: "Fleet & access" },
  { id: "reports", label: "Reports" },
  { id: "company", label: "Company" },
];

export function isAdminSection(value: string | null): value is AdminSection {
  return value === "management" || ADMIN_SECTIONS.some((section) => section.id === value);
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

function formatMoment(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-MW");
}

function routeLabelForTrip(trip: Trip, routes: RouteItem[]) {
  return routes.find((route) => `${route.origin} → ${route.destination}`.toLowerCase() === trip.route.toLowerCase());
}

/** Compact, paginated table for large saved-record lists. */
function AdminDataTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string }[];
  rows: { key: string; cells: ReactNode[] }[];
  empty: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = LIST_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr><td className="admin-table-empty" colSpan={columns.length}>{empty}</td></tr>
            ) : visibleRows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => <td key={columns[index]?.key ?? index}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-table-footer">
        <ListPagination
          page={currentPage - 1}
          pageCount={pageCount}
          onPageChange={(nextPage) => setPage(nextPage + 1)}
          label="record"
        />
      </div>
    </>
  );
}

export default function AdminWorkspace({
  initialSection = "overview",
}: {
  initialSection?: AdminSection;
}) {
  const router = useRouter();
  const activeSection: AdminSection = initialSection === "management" ? "routes" : initialSection;
  const [section, setSection] = useState<AdminSection>(activeSection);

  useEffect(() => {
    const timer = window.setTimeout(() => setSection(activeSection), 0);
    return () => window.clearTimeout(timer);
  }, [activeSection]);

  function chooseSection(next: AdminSection) {
    setSection(next);
    router.replace(
      `${window.location.pathname}?panel=admin&section=${next}`,
      { scroll: false },
    );
  }

  return (
    <section className="admin-workspace" aria-label="Administration">
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
      {section === "stops" && <StopManagement />}
      {section === "schedules" && <TripScheduleManagement />}
      {section === "bookings" && <BookingManagement />}
      {section === "passengers" && <PassengerManagement />}
      {section === "operations" && <AdminOperations />}
      {section === "reports" && <ReportManagement />}
      {section === "company" && <CompanyProfileManagement />}
    </section>
  );
}

function OverviewPanel({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const { data: routes, error: routesError, loading: routesLoading } = useBackendRoutes();
  const { data: stops } = useBackendStops();
  const { data: trips, error: tripsError } = useAdminTrips();
  const { data: bookings, error: bookingsError } = useAdminBookings();
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
  const { data: accounts, error: usersError } = useAdminUsers();
  const today = localDateValue();

  const upcomingTrips = trips.filter((trip) => trip.date >= today);
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const openReports = reports.filter((report) => report.status === "open" || report.status === "reviewing");
  const stats: { id: AdminSection; label: string; value: string }[] = [
    { id: "routes", label: "Routes & stops", value: routesLoading ? "…" : `${routes.length} routes · ${stops.length} stops` },
    { id: "schedules", label: "Schedules", value: String(upcomingTrips.length) },
    { id: "bookings", label: "Confirmed bookings", value: String(confirmedBookings.length) },
    { id: "passengers", label: "Users", value: String(accounts.length) },
    { id: "reports", label: "Reports to review", value: String(openReports.length) },
  ];

  return (
    <div className="admin-section-content admin-overview-content">
      {(routesError || tripsError || bookingsError || usersError) && (
        <p className="module-error" role="alert">
          {routesError || tripsError || bookingsError || usersError}
        </p>
      )}

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
          </button>
        ))}
      </div>

    </div>
  );
}

function RouteFareManagement() {
  const { data: routes, usingDemo: routesAreDemo, reload: reloadRoutes, error: routesError } = useAdminBackendRoutes();
  const { data: fares, reload: reloadFares } = useBackendFares();
  const { reload: reloadStops } = useBackendStops();
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
  const [view, setView] = useState<"list" | "form">("list");
  const sectionRef = useRef<HTMLDivElement>(null);
  useAdminFeedbackReveal(feedback, "admin-route-feedback");
  const normalizedQuery = query.trim().toLowerCase();
  const shownRoutes = sortByLabel(
    routes.filter((route) =>
      !normalizedQuery ||
      `${route.origin} ${route.destination} ${route.service}`.toLowerCase().includes(normalizedQuery),
    ),
    (route) => `${route.origin} → ${route.destination}`,
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
    const routeHasTrips = Boolean(existingRoute && trips.some((trip) =>
      trip.route.toLocaleLowerCase() === `${existingRoute.origin} → ${existingRoute.destination}`.toLocaleLowerCase(),
    ));
    if (
      routeHasTrips &&
      (existingRoute?.origin.toLocaleLowerCase() !== normalizedOrigin.toLocaleLowerCase() ||
        existingRoute?.destination.toLocaleLowerCase() !== normalizedDestination.toLocaleLowerCase())
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
        const currentStops = await apiStops.listAll();
        const stopIds = await ensureRouteStops(normalizedOrigin, normalizedDestination, currentStops);
        const selectedIntermediateStops = intermediateStopIds.map(Number);
        let routeId: number;

        if (editingId) {
          routeId = await saveEditedRoute({
            routeId: Number(editingId),
            origin: normalizedOrigin,
            destination: normalizedDestination,
            originStopId: stopIds.originStopId,
            destinationStopId: stopIds.destinationStopId,
            intermediateStopIds: selectedIntermediateStops,
            service,
            featured,
            pickupLocation: pickupLocation.trim() || undefined,
            distance,
            amount,
            hasTrips: routeHasTrips,
            stops: currentStops,
          });
        } else {
          const created = await apiRoutes.create({
            name: `${normalizedOrigin} → ${normalizedDestination}`,
            ...stopIds,
            intermediateStopIds: selectedIntermediateStops,
            companyName: service.trim(),
            featured,
            pickupLocation: pickupLocation.trim() || undefined,
            distance,
          });
          routeId = created.id;
        }
        savedRouteId = String(routeId);
        reloadRoutes();
        reloadFares();
        reloadStops();
      }

      if (savedRouteId) window.dispatchEvent(new CustomEvent("admin-route-saved", { detail: { routeId: savedRouteId, fare: amount } }));

      try {
        notifyRouteUpdate(
          `${editingId ? "Route and fare updated" : "New route and fare added"}: ${normalizedOrigin} → ${normalizedDestination}${service.trim() ? ` (${service.trim()})` : ""} · MWK ${amount.toLocaleString("en-MW")}. Passengers can now search this journey.`,
          savedRouteId || `${normalizedOrigin}-${normalizedDestination}`,
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
      setView("list");
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

  async function editRoute(route: RouteItem) {
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
    setView("form");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));

    // The formatted admin route lists intermediate stops by name, so map them
    // back to ids for the checkbox selection before the admin saves changes.
    try {
      const [backendRoute, allStops, routeFares] = await Promise.all([
        apiRoutes.get(Number(route.id)),
        apiStops.listAll(),
        apiRoutes.listFares(Number(route.id)),
      ]);
      const intermediateNames = orderedRouteStopNames(backendRoute).slice(1, -1);
      const ids = intermediateNames
        .map((name) => allStops.find((stop) => sameStopName(stop.name, name))?.id)
        .filter((id): id is number => typeof id === "number");
      setIntermediateStopIds(ids.map(String));
      const fullRouteFare = routeFareForEndpoints(routeFares, backendRoute);
      if (fullRouteFare) setFare(String(fullRouteFare.amount));
    } catch {
      // Keep the visible selection; submitRoute validates the stops again.
    }
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

  function startAddRoute() {
    setEditingId(null);
    setOrigin("");
    setDestination("");
    setService("Minibus");
    setFeatured(false);
    setPickupLocation("");
    setDistanceKm("");
    setIntermediateStopIds([]);
    setFare("");
    setFeedback("");
    setView("form");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));
  }

  return view === "list" ? (
    <div className="admin-section-content">
      <div className="admin-list-heading">
        <div>
          <h3>Saved routes and fares</h3>
        </div>
        <button className="primary-button" type="button" onClick={startAddRoute}>Add route</button>
      </div>
      {routesError && <p className="module-error" role="alert">{routesError}</p>}
      {feedback && <p id="admin-route-feedback" className="module-feedback" role="status">{feedback}</p>}
      <AdminDataTable
        key={`routes-${query}`}
        columns={[
          { key: "route", label: "Route" },
          { key: "service", label: "Service" },
          { key: "fare", label: "Fare" },
          { key: "distance", label: "Distance" },
          { key: "pickup", label: "Primary pickup" },
          { key: "availability", label: "Availability" },
          { key: "featured", label: "Featured" },
          { key: "departures", label: "Departures" },
          { key: "actions", label: "Actions" },
        ]}
        rows={shownRoutes.map((route) => {
          const routeFare = fares.find((item) => item.routeId === route.id);
          const scheduled = trips.filter((trip) => trip.route.toLowerCase() === `${route.origin} → ${route.destination}`.toLowerCase()).length;
          return {
            key: route.id,
            cells: [
              <strong key="route">{route.origin} → {route.destination}</strong>,
              route.service,
              routeFare ? `MWK ${routeFare.amount.toLocaleString("en-MW")}` : "Not set",
              route.distance ? `${(route.distance / 1000).toLocaleString("en-MW")} km` : "—",
              route.pickupLocation || "—",
              route.isActive === false ? "Hidden" : "Available",
              route.featured ? "Yes" : "No",
              String(scheduled),
              <div className="admin-table-actions" key="actions">
                <button type="button" className="text-action" onClick={() => void editRoute(route)}>Edit</button>
                <button type="button" className="text-action danger-action" onClick={() => { if (window.confirm(`Remove ${route.origin} to ${route.destination}?`)) void deleteRoute(route.id); }}>Remove</button>
              </div>,
            ],
          };
        })}
        empty="No routes match this search."
      />
    </div>
  ) : (
    <div className="admin-section-content" ref={sectionRef}>
      <div className="admin-list-heading">
        <button className="secondary-button" type="button" onClick={() => { setView("list"); setFeedback(""); }}>Back to routes</button>
      </div>
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
        <label className="admin-feature-route"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Feature this route on the home page</label>
        <label>Primary pickup location<input value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} maxLength={120} /></label>
        <label>Approx. route distance (km)<input type="number" min="0.1" step="0.1" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} /></label>
        <label>Estimated fare (MWK)<input type="number" min="1" step="1" value={fare} onChange={(event) => setFare(event.target.value)} required /></label>
        <button className="primary-button" type="submit" disabled={isSavingRoute}>{isSavingRoute ? "Saving route…" : editingId ? "Save changes" : "Save route"}</button>
        {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setOrigin(""); setDestination(""); setFare(""); setFeedback(""); setView("list"); }}>Cancel</button>}
        {feedback && <p id="admin-route-feedback" className="module-feedback" role={isSavingRoute ? "status" : "alert"}>{feedback}</p>}
      </form>

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
  const [feedback, setFeedback] = useState("");
  const [removingScheduleId, setRemovingScheduleId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const sectionRef = useRef<HTMLDivElement>(null);
  useAdminFeedbackReveal(feedback, "admin-schedule-feedback");
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
  const shownTrips = sortByLabel(
    trips,
    (trip) => `${trip.route} ${trip.date} ${trip.departure}`,
  );

  const chooseRoute = useCallback((nextRouteId: string) => {
    setRouteId(nextRouteId);
    setFare(String(fares.find((item) => item.routeId === nextRouteId)?.amount ?? ""));
    const selectedRoute = routes.find((item) => item.id === nextRouteId);
    if (selectedRoute) {
      setCapacity(String(suggestedVehicleCapacity(selectedRoute.service)));
      const nextPickups = stops.filter((stop) =>
        stop.city.toLowerCase() === selectedRoute.origin.toLowerCase() && (stop.kind === "pickup" || stop.kind === "both"),
      );
      const nextDropoffs = stops.filter((stop) =>
        stop.city.toLowerCase() === selectedRoute.destination.toLowerCase() && (stop.kind === "dropoff" || stop.kind === "both"),
      );
      setPickup(nextPickups[0]?.name ?? selectedRoute.pickupLocation ?? selectedRoute.origin);
      setDropoff(nextDropoffs[0]?.name ?? selectedRoute.destination);
    } else {
      setPickup("");
      setDropoff("");
    }
    setFeedback("");
  }, [fares, routes, stops]);

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
    setView("form");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));
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
      setView("list");
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

  function startAddSchedule() {
    resetForm();
    setFeedback("");
    setView("form");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));
  }

  return view === "list" ? (
    <div className="admin-section-content">
      <div className="admin-list-heading">
        <div>
          <h3>Saved schedules</h3>
        </div>
        <button className="primary-button" type="button" onClick={startAddSchedule}>Add schedule</button>
      </div>
      {tripsError && <p className="module-error" role="alert">{tripsError}</p>}
      {feedback && <p id="admin-schedule-feedback" className="module-feedback" role="status">{feedback}</p>}
      <AdminDataTable
        key="schedules"
        columns={[
          { key: "route", label: "Route" },
          { key: "date", label: "Date" },
          { key: "time", label: "Departure – arrival" },
          { key: "days", label: "Operating days" },
          { key: "vehicle", label: "Vehicle" },
          { key: "fare", label: "Fare" },
          { key: "stops", label: "Boarding → drop-off" },
          { key: "actions", label: "Actions" },
        ]}
        rows={shownTrips.map((trip) => {
          const vehicle = vehicles.find((item) => String(item.id) === trip.vehicleId);
          return {
            key: trip.id,
            cells: [
              <strong key="route">{trip.route}</strong>,
              fmtDate(trip.date),
              `${trip.departure}–${trip.arrival}`,
              (trip.daysOfWeek ?? []).join(", ") || "First date only",
              vehicle ? `${vehicle.plateNumber} · ${vehicle.vehicleType}` : "Not recorded",
              `MWK ${trip.fare.toLocaleString("en-MW")}`,
              `${trip.pickup.join(", ")} → ${trip.dropoff.join(", ")}`,
              <div className="admin-table-actions" key="actions">
                <button type="button" className="text-action" onClick={() => startEdit(trip)}>Edit</button>
                <button type="button" className="text-action danger-action" disabled={removingScheduleId !== null} onClick={() => void removeSchedule(trip)}>{removingScheduleId === trip.id ? "Removing…" : "Remove"}</button>
              </div>,
            ],
          };
        })}
        empty="No scheduled trips available."
      />
    </div>
  ) : (
    <div className="admin-section-content" ref={sectionRef}>
      <div className="admin-list-heading">
        <button className="secondary-button" type="button" onClick={() => { resetForm(); setFeedback(""); setView("list"); }}>Back to schedules</button>
      </div>
      {tripsError && <p className="module-error" role="alert">{tripsError}</p>}
      {vehiclesError && (
        <div className="module-error" role="alert">
          <p>{vehiclesError}</p>
          <button type="button" className="secondary-button" onClick={() => void loadVehicles()} disabled={vehiclesLoading}>
            {vehiclesLoading ? "Retrying…" : "Retry loading fleet"}
          </button>
        </div>
      )}
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
          {editingTripId && <button className="secondary-button" type="button" onClick={() => { resetForm(); setFeedback(""); setView("list"); }}>Cancel</button>}
        </form>
      )}
      {feedback && <p id="admin-schedule-feedback" className="module-feedback" role="status">{feedback}</p>}

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

  try {
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
  } catch (error) {
    await apiRoutes.remove(replacement.id).catch(() => undefined);
    throw error;
  }
}

type RouteEditInput = {
  routeId: number;
  origin: string;
  destination: string;
  originStopId: number;
  destinationStopId: number;
  intermediateStopIds: number[];
  service: string;
  featured: boolean;
  pickupLocation?: string;
  distance?: number;
  amount: number;
  hasTrips: boolean;
  stops: Array<{ id: number; name: string }>;
};

function routeFareForEndpoints(fares: Fare[], route: BackendRoute): Fare | undefined {
  return fares.find((fare) =>
    fare.originStopId === route.originStop?.id &&
    fare.destinationStopId === route.destinationStop?.id,
  ) ?? fares[0];
}

function remapFareForRoute(
  fare: Fare,
  route: BackendRoute,
  input: RouteEditInput,
  stopOrder: number[],
): { originStopId: number; destinationStopId: number } | null {
  const positions = new Map(stopOrder.map((id, index) => [id, index]));
  const mapStop = (id: number) => {
    if (id === route.originStop?.id) return input.originStopId;
    if (id === route.destinationStop?.id) return input.destinationStopId;
    return id;
  };
  const originStopId = mapStop(fare.originStopId);
  const destinationStopId = mapStop(fare.destinationStopId);
  const originIndex = positions.get(originStopId);
  const destinationIndex = positions.get(destinationStopId);
  if (originIndex === undefined || destinationIndex === undefined || originIndex >= destinationIndex) {
    return null;
  }
  return { originStopId, destinationStopId };
}

/**
 * Saves an existing route without calling the backend's broken stop endpoint.
 * Mutable fields and the fare use validated PATCH calls. Stop changes recreate
 * the route (the only supported backend operation), migrating its fares first.
 */
async function saveEditedRoute(input: RouteEditInput): Promise<number> {
  const currentRoute = await apiRoutes.get(input.routeId);
  const currentNames = orderedRouteStopNames(currentRoute);
  const selectedNames = [
    input.origin,
    ...input.intermediateStopIds.map((id) =>
      input.stops.find((stop) => stop.id === id)?.name ?? String(id),
    ),
    input.destination,
  ];
  const stopsChanged =
    currentRoute.originStop?.id !== input.originStopId ||
    currentRoute.destinationStop?.id !== input.destinationStopId ||
    currentNames.length !== selectedNames.length ||
    currentNames.some((name, index) => !sameStopName(name, selectedNames[index]));

  if (stopsChanged && input.hasTrips) {
    throw new Error("Remove this route's scheduled trips before changing its stops.");
  }

  const existingFares = await apiRoutes.listFares(input.routeId);
  const fareToEdit = routeFareForEndpoints(existingFares, currentRoute);
  const routeFields = {
    name: `${input.origin} → ${input.destination}`,
    companyName: input.service.trim(),
    featured: input.featured,
    pickupLocation: input.pickupLocation,
    distance: input.distance,
  };

  if (!stopsChanged) {
    await apiRoutes.update(input.routeId, routeFields);
    if (fareToEdit) {
      await apiFares.update(fareToEdit.id, { amount: input.amount });
    } else {
      await apiFares.create(input.routeId, {
        originStopId: input.originStopId,
        destinationStopId: input.destinationStopId,
        amount: input.amount,
      });
    }
    return input.routeId;
  }

  const stopOrder = [input.originStopId, ...input.intermediateStopIds, input.destinationStopId];
  let replacementId: number | null = null;
  try {
    const replacement = await apiRoutes.create({
      name: routeFields.name,
      originStopId: input.originStopId,
      destinationStopId: input.destinationStopId,
      intermediateStopIds: input.intermediateStopIds,
      companyName: routeFields.companyName,
      featured: routeFields.featured,
      pickupLocation: routeFields.pickupLocation,
      distance: routeFields.distance,
    });
    replacementId = replacement.id;

    if (currentRoute.isActive === false || currentRoute.active === false) {
      await apiRoutes.update(replacement.id, { isActive: false }).catch(() => undefined);
    }

    const createdFareKeys = new Set<string>();
    let editedFareMoved = false;
    for (const fare of existingFares) {
      const endpoints = remapFareForRoute(fare, currentRoute, input, stopOrder);
      if (!endpoints) continue;
      const key = `${endpoints.originStopId}:${endpoints.destinationStopId}`;
      if (createdFareKeys.has(key)) continue;
      const isEditedFare = fare.id === fareToEdit?.id;
      await apiFares.create(replacement.id, {
        ...endpoints,
        amount: isEditedFare ? input.amount : Number(fare.amount),
        currency: fare.currency,
      });
      createdFareKeys.add(key);
      if (isEditedFare) editedFareMoved = true;
    }
    if (!editedFareMoved) {
      await apiFares.create(replacement.id, {
        originStopId: input.originStopId,
        destinationStopId: input.destinationStopId,
        amount: input.amount,
      });
    }

    const removal = await apiRoutes.remove(input.routeId);
    if (removal && typeof removal === "object" && ("message" in removal || ("deleted" in removal && removal.deleted !== true))) {
      await apiRoutes.remove(replacement.id).catch(() => undefined);
      replacementId = null;
      throw new Error("Remove this route's scheduled trips before changing its stops.");
    }
    return replacement.id;
  } catch (error) {
    if (replacementId !== null) {
      await apiRoutes.remove(replacementId).catch(() => undefined);
    }
    throw error;
  }
}

function StopManagement() {
  const { data: stops, usingDemo: stopsAreDemo, reload: reloadStops, error: stopsError } = useBackendStops();
  const { data: routes } = useAdminBackendRoutes();
  const { data: trips } = useAdminTrips();
  const [routeId, setRouteId] = useState("");
  const [startTown, setStartTown] = useState("");
  const [endTown, setEndTown] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<StopKind>("pickup");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [stopNotice, setStopNotice] = useState<{
    stopId: string;
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const sectionRef = useRef<HTMLDivElement>(null);
  useAdminFeedbackReveal(feedback, "admin-stop-feedback");
  const shownStops = sortByLabel(
    stops,
    (stop) => `${stop.name} ${stop.city}`,
  );

  function fillStopFromTowns(nextStart: string, nextEnd: string, pointKind: StopKind) {
    const start = nextStart.trim();
    const end = nextEnd.trim();
    if (!start && !end) return;

    const matchingRoute = routes.find((route) =>
      (!start || route.origin.toLowerCase() === start.toLowerCase()) &&
      (!end || route.destination.toLowerCase() === end.toLowerCase()),
    );
    setRouteId(matchingRoute?.id ?? "");

    const town = pointKind === "dropoff"
      ? end || matchingRoute?.destination || ""
      : start || matchingRoute?.origin || "";
    if (!town) return;

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
      setStartTown("");
      setEndTown("");
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
      setView("list");
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
    setStartTown("");
    setEndTown("");
    setKind(stop.kind);
    setLat(stop.lat?.toString() ?? "");
    setLng(stop.lng?.toString() ?? "");
    setFeedback("");
    setView("form");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));
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

      // Intermediate stops can be detached by rebuilding the route. The
      // backend's route-stop endpoint rejects its own payload, so rebuilding
      // is the only working operation. Guard schedules before changing anything.
      for (const { route, stopIds } of detachedRoutes) {
        const routeHasSchedules = usage.schedules.some((schedule) => schedule.routeId === route.id);
        if (routeHasSchedules) {
          throw new Error(
            `Route ${routeLabel(route)} could not be updated without this stop, and it has scheduled trips, so it cannot be rebuilt safely. Remove its scheduled trips first.`,
          );
        }
        await rebuildRouteWithoutStop(route, stopIds.filter((id) => id !== stopId), stopId, usage.fares);
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

  function startAddStop() {
    setEditingId(null);
    setName("");
    setCity("");
    setRouteId("");
    setStartTown("");
    setEndTown("");
    setKind("pickup");
    setLat("");
    setLng("");
    setFeedback("");
    setStopNotice(null);
    setView("form");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));
  }

  return view === "list" ? (
    <div className="admin-section-content" id="admin-stop-management">
      <div className="admin-list-heading">
        <div>
          <h3>Saved pickup and drop-off points</h3>
        </div>
        <button className="primary-button" type="button" onClick={startAddStop}>Add stop</button>
      </div>
      {stopsError && <p className="module-error" role="alert">{stopsError}</p>}
      {feedback && <p id="admin-stop-feedback" className="module-feedback" role="status">{feedback}</p>}
      {stopNotice && (
        <p className={`module-feedback ${stopNotice.tone}`} role={stopNotice.tone === "error" ? "alert" : "status"}>
          {stopNotice.message}
        </p>
      )}
      <AdminDataTable
        key="stops"
        columns={[
          { key: "name", label: "Stop" },
          { key: "town", label: "Town" },
          { key: "type", label: "Point type" },
          { key: "coords", label: "Coordinates" },
          { key: "usage", label: "Used by" },
          { key: "actions", label: "Actions" },
        ]}
        rows={shownStops.map((stop) => {
          const linkedTrips = tripsUsing(stop.name);
          return {
            key: stop.id,
            cells: [
              <strong key="name">{stop.name}</strong>,
              stop.city,
              stopKindLabel(stop.kind),
              hasCoords(stop) ? `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}` : "No map coordinates",
              linkedTrips.length > 0 ? `${linkedTrips.length} scheduled trip${linkedTrips.length === 1 ? "" : "s"}` : "Not used yet",
              <div className="admin-table-actions" key="actions">
                <button type="button" className="text-action" onClick={() => editStop(stop)} disabled={busyStopId === stop.id}>Edit</button>
                <button type="button" className="text-action danger-action" disabled={busyStopId === stop.id} onClick={() => { if (window.confirm(`Remove ${stop.name}?`)) void deleteStop(stop); }}>
                  {busyStopId === stop.id ? "Removing…" : "Remove"}
                </button>
                {stopNotice?.stopId === stop.id && stopNotice.tone === "error" && (
                  <small className="admin-record-note error" role="alert">{stopNotice.message}</small>
                )}
              </div>,
            ],
          };
        })}
        empty="No stops available."
      />
    </div>
  ) : (
    <div className="admin-section-content" id="admin-stop-management" ref={sectionRef}>
      <div className="admin-list-heading">
        <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setFeedback(""); setView("list"); }}>Back to stops</button>
      </div>
      {stopsError && <p className="module-error" role="alert">{stopsError}</p>}
      <form className="module-form admin-data-form" onSubmit={submitStop}>
        <label>Starting town<input list="malawi-stop-towns" value={startTown} onChange={(event) => {
          const value = event.target.value;
          setStartTown(value);
          fillStopFromTowns(value, endTown, kind);
        }} maxLength={60} /></label>
        <label>Destination town<input list="malawi-stop-towns" value={endTown} onChange={(event) => {
          const value = event.target.value;
          setEndTown(value);
          fillStopFromTowns(startTown, value, kind);
        }} maxLength={60} /></label>
        <datalist id="malawi-stop-towns">{MALAWI_LOCATIONS.map((town) => <option key={town} value={town} />)}</datalist>
        <label>Stop name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <label>Town<input list="malawi-stop-towns" value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} required /></label>
        <label>Point type<select value={kind} onChange={(event) => {
          const nextKind = event.target.value as StopKind;
          setKind(nextKind);
          fillStopFromTowns(startTown, endTown, nextKind);
        }}><option value="pickup">Pickup only</option><option value="dropoff">Drop-off only</option><option value="both">Pickup &amp; drop-off</option></select></label>
        <label>Latitude <span className="optional-label">Optional</span><input type="number" min="-90" max="90" step="any" value={lat} onChange={(event) => setLat(event.target.value)} /></label>
        <label>Longitude <span className="optional-label">Optional</span><input type="number" min="-180" max="180" step="any" value={lng} onChange={(event) => setLng(event.target.value)} /></label>
        <button className="primary-button" type="submit">{editingId ? "Save changes" : "Add stop"}</button>
        {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setName(""); setCity(""); setStartTown(""); setEndTown(""); setLat(""); setLng(""); setFeedback(""); setView("list"); }}>Cancel</button>}
      </form>
      {feedback && <p id="admin-stop-feedback" className="module-feedback" role="status">{feedback}</p>}

      {stopNotice && (
        <p className={`module-feedback ${stopNotice.tone}`} role={stopNotice.tone === "error" ? "alert" : "status"}>
          {stopNotice.message}
        </p>
      )}

    </div>
  );
}

function BookingManagement() {
  const { data: bookings, error: bookingsError } = useAdminBookings();
  const { data: trips } = useAdminTrips();
  const shown = sortByLabel(bookings, (booking) => `${booking.name} ${booking.route}`);

  return (
    <div className="admin-section-content">
      <h3>Bookings</h3>
      {bookingsError && <p className="module-error" role="alert">{bookingsError}</p>}
      <AdminDataTable
        key="bookings"
        columns={[
          { key: "reference", label: "Reference" },
          { key: "route", label: "Route" },
          { key: "travelDate", label: "Travel date" },
        ]}
        rows={shown.map((booking) => {
          const trip = trips.find((item) => item.id === booking.tripId);
          return {
            key: booking.reference,
            cells: [
              <strong key="reference">{booking.reference}</strong>,
              <span key="route">
                {booking.route}
                <small>{trip ? `${trip.departure}–${trip.arrival}` : `${booking.pickup} → ${booking.dropoff}`}</small>
              </span>,
              fmtDate(booking.travelDate),
            ],
          };
        })}
        empty="No bookings available."
      />
    </div>
  );
}

function ReportManagement() {
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
  const [feedback, setFeedback] = useState("");
  useAdminFeedbackReveal(feedback, "admin-report-feedback");

  const shown = sortByLabel(reports, (report) => `${report.type} ${report.itemName}`);

  function updateReport(report: ReportItem, status: ReportStatus) {
    try {
      const nextReport = { ...report, status };
      saveList(
        KEYS.reports,
        loadList<ReportItem>(KEYS.reports, MOCK_REPORTS).map((item) => item.id === report.id ? nextReport : item),
      );
      try {
        notifyReportUpdate(
          `Report ${report.id.toUpperCase()} (${report.type}: ${report.itemName}) is now ${REPORT_STATUS_LABELS[status].toLowerCase()}.`,
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

  return (
    <div className="admin-section-content">
      {feedback && <p id="admin-report-feedback" className="module-feedback" role="status">{feedback}</p>}
      <AdminDataTable
        key="reports"
        columns={[
          { key: "type", label: "Type" },
          { key: "item", label: "Report" },
          { key: "reporter", label: "Reporter" },
          { key: "submitted", label: "Submitted" },
          { key: "status", label: "Status" },
        ]}
        rows={shown.map((report) => ({
          key: report.id,
          cells: [
            report.type,
            <span key="item"><strong>{report.itemName}</strong><small>{report.description}</small></span>,
            <span key="reporter">
              {report.reporterName || "Guest reporter"}
              <small>{report.reporterEmail || report.location || "No contact provided"}</small>
            </span>,
            formatMoment(report.createdAt),
            <div className="status-control" key="status">
              <select
                aria-label={`Status for ${report.itemName}`}
                value={report.status}
                onChange={(event) => updateReport(report, event.target.value as ReportStatus)}
              >
                <option value="open">Open</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>,
          ],
        }))}
        empty="No reports available."
      />
    </div>
  );
}

type PassengerRow = {
  key: string;
  name: string;
  email: string;
  registered: boolean;
};

function PassengerManagement() {
  const { data: accounts } = useAdminUsers();
  const { data: bookings, error: bookingsError } = useAdminBookings();
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);

  const people = useMemo(() => {
    const map = new Map<string, PassengerRow>();
    const ensure = (name: string, email: string, registered: boolean) => {
      const key = email.trim().toLowerCase();
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        if (!existing.name && name) existing.name = name;
        existing.registered = existing.registered || registered;
        return;
      }
      map.set(key, { key, name: name.trim() || key, email: key, registered });
    };

    for (const account of accounts) ensure(account.fullName, account.email ?? "", true);
    for (const booking of bookings) ensure(booking.name, booking.email, false);
    for (const report of reports) {
      if (report.reporterEmail) ensure(report.reporterName ?? "", report.reporterEmail, false);
    }

    return [...map.values()].sort((first, second) => first.name.localeCompare(second.name));
  }, [accounts, bookings, reports]);

  const shown = sortByLabel(people, (person) => person.name);

  return (
    <div className="admin-section-content">
      <h3>Passengers</h3>
      {bookingsError && <p className="module-error" role="alert">{bookingsError}</p>}
      <AdminDataTable
        key="passengers"
        columns={[
          { key: "name", label: "Passenger" },
          { key: "email", label: "Email" },
          { key: "type", label: "Type" },
        ]}
        rows={shown.map((person) => ({
          key: person.key,
          cells: [
            <strong key="name">{person.name}</strong>,
            person.email,
            <span className={`admin-tag ${person.registered ? "is-registered" : "is-muted"}`} key="type">
              {person.registered ? "Registered" : "Guest"}
            </span>,
          ],
        }))}
        empty="No passengers available."
      />
    </div>
  );
}

function CompanyProfileManagement() {
  const session = useSession();
  const [companyName, setCompanyName] = useState("SBUS");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useAdminFeedbackReveal(feedback, "admin-company-feedback");

  useEffect(() => {
    if (!session?.email) return;
    const timer = window.setTimeout(() => {
      const profile = readAdminProfile(session.email);
      setEmail(profile?.email ?? session.email);
      setCompanyName(profile?.companyName || "SBUS");
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

  return (
    <div className="admin-section-content">
      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p id="admin-company-feedback" className="module-feedback" role="status">{feedback}</p>}
      <form className="module-form admin-data-form" onSubmit={saveProfile}>
        <label>Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} minLength={2} maxLength={100} required /></label>
        <label>Company email<input type="email" value={email} readOnly /></label>
        <button className="primary-button" type="submit">Save company profile</button>
      </form>
    </div>
  );
}
