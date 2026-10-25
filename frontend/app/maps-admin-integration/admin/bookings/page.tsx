"use client";

import { useState } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { TRIPS, fmtDate, type Booking } from "@/app/transport-booking/booking-data";
import { getAvailableSeats } from "@/app/transport-booking/seat-inventory.mjs";
import { KEYS } from "@/lib/seed";
import { loadList, saveList, useStoredList } from "@/lib/storage";

const NONE: Booking[] = [];

export default function AdminBookings() {
  const bookings = useStoredList<Booking>(KEYS.bookings, NONE);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  function setStatus(reference: string, status: Booking["status"]) {
    const all = loadList<Booking>(KEYS.bookings, NONE);
    const target = all.find((b) => b.reference === reference);
    if (!target) return;
    if (status === "confirmed") {
      // FR26: re-confirming must not exceed the trip's capacity
      const trip = TRIPS.find((t) => t.id === target.tripId);
      const others = all.filter((b) => b.reference !== reference);
      if (trip && getAvailableSeats(trip.capacity, others, trip.id) < target.passengers) {
        return setError(`Cannot re-confirm ${reference}: the trip would exceed its capacity of ${trip.capacity}.`);
      }
    }
    setError("");
    saveList(KEYS.bookings, all.map((b) => (b.reference === reference ? { ...b, status } : b)));
  }

  const q = query.trim().toLowerCase();
  const shown = [...bookings]
    .filter((b) => !q || [b.reference, b.name, b.email, b.route].some((v) => v.toLowerCase().includes(q)))
    .reverse();

  return (
    <RequireAdmin>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Manage bookings</h1>
      <input className="booking-input" style={{ margin: "12px 0" }} placeholder="Search reference, name, email or route" value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      {shown.length === 0 && <p>No bookings found.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {shown.map((b) => (
          <article key={b.reference} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <strong>{b.reference}</strong> · <span className={`status-tag ${b.status}`}>{b.status}</span>
            <p>{b.route} · {fmtDate(b.travelDate)} · {b.pickup} → {b.dropoff}</p>
            <p>{b.name} ({b.email}) · {b.passengers} passenger(s)</p>
            {b.status === "confirmed"
              ? <button className="text-action" onClick={() => setStatus(b.reference, "cancelled")}>Cancel booking</button>
              : <button className="text-action" onClick={() => setStatus(b.reference, "confirmed")}>Re-confirm booking</button>}
          </article>
        ))}
      </div>
    </RequireAdmin>
  );
}