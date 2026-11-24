"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ListPagination from "@/components/ListPagination";
import { usePagedItems } from "@/components/usePagedItems";
import { fmtDate } from "@/lib/booking-data";
import { readBookings, saveBookings } from "@/lib/booking-data";
import { notifyBookingStatus } from "@/lib/notifications";
import { readPassengerSession } from "@/lib/passenger-auth";
import { useMyBookings } from "@/lib/use-backend-data";
import type { Booking } from "@/lib/types";
import * as apiBookings from "@/services/bookings.service";

export default function MyBookingsPage() {
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState("");
  const [cancelling, setCancelling] = useState("");
  const { data: bookings, usingDemo, error, reload } = useMyBookings();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const passenger = readPassengerSession();
      if (passenger) {
        setEmail(passenger.email);
        setSearched(true);
        return;
      }

      try {
        const storedUser = localStorage.getItem("loggedInUser");
        if (storedUser) {
          const user = JSON.parse(storedUser) as { email?: string };
          if (user.email) {
            setEmail(user.email);
            setSearched(true);
          }
        }
      } catch {
        setEmail("");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const results = searched
    ? bookings.filter(
        (item) =>
          !email.trim() || item.email.toLowerCase() === email.trim().toLowerCase(),
      )
    : [];
  const bookingPages = usePagedItems(results, (booking) => `${booking.route} ${booking.travelDate}`, {
    resetKey: `${searched}|${email}`,
  });

  function findBookings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(true);
    setNotice("");
  }

  async function cancel(reference: string) {
    const target = bookings.find((item) => item.reference === reference);
    if (!target || target.status !== "confirmed") return;

    setCancelling(reference);
    setNotice("");
    const updatedBooking: Booking = { ...target, status: "cancelled" };

    try {
      if (usingDemo) {
        // Backend is down: cancel the demo copy in this browser only.
        const current = readBookings();
        saveBookings(
          current.map((item) => (item.reference === reference ? updatedBooking : item)),
        );
      } else {
        await apiBookings.cancel(reference);
      }

      setNotice(
        `Booking ${reference} has been cancelled. Your seats are available for other passengers.`,
      );
      reload();

      try {
        notifyBookingStatus(
          updatedBooking,
          "booking-cancelled",
          `You cancelled your booking for ${target.route || `trip ${target.tripId}`} on ${fmtDate(target.travelDate)}. The seats have been released for other passengers.`,
        );
      } catch {
        // The cancellation is saved even if the notification store is blocked.
      }
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "The booking could not be cancelled. Please try again.",
      );
    } finally {
      setCancelling("");
    }
  }

  return (
    <main className="booking-shell">
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/transport-booking">← Browse available trips</Link>
        <div className="eyebrow">PASSENGER BOOKINGS</div>
        <h1 id="page-title">Find your bookings</h1>
        <p className="intro">Enter the email address used when you made the reservation.</p>
        {error && !usingDemo && (
          <p className="message" role="alert">
            {error} — sign in as a passenger to see your live bookings.
          </p>
        )}
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
            {bookingPages.visibleItems.map((booking) => (
              <article className="booking-record" key={booking.reference}>
                <div className="booking-record-main">
                  <strong>{booking.route || `Trip ${booking.tripId}`}</strong>
                  <span>{fmtDate(booking.travelDate)} · {booking.pickup || "—"} → {booking.dropoff || "—"}</span>
                  <span>{booking.passengers} passenger(s) · {booking.name || "—"}</span>
                  {booking.seats?.length ? <span>Seats: {booking.seats.join(", ")}</span> : null}
                  <span>Reference: <b>{booking.reference}</b></span>
                  <Link href={`/transport-booking/details/${booking.tripId}?date=${booking.travelDate}`}>View trip details →</Link>
                </div>
                <div className="booking-record-actions">
                  <span className={`status-tag ${booking.status}`}>{booking.status}</span>
                  {booking.status === "confirmed" && (
                    <button
                      type="button"
                      className="text-action"
                      onClick={() => cancel(booking.reference)}
                      disabled={cancelling === booking.reference}
                    >
                      {cancelling === booking.reference ? "Cancelling…" : "Cancel booking"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-bookings">
            {usingDemo
              ? "No demo bookings found for this email."
              : "No bookings found for this account yet."}
          </p>
        ))}
        <ListPagination
          page={bookingPages.page}
          pageCount={bookingPages.pageCount}
          onPageChange={bookingPages.setPage}
          label="booking"
        />
        <p className="booking-footnote">
          <span>ⓘ</span>{" "}
          {usingDemo
            ? "The backend is unreachable, so bookings shown here come from this browser only."
            : "Bookings are loaded from the YendaRoute backend for the signed-in account."}
        </p>
      </section>
    </main>
  );
}
