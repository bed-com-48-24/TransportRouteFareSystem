"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Trip = {
  id: string;
  route: string;
  pickup: string[];
  dropoff: string[];
  date: string;
  departure: string;
  arrival: string;
  capacity: number;
  fare: number;
};

type Booking = {
  reference: string;
  tripId: string;
  route: string;
  travelDate: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

const TRIPS: Trip[] = [
  { id: "BT-LB-0800", route: "Blantyre → Limbe", pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"], dropoff: ["Limbe Bus Station", "Limbe Market"], date: "2026-10-20", departure: "08:00", arrival: "08:45", capacity: 14, fare: 2500 },
  { id: "BT-LB-1030", route: "Blantyre → Limbe", pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"], dropoff: ["Limbe Bus Station", "Limbe Market"], date: "2026-10-20", departure: "10:30", arrival: "11:15", capacity: 18, fare: 2500 },
  { id: "BT-ZO-0900", route: "Blantyre → Zomba", pickup: ["Blantyre Bus Depot", "Limbe Bus Station"], dropoff: ["Zomba Bus Depot", "Zomba Market"], date: "2026-10-21", departure: "09:00", arrival: "10:30", capacity: 22, fare: 5000 },
];
const STORAGE_KEY = "routewise-bookings-v1";
const fmtDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-MW", { day: "numeric", month: "long", year: "numeric" });

function readBookings(): Booking[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.reference === "string") as Booking[] : [];
  } catch { return []; }
}

export default function TransportBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tripId, setTripId] = useState(TRIPS[0].id);
  const [travelDate, setTravelDate] = useState(TRIPS[0].date);
  const [pickup, setPickup] = useState(TRIPS[0].pickup[0]);
  const [dropoff, setDropoff] = useState(TRIPS[0].dropoff[0]);
  const [passengers, setPassengers] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmation, setConfirmation] = useState<Booking | null>(null);

  const refresh = useCallback(() => setBookings(readBookings()), []);
  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", refresh); };
  }, [refresh]);

  const trip = TRIPS.find((item) => item.id === tripId) ?? TRIPS[0];
  const tripBookings = useMemo(() => bookings.filter((booking) => booking.tripId === trip.id && booking.status === "confirmed"), [bookings, trip.id]);
  const available = Math.max(0, trip.capacity - tripBookings.reduce((sum, booking) => sum + booking.passengers, 0));
  const total = trip.fare * passengers;

  function chooseTrip(id: string) {
    const next = TRIPS.find((item) => item.id === id) ?? TRIPS[0];
    setTripId(next.id); setTravelDate(next.date); setPickup(next.pickup[0]); setDropoff(next.dropoff[0]); setStatus(""); setConfirmation(null);
  }

  async function confirmBooking() {
    setStatus(""); setConfirmation(null);
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !travelDate || !pickup || !dropoff || pickup === dropoff || !Number.isInteger(passengers) || passengers < 1) {
      setStatus("Check your name, valid email, travel date, stops and passenger count."); return;
    }
    const create = () => {
      const latest = readBookings();
      const occupied = latest.filter((b) => b.tripId === trip.id && b.status === "confirmed").reduce((sum, b) => sum + b.passengers, 0);
      if (trip.capacity - occupied < passengers) return null;
      const booking: Booking = {
        reference: `TR-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
        tripId: trip.id, route: trip.route, travelDate, pickup, dropoff, passengers,
        name: name.trim(), email: email.trim().toLowerCase(), status: "confirmed", createdAt: new Date().toISOString(),
      };
      const updated = [...latest, booking];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setBookings(updated); setConfirmation(booking); return booking;
    };
    try {
      const result = navigator.locks ? await navigator.locks.request(`routewise-trip-${trip.id}`, create) : create();
      setStatus(result ? "confirmed" : "unavailable");
    } catch { setStatus("Unable to save this booking. Please try again."); }
  }

  function cancelBooking(reference: string) {
    const updated = readBookings().map((booking) => booking.reference === reference ? { ...booking, status: "cancelled" as const } : booking);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setBookings(updated); setStatus(`Booking ${reference} cancelled.`);
    if (confirmation?.reference === reference) setConfirmation(null);
  }

  function updateStatus(reference: string, nextStatus: Booking["status"]) {
    const updated = readBookings().map((booking) => booking.reference === reference ? { ...booking, status: nextStatus } : booking);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setBookings(updated); setStatus(`Booking ${reference} marked ${nextStatus}.`);
  }

  const visibleBookings = adminMode ? bookings : bookings.filter((booking) => booking.email === email.trim().toLowerCase());

  return (
    <main className="booking-shell">
      <header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">R</span> RouteWise</Link><button className="mode-toggle" type="button" onClick={() => { setAdminMode(!adminMode); setStatus(""); }}>{adminMode ? "Passenger view" : "Admin demo"}</button></header>
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/">← Back to journeys</Link>
        <div className="eyebrow">TRIP RESERVATIONS</div>
        <h1 id="page-title">Book your journey</h1>
        <p className="intro">Choose an available trip, enter your details and reserve seats. No payment is collected.</p>

        <div className="booking-grid">
          <section className="trip-card" aria-label="Trip selection and availability">
            <label className="field-label" htmlFor="trip-select">Available transport trips</label>
            <select className="booking-input" id="trip-select" value={trip.id} onChange={(event) => chooseTrip(event.target.value)}>
              {TRIPS.map((item) => <option key={item.id} value={item.id}>{item.route} · {fmtDate(item.date)} · {item.departure}</option>)}
            </select>
            <span className="route-label">SELECTED TRIP</span><h2>{trip.route}</h2>
            <div className="journey-line"><div className="journey-stop"><span className="stop-dot start"/><div><strong>{pickup}</strong><small>Pickup · {trip.departure}</small></div></div><div className="journey-connector"/><div className="journey-stop"><span className="stop-dot end"/><div><strong>{dropoff}</strong><small>Drop-off · Approx. {trip.arrival}</small></div></div></div>
            <div className="trip-meta"><div><span className="meta-icon">▦</span><span><small>Travel date</small><strong>{fmtDate(trip.date)}</strong></span></div><div><span className="meta-icon">◷</span><span><small>Departure</small><strong>{trip.departure}</strong></span></div></div>
            <div className={`availability ${available === 0 ? "sold-out" : ""}`} aria-live="polite"><span className="availability-dot"/><span>{available === 0 ? "This trip is fully booked" : `${available} ${available === 1 ? "seat" : "seats"} available`}</span><span className="capacity-note">of {trip.capacity}</span></div>
            <div className="capacity-meter-wrap"><div className="capacity-meter" style={{ gridTemplateColumns: `repeat(${trip.capacity}, minmax(0, 1fr))` }} role="progressbar" aria-label="Seats booked" aria-valuemin={0} aria-valuemax={trip.capacity} aria-valuenow={trip.capacity - available}>{Array.from({ length: trip.capacity }, (_, index) => <span key={index} className={`capacity-seat ${index < trip.capacity - available ? "occupied" : "free"}`}/>)}</div><div className="capacity-legend"><span><i className="legend-booked"/>{trip.capacity - available} booked</span><span><i className="legend-free"/>{available} available</span></div></div>
          </section>

          <section className="details-card" aria-label="Booking details">
            <div className="card-heading"><div><span className="route-label">BOOKING DETAILS</span><h2>Passenger information</h2></div><span className="step-pill">NO PAYMENT</span></div>
            <label className="field-label" htmlFor="travel-date">Travel date</label><input className="booking-input" id="travel-date" type="date" min={trip.date} value={travelDate} onChange={(event) => setTravelDate(event.target.value)}/>
            <div className="form-row"><div><label className="field-label" htmlFor="pickup">Pickup point</label><select className="booking-input" id="pickup" value={pickup} onChange={(event) => setPickup(event.target.value)}>{trip.pickup.map((point) => <option key={point}>{point}</option>)}</select></div><div><label className="field-label" htmlFor="dropoff">Drop-off point</label><select className="booking-input" id="dropoff" value={dropoff} onChange={(event) => setDropoff(event.target.value)}>{trip.dropoff.map((point) => <option key={point}>{point}</option>)}</select></div></div>
            <label className="field-label" htmlFor="passenger-name">Full name</label><input className="booking-input" id="passenger-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name"/>
            <label className="field-label" htmlFor="passenger-email">Email address</label><input className="booking-input" id="passenger-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/>
            <label className="field-label" htmlFor="passenger-count">Number of passengers</label><div className="passenger-control"><button type="button" aria-label="Remove one passenger" disabled={passengers <= 1} onClick={() => setPassengers((count) => Math.max(1, count - 1))}>−</button><output id="passenger-count">{passengers} <span>{passengers === 1 ? "passenger" : "passengers"}</span></output><button type="button" aria-label="Add one passenger" disabled={passengers >= 8 || passengers >= trip.capacity} onClick={() => setPassengers((count) => Math.min(8, trip.capacity, count + 1))}>+</button></div>
            <p className="field-hint">Up to 8 seats per booking; subject to remaining capacity.</p>
            <div className="fare-breakdown"><div><span>Estimated fare per passenger</span><strong>MWK {trip.fare.toLocaleString()}</strong></div><div><span>Passengers</span><strong>× {passengers}</strong></div><div className="fare-total"><span>Estimated total</span><strong>MWK {total.toLocaleString()}</strong></div></div>
            <p className="fare-note">Estimated fare only. No payment is collected here.</p>
            <button className="confirm-button" type="button" disabled={available === 0 || passengers > available} onClick={confirmBooking}>{available === 0 ? "Trip fully booked" : `Confirm booking · MWK ${total.toLocaleString()}`}<span aria-hidden="true">→</span></button>
            {status && <p className={`message ${status === "confirmed" ? "success-message" : "error-message"}`} role={status === "confirmed" ? "status" : "alert"}>{status === "confirmed" && confirmation ? <><strong>Booking confirmed</strong><span>Reference: <b>{confirmation.reference}</b></span><span>{confirmation.passengers} seat(s) reserved: {confirmation.route}, {fmtDate(confirmation.travelDate)}.</span></> : status === "unavailable" ? "There are not enough seats left. Availability has been refreshed; please try again." : status}</p>}
          </section>
        </div>

        <section className="bookings-panel"><div className="card-heading"><div><span className="route-label">{adminMode ? "ADMINISTRATION" : "YOUR ACCOUNT"}</span><h2>{adminMode ? "Manage bookings" : "Your bookings"}</h2></div><span className="step-pill">{visibleBookings.length} RECORDS</span></div>
          {!adminMode && <p className="field-hint">Enter the same email used for a booking to view your reservations.</p>}
          {visibleBookings.length === 0 ? <p className="empty-bookings">{adminMode ? "No bookings have been made on this device." : "No bookings found for this email."}</p> : <div className="booking-list">{[...visibleBookings].reverse().map((booking) => <article className="booking-record" key={booking.reference}><div className="booking-record-main"><strong>{booking.route}</strong><span>{fmtDate(booking.travelDate)} · {booking.pickup} → {booking.dropoff}</span><span>{booking.name} · {booking.email} · {booking.passengers} passenger(s)</span><span>Reference: <b>{booking.reference}</b></span></div><div className="booking-record-actions"><span className={`status-tag ${booking.status}`}>{booking.status}</span>{booking.status === "confirmed" && (adminMode ? <><button type="button" className="text-action" onClick={() => updateStatus(booking.reference, "cancelled")}>Cancel</button><button type="button" className="text-action" onClick={() => updateStatus(booking.reference, "confirmed")}>Confirm</button></> : booking.email === email.trim().toLowerCase() && <button type="button" className="text-action" onClick={() => cancelBooking(booking.reference)}>Cancel booking</button>)}</div></article>)}</div>}
        </section>
        <p className="booking-footnote"><span>ⓘ</span> Prototype data is stored in this browser. A production app needs a server database and authenticated user/admin accounts.</p>
      </section>
    </main>
  );
}
