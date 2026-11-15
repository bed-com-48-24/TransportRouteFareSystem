"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readBookings, saveBookings, fmtDate, type Booking } from "@/lib/booking-data";
import { notifyBookingStatus } from "@/lib/notifications";
import { readPassengerSession } from "@/lib/passenger-auth";

export default function MyBookingsPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setBookings(readBookings()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const passenger = readPassengerSession();
        if (passenger) {
          setEmail(passenger.email);
          return;
        }
      } catch {
        // Fall back to the older mock session below.
      }

      const storedUser = localStorage.getItem("loggedInUser");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setEmail(user.email || "");
        } catch {
          setEmail("");
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const results = searched
    ? bookings.filter((item) => item.email === email.trim().toLowerCase())
    : [];

  function findBookings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(true);
    setNotice("");
  }

  function cancel(reference: string) {
    const current = readBookings();
    const target = current.find((item) => item.reference === reference);
    if (!target || target.status !== "confirmed") return;

    const updatedBooking: Booking = { ...target, status: "cancelled" };
    const updated = current.map((item) =>
      item.reference === reference ? updatedBooking : item,
    );

    try {
      saveBookings(updated);
      setBookings(updated);
      setNotice(
        `Booking ${reference} has been cancelled. Your seats are available for other passengers.`,
      );
    } catch {
      setNotice("The booking could not be cancelled on this device. Please try again.");
      return;
    }

    try {
      notifyBookingStatus(
        updatedBooking,
        "booking-cancelled",
        `You cancelled your booking for ${target.route} on ${fmtDate(target.travelDate)}. The seats have been released for other passengers.`,
      );
    } catch {
      // The cancellation is saved even if the notification store is blocked.
    }
  }

  return (
    <main className="booking-shell">
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/transport-booking">← Browse available trips</Link>
        <div className="eyebrow">PASSENGER BOOKINGS</div>
        <h1 id="page-title">Find your bookings</h1>
        <p className="intro">Enter the email address used when you made the reservation.</p>
        <form className="lookup-form" onSubmit={findBookings}>
          <label className="field-label" htmlFor="booking-email">Email address</label>
          <div className="lookup-row">
            <input
              className="booking-input"
              id="booking-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <button className="confirm-button" type="submit">Find bookings <span aria-hidden="true">→</span></button>
          </div>
        </form>
        {notice && <p className="message success-message" role="status">{notice}</p>}
        {searched && (results.length ? (
          <div className="booking-list">
            {[...results].reverse().map((booking) => (
              <article className="booking-record" key={booking.reference}>
                <div className="booking-record-main">
                  <strong>{booking.route}</strong>
                  <span>{fmtDate(booking.travelDate)} · {booking.pickup} → {booking.dropoff}</span>
                  <span>{booking.passengers} passenger(s) · {booking.name}</span>
                  {booking.seats?.length ? <span>Seats: {booking.seats.join(", ")}</span> : null}
                  <span>Reference: <b>{booking.reference}</b></span>
                  <Link href={`/transport-booking/details/${booking.tripId}`}>View trip details →</Link>
                </div>
                <div className="booking-record-actions">
                  <span className={`status-tag ${booking.status}`}>{booking.status}</span>
                  {booking.status === "confirmed" && (
                    <button type="button" className="text-action" onClick={() => cancel(booking.reference)}>
                      Cancel booking
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-bookings">No bookings found for this email on this device.</p>
        ))}
        <p className="booking-footnote"><span>ⓘ</span> Reservations in this prototype are stored in the current browser only.</p>
      </section>
    </main>
  );
}
