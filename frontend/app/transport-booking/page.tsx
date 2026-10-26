<<<<<<< HEAD
<<<<<<< HEAD
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Booking = {
  reference: string;
  passengers: number;
  createdAt: string;
};

const TRIP = {
  id: "blantyre-limbe-2026-10-20-0800",
  route: "Blantyre → Limbe",
  departure: "08:00",
  date: "2026-10-20",
  capacity: 14,
  fare: 2500,
};
const STORAGE_KEY = `transport-bookings:${TRIP.id}`;
const LOCK_NAME = `transport-booking:${TRIP.id}`;

function readBookings(): Booking[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (booking): booking is Booking =>
        typeof booking?.reference === "string" &&
        Number.isInteger(booking?.passengers) &&
        booking.passengers > 0 &&
        typeof booking?.createdAt === "string",
    );
  } catch {
    return [];
  }
}

function remainingSeats(bookings: Booking[]) {
  return Math.max(0, TRIP.capacity - bookings.reduce((total, booking) => total + booking.passengers, 0));
}

function newReference() {
  return `TR-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export default function TransportBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [passengers, setPassengers] = useState(1);
  const [status, setStatus] = useState<"idle" | "confirmed" | "unavailable" | "error">("idle");
  const [confirmation, setConfirmation] = useState<Booking | null>(null);

  const refreshBookings = useCallback(() => setBookings(readBookings()), []);

  useEffect(() => {
    const timer = window.setTimeout(refreshBookings, 0);
    window.addEventListener("storage", refreshBookings);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", refreshBookings);
    };
  }, [refreshBookings]);

  const available = useMemo(() => remainingSeats(bookings), [bookings]);
  const total = TRIP.fare * passengers;

  async function confirmBooking() {
    setStatus("idle");
    setConfirmation(null);

    const create = () => {
      const latestBookings = readBookings();
      if (remainingSeats(latestBookings) < passengers) return false;

      const booking: Booking = {
        reference: newReference(),
        passengers,
        createdAt: new Date().toISOString(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...latestBookings, booking]));
      setBookings([...latestBookings, booking]);
      setConfirmation(booking);
      return true;
    };

    try {
      // The Web Locks API serializes capacity checks across tabs on supported browsers.
      const lockManager = navigator.locks;
      const confirmed = lockManager
        ? await lockManager.request(LOCK_NAME, create)
        : create();
      setStatus(confirmed ? "confirmed" : "unavailable");
    } catch {
      setStatus("error");
    }
  }

  const soldOut = available === 0;
  const cannotBook = soldOut || passengers > available;

  return (
    <main className="booking-shell">
      <header className="booking-header">
        <Link className="brand" href="/" aria-label="RouteWise home">
          <span className="brand-mark">R</span> RouteWise
        </Link>
        <span className="header-note">Travel with confidence</span>
      </header>

      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/">← Back to journeys</Link>
        <div className="eyebrow">YOUR JOURNEY</div>
        <h1 id="page-title">Reserve your seats</h1>
        <p className="intro">Choose how many seats you need. Your booking is confirmed only while seats remain available.</p>

        <div className="booking-grid">
          <section className="trip-card" aria-label="Selected trip">
            <div className="trip-card-top">
              <span className="route-label">SELECTED ROUTE</span>
              <span className="trip-badge">Direct trip</span>
            </div>
            <h2>{TRIP.route}</h2>
            <div className="journey-line">
              <div className="journey-stop"><span className="stop-dot start" /><div><strong>Blantyre</strong><small>Departure · {TRIP.departure}</small></div></div>
              <div className="journey-connector" />
              <div className="journey-stop"><span className="stop-dot end" /><div><strong>Limbe</strong><small>Arrival · Approx. 08:45</small></div></div>
            </div>
            <div className="trip-meta">
              <div><span className="meta-icon">▦</span><span><small>Travel date</small><strong>20 October 2026</strong></span></div>
              <div><span className="meta-icon">◷</span><span><small>Estimated duration</small><strong>45 minutes</strong></span></div>
            </div>
            <div className={`availability ${soldOut ? "sold-out" : ""}`} aria-live="polite">
              <span className="availability-dot" />
              <span>{soldOut ? "This trip is fully booked" : `${available} ${available === 1 ? "seat" : "seats"} available`}</span>
              <span className="capacity-note">of {TRIP.capacity}</span>
            </div>
          </section>

          <section className="details-card" aria-label="Booking details">
            <div className="card-heading"><div><span className="route-label">BOOKING DETAILS</span><h2>Passenger information</h2></div><span className="step-pill">STEP 1 OF 1</span></div>
            <label className="field-label" htmlFor="passenger-count">Number of passengers</label>
            <div className="passenger-control">
              <button type="button" aria-label="Remove one passenger" disabled={passengers <= 1} onClick={() => setPassengers((count) => Math.max(1, count - 1))}>−</button>
              <output id="passenger-count" aria-live="polite">{passengers} <span>{passengers === 1 ? "passenger" : "passengers"}</span></output>
              <button type="button" aria-label="Add one passenger" disabled={passengers >= Math.min(TRIP.capacity, 8)} onClick={() => setPassengers((count) => Math.min(Math.min(TRIP.capacity, 8), count + 1))}>+</button>
            </div>
            <p className="field-hint">You can book up to 8 seats at a time.</p>

            <div className="fare-breakdown">
              <div><span>Estimated fare per passenger</span><strong>MWK {TRIP.fare.toLocaleString()}</strong></div>
              <div><span>Passengers</span><strong>× {passengers}</strong></div>
              <div className="fare-total"><span>Estimated total</span><strong>MWK {total.toLocaleString()}</strong></div>
            </div>
            <p className="fare-note">This is an estimated fare. The operator may charge a different amount. No payment is collected here.</p>

            <button className="confirm-button" type="button" disabled={cannotBook} onClick={confirmBooking}>
              {soldOut ? "Trip fully booked" : `Confirm booking · MWK ${total.toLocaleString()}`}
              {!soldOut && <span aria-hidden="true">→</span>}
            </button>

            {status === "unavailable" && <p className="message error-message" role="alert">There are not enough seats left for this booking. Availability has been updated.</p>}
            {status === "error" && <p className="message error-message" role="alert">We couldn’t save your booking. Please try again.</p>}
            {status === "confirmed" && confirmation && (
              <div className="message success-message" role="status">
                <strong>Booking confirmed</strong>
                <span>Reference: <b>{confirmation.reference}</b></span>
                <span>{confirmation.passengers} {confirmation.passengers === 1 ? "seat" : "seats"} reserved on {TRIP.route}.</span>
              </div>
            )}
          </section>
        </div>
        <p className="booking-footnote"><span>ⓘ</span> Seat availability is checked again when you confirm. Your booking is saved on this device.</p>
=======
import Link from "next/link";
import { TRIPS, fmtDate } from "./booking-data";

export default function TransportBookingPage() {
  return (
    <main className="booking-shell">
      <header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">R</span> RouteWise</Link><Link className="home-nav-link" href="/transport-booking/my-bookings">My bookings</Link></header>
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/">← Back to journeys</Link>
        <div className="eyebrow">STEP 1 OF 3 · SELECT A TRIP</div>
        <h1 id="page-title">Choose your journey</h1>
        <p className="intro">Compare departure times and estimated fares. Seat availability is checked again when you confirm.</p>
        <div className="trip-options">
          {TRIPS.map((trip) => (
            <article className="trip-card trip-option" key={trip.id}>
              <div className="trip-card-top"><span className="route-label">AVAILABLE TRIP</span><span className="trip-badge">{fmtDate(trip.date)}</span></div>
              <h2>{trip.route}</h2>
              <div className="trip-option-meta"><span>◷ &nbsp;{trip.departure} – {trip.arrival}</span><span>⌖ &nbsp;{trip.pickup[0]}</span><span>MWK {trip.fare.toLocaleString()} <small>/ passenger · estimated</small></span></div>
              <Link className="confirm-button trip-choose" href={`/transport-booking/details/${trip.id}`}>Choose this trip <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
        <p className="booking-footnote"><span>ⓘ</span> This is a seat reservation only. No ticket sales or payment processing.</p>
>>>>>>> main
      </section>
    </main>
  );
}
=======
"use client";

import Link from "next/link";

export default function TransportBookingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-16 text-[#26364d]">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#64748b]">
          Mthunzi Express
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#14233b] sm:text-4xl">
          Plan your next journey
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-[#52627a]">
          Compare available sample routes and estimated fares before you
          travel. Choose a destination to see route details and boarding points.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/routes-fares"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#14233b] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#29466d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466d]"
          >
            Browse routes &amp; fares
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-[#26364d] transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466d]"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
>>>>>>> 7fd1fa0 (updates)
