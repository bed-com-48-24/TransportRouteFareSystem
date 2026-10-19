"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { availableSeats, createBooking, fmtDate, type Trip } from "../../booking-data";

export default function BookingDetailsForm({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [travelDate, setTravelDate] = useState(trip.date);
  const [pickup, setPickup] = useState(trip.pickup[0]);
  const [dropoff, setDropoff] = useState(trip.dropoff[0]);
  const [passengers, setPassengers] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [available, setAvailable] = useState(trip.capacity);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setAvailable(availableSeats(trip)), 0);
    return () => window.clearTimeout(timer);
  }, [trip]);

  async function confirm() {
    setError("");
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !travelDate || !pickup || !dropoff || pickup === dropoff) {
      setError("Enter your name, a valid email, travel date and different pickup and drop-off points."); return;
    }
    setSaving(true);
    try {
      const booking = await createBooking({ tripId: trip.id, route: trip.route, travelDate, pickup, dropoff, passengers, name: name.trim(), email: email.trim().toLowerCase() }, trip);
      if (!booking) {
        setAvailable(availableSeats(trip));
        setError("There are not enough seats remaining for this trip. Please change the passenger count or choose another trip.");
      } else router.push(`/transport-booking/confirmation/${booking.reference}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save your booking. Please try again.");
    } finally { setSaving(false); }
  }

  return <main className="booking-shell"><header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">R</span> RouteWise</Link><Link className="home-nav-link" href="/transport-booking/my-bookings">My bookings</Link></header><section className="booking-content" aria-labelledby="page-title"><Link className="back-link" href="/transport-booking">← Choose another trip</Link><div className="eyebrow">STEP 2 OF 3 · PASSENGER DETAILS</div><h1 id="page-title">Your booking details</h1><p className="intro">{trip.route} · {fmtDate(trip.date)} · departs {trip.departure}</p>
    <div className="booking-grid"><section className="trip-card"><span className="route-label">YOUR TRIP</span><h2>{trip.route}</h2><div className="journey-line"><div className="journey-stop"><span className="stop-dot start"/><div><strong>{pickup}</strong><small>Pickup · {trip.departure}</small></div></div><div className="journey-connector"/><div className="journey-stop"><span className="stop-dot end"/><div><strong>{dropoff}</strong><small>Drop-off · Approx. {trip.arrival}</small></div></div></div><div className={`availability ${available === 0 ? "sold-out" : ""}`}><span className="availability-dot"/><span>{available} {available === 1 ? "seat" : "seats"} available</span><span className="capacity-note">of {trip.capacity}</span></div><p className="fare-note">MWK {trip.fare.toLocaleString()} estimated per passenger. No payment is collected.</p></section>
    <section className="details-card"><div className="card-heading"><div><span className="route-label">BOOKING DETAILS</span><h2>Passenger information</h2></div><span className="step-pill">NO PAYMENT</span></div><label className="field-label" htmlFor="travel-date">Travel date</label><input className="booking-input" id="travel-date" type="date" min={trip.date} value={travelDate} onChange={(event) => setTravelDate(event.target.value)}/><div className="form-row"><div><label className="field-label" htmlFor="pickup">Pickup point</label><select className="booking-input" id="pickup" value={pickup} onChange={(event) => setPickup(event.target.value)}>{trip.pickup.map((point) => <option key={point}>{point}</option>)}</select></div><div><label className="field-label" htmlFor="dropoff">Drop-off point</label><select className="booking-input" id="dropoff" value={dropoff} onChange={(event) => setDropoff(event.target.value)}>{trip.dropoff.map((point) => <option key={point}>{point}</option>)}</select></div></div><label className="field-label" htmlFor="passenger-name">Full name</label><input className="booking-input" id="passenger-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name"/><label className="field-label" htmlFor="passenger-email">Email address</label><input className="booking-input" id="passenger-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/><label className="field-label" htmlFor="passenger-count">Number of passengers</label><div className="passenger-control"><button type="button" aria-label="Remove one passenger" disabled={passengers <= 1} onClick={() => setPassengers((count) => Math.max(1, count - 1))}>−</button><output id="passenger-count">{passengers} <span>{passengers === 1 ? "passenger" : "passengers"}</span></output><button type="button" aria-label="Add one passenger" disabled={passengers >= Math.min(8, available)} onClick={() => setPassengers((count) => Math.min(8, available, count + 1))}>+</button></div><div className="fare-breakdown"><div><span>Estimated fare per passenger</span><strong>MWK {trip.fare.toLocaleString()}</strong></div><div><span>Passengers</span><strong>× {passengers}</strong></div><div className="fare-total"><span>Estimated total</span><strong>MWK {(trip.fare * passengers).toLocaleString()}</strong></div></div><p className="fare-note">Estimated fare only. No online payment is taken.</p><button className="confirm-button" type="button" disabled={saving || available === 0 || passengers > available} onClick={confirm}>{saving ? "Confirming…" : "Confirm booking"}<span aria-hidden="true">→</span></button>{error && <p className="message error-message" role="alert">{error}</p>}</section></div></section></main>;
}
