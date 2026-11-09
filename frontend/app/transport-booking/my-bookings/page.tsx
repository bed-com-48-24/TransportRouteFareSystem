"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtDate, readBookings, saveBookings, type Booking } from "@/lib/booking-data";
import { addMockNotification } from "@/lib/mock-notifications";

export default function MyBookingsPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState("");

  function findBookings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setBookings(readBookings().filter((booking) => booking.email.toLowerCase() === normalizedEmail));
    setSearched(true);
    setNotice("");
  }

  function cancel(reference: string) {
    const updated = readBookings().map((booking) =>
      booking.reference === reference ? { ...booking, status: "cancelled" as const, updatedAt: new Date().toISOString() } : booking,
    );
    saveBookings(updated);
    setBookings(updated.filter((booking) => booking.email.toLowerCase() === email.trim().toLowerCase()));
    setNotice(`Mock booking ${reference} was cancelled on this device.`);
    addMockNotification({
      title: "Booking cancelled",
      message: `Mock booking ${reference} was cancelled.`,
      category: "booking",
      bookingReference: reference,
    });
  }

  return (
    <main className="booking-shell">
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/transport-booking">← Browse available trips</Link>
        <div className="eyebrow">PASSENGER BOOKINGS · MOCKUP</div>
        <h1 id="page-title">Find your bookings</h1>
        <p className="intro">Enter the email used for a booking on this browser.</p>
        <form className="lookup-form" onSubmit={findBookings}>
          <label className="field-label" htmlFor="booking-email">Email address</label>
          <div className="lookup-row">
            <input className="booking-input" id="booking-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <button className="confirm-button" type="submit">Find bookings <span aria-hidden="true">→</span></button>
          </div>
        </form>
        {notice && <p className="message success-message" role="status">{notice}</p>}
        {searched && (bookings.length ? (
          <div className="booking-list">
            {[...bookings].reverse().map((booking) => (
              <article className="booking-record" key={booking.reference}>
                <div className="booking-record-main">
                  <strong>{booking.route}</strong>
                  <span>{fmtDate(booking.travelDate)} · {booking.pickup} → {booking.dropoff}</span>
                  <span>{booking.passengers} passenger(s) · {booking.name}</span>
                  {booking.phoneNumber && <span>Phone: {booking.phoneNumber}</span>}
                  {booking.seatNumbers?.length ? <span>Seats: {booking.seatNumbers.join(", ")}</span> : null}
                  {booking.total !== undefined && <span>Total: MWK {booking.total.toLocaleString("en-MW")} · mock payment</span>}
                  <span>Reference: <b>{booking.reference}</b></span>
                  <Link href="/accounts-reports/notifications">View notifications →</Link>
                </div>
                <div className="booking-record-actions">
                  <span className={`status-tag ${booking.status}`}>{booking.status}</span>
                  {booking.status === "confirmed" && <button type="button" className="text-action" onClick={() => cancel(booking.reference)}>Cancel booking</button>}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="empty-bookings">No mock bookings found for that email on this device.</p>)}
        <p className="booking-footnote"><span>ⓘ</span> Demo reservations are stored only in this browser. They are not real bookings.</p>
      </section>
    </main>
  );
}
