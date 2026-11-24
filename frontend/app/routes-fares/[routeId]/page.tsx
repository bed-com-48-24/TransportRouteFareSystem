"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ListPagination from "@/components/ListPagination";
import { usePagedItems } from "@/components/usePagedItems";
import { KEYS, SEED_FARES, SEED_ROUTES } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { FareItem, RouteItem, Trip } from "@/lib/types";
import { TRIPS, fmtDate } from "@/lib/booking-data";

export default function RouteDetailsPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);
  const schedules = useStoredList<Trip>(KEYS.schedules, TRIPS);
  const route = routes.find((item) => item.id === routeId && item.active !== false);
  const fare = route ? fares.find((item) => item.routeId === route.id) : undefined;
  const departures = route
    ? schedules.filter((item) => item.route === `${route.origin} → ${route.destination}`)
      .sort((a, b) => a.date.localeCompare(b.date) || a.departure.localeCompare(b.departure))
    : [];
  const departurePages = usePagedItems(departures, (trip) => `${trip.date} ${trip.departure}`);

  if (!route) {
    return <main className="module-shell"><h1>Route not found</h1><p>This route is not available in the sample data.</p><Link href="/routes-fares">Back to routes</Link></main>;
  }

  const stops = route.stops?.length ? route.stops : [route.origin, route.destination];
  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">{route.companyName ?? "SBUS"} · ROUTE DETAILS</p>
        <h1>{route.name ?? `${route.origin} - ${route.destination}`}</h1>
        <p>{route.service} · {route.transfers ?? 0} transfer(s){route.featured ? " · Featured route" : ""}</p>
        <div className="module-shortcuts"><Link href="/routes-fares">← Route search</Link><Link href="/transport-booking">Browse trips</Link></div>
      </header>
      <section className="module-section">
        <div className="module-card-grid">
          <article className="trip-choice"><h2>Ordered stops</h2><ol>{stops.map((stop, index) => <li key={`${stop}-${index}`}>{index + 1}. {stop}</li>)}</ol></article>
          <article className="trip-choice"><h2>Fare information</h2><p>{fare ? `MWK ${fare.amount.toLocaleString("en-MW")}` : "Fare estimate unavailable"}</p><p>{route.fareIsEstimate === false ? "Published reference fare" : "Sample estimate only"}</p><p>Pickup: {route.pickupLocation ?? route.origin}</p></article>
          <article className="trip-choice"><h2>Route information</h2><p>Duration: {route.duration ? `${route.duration} minutes` : "Not provided"}</p><p>Map distance: {route.mapDistance ? `${route.mapDistance} km` : "Not provided"}</p><p>Departures: {route.departureTimes?.join(", ") || "See schedules"}</p></article>
        </div>
      </section>
      <section className="module-section">
        <h2>Sample departures</h2>
        {departures.length === 0 ? <p className="module-empty">No sample departures are available for this route.</p> : (
          <div className="admin-record-list">
            {departurePages.visibleItems.map((trip) => <article key={trip.id}><div><strong>{fmtDate(trip.date)} · {trip.departure}</strong><small>Arrival {trip.arrival} · MWK {trip.fare.toLocaleString("en-MW")}</small></div><Link className="text-action" href={`/transport-booking/details/${trip.id}`}>Choose trip</Link></article>)}
          </div>
        )}
        <ListPagination
          page={departurePages.page}
          pageCount={departurePages.pageCount}
          onPageChange={departurePages.setPage}
          label="departure"
        />
      </section>
      <p className="module-footnote">Route and fare details are sample mockup data and are not confirmed operator information.</p>
    </main>
  );
}
