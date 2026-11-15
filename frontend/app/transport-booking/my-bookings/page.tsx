"use client";

import Link from "next/link";
import { useState } from "react";
<<<<<<< HEAD
import { fmtDate, readBookings, saveBookings, type Booking } from "@/lib/booking-data";
import { addMockNotification } from "@/lib/mock-notifications";
=======
import { usePassengerAuth } from "@/components/PassengerAuthProvider";
import {
  fmtDate,
  readBookings,
  saveBookings,
  type Booking,
} from "@/lib/booking-data";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
>>>>>>> origin/feature/integration

export default function MyBookingsPage() {
  const { passenger, ready: authReady, error: authError } = usePassengerAuth();
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const passengerBookings = passenger
    ? bookings.filter(
        (booking) => booking.email.trim().toLowerCase() === passenger.email.toLowerCase(),
      )
    : [];
  const loading = !authReady;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
<<<<<<< HEAD

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
=======
  const visibleError = error || authError;

  function cancel(reference: string) {
    if (!passenger) return;

    setError("");
    setNotice("");
    try {
      const allBookings = readBookings();
      const ownedBooking = allBookings.find(
        (booking) =>
          booking.reference === reference &&
          booking.email.trim().toLowerCase() === passenger.email.toLowerCase(),
      );
      if (!ownedBooking || ownedBooking.status !== "confirmed") {
        setError("This booking could not be cancelled. Refresh and try again.");
        return;
      }

      const updatedBookings = allBookings.map((booking) =>
        booking.reference === reference ? { ...booking, status: "cancelled" as const } : booking,
      );
      saveBookings(updatedBookings);
      setNotice(`Booking ${reference} has been cancelled.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This booking could not be cancelled.");
    }
  }

  const sortedBookings = [...passengerBookings].reverse();
  const signInHref = `/login?next=${encodeURIComponent("/transport-booking/my-bookings")}`;
>>>>>>> origin/feature/integration

  return (
    <main className="booking-shell">
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/transport-booking">← Browse available trips</Link>
<<<<<<< HEAD
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
=======
        <div className="eyebrow">PASSENGER BOOKINGS</div>
        <h1 id="page-title">My bookings</h1>
        <p className="intro">
          View and manage bookings made with your passenger account.
        </p>

        {loading ? (
          <p className="empty-bookings" role="status">Loading your bookings…</p>
        ) : !passenger ? (
          <div className="account-required-panel" role="status">
            <h2>Sign in to view your bookings</h2>
            <p>Your bookings are linked to your passenger account, so you do not need to look them up by email.</p>
            <Link className="primary-button" href={signInHref}>Sign in</Link>
          </div>
        ) : (
          <>
            <p className="booking-account-name">Signed in as <strong>{passenger.fullName}</strong></p>
            {notice && <p className="message success-message" role="status">{notice}</p>}
            {visibleError && <p className="module-error" role="alert">{visibleError}</p>}
            {sortedBookings.length > 0 ? (
              <div className="booking-list">
                {sortedBookings.map((booking) => (
                  <article className="booking-record" key={booking.reference}>
                    <div className="booking-record-main">
                      <strong>{booking.route}</strong>
                      <span>{fmtDate(booking.travelDate)} · {booking.pickup} → {booking.dropoff}</span>
                      <span>{booking.passengers} passenger(s) · {booking.name}</span>
                      <span>Seat(s): {booking.seatNumbers?.join(", ") ?? "Not recorded"}</span>
                      <span>Reference: <b>{booking.reference}</b></span>
                      <Link href={`/transport-booking/confirmation/${booking.reference}`}>
                        View confirmation →
                      </Link>
                    </div>
                    <div className="booking-record-actions">
                      <span className={`status-tag ${booking.status}`}>{booking.status}</span>
                      {booking.status === "confirmed" && (
                        <button
                          type="button"
                          className="text-action"
                          onClick={() => cancel(booking.reference)}
                        >
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-bookings">No bookings found for your account on this device.</p>
            )}
          </>
        )}

        {visibleError && !passenger && <p className="module-error" role="alert">{visibleError}</p>}
        <p className="booking-footnote">
          <span>ⓘ</span> Reservations in this prototype are stored in the current browser only.
        </p>
>>>>>>> origin/feature/integration
      </section>
    </main>
  );
}
