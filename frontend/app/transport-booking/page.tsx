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
      </section>
    </main>
  );
}
