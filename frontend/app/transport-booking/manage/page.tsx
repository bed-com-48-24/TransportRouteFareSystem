"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readBookings, saveBookings, fmtDate, type Booking } from "../booking-data";

export default function ManageBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setBookings(readBookings()), 0); return () => window.clearTimeout(timer); }, []);
  function setStatus(reference: string, status: Booking["status"]) {
    const updated = readBookings().map((item) => item.reference === reference ? { ...item, status } : item);
    saveBookings(updated); setBookings(updated); setNotice(`Booking ${reference} marked ${status}.`);
  }
  return <main className="booking-shell"><header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">R</span> RouteWise</Link><Link className="home-nav-link" href="/transport-booking">Passenger view</Link></header><section className="booking-content" aria-labelledby="page-title"><Link className="back-link" href="/transport-booking">← Trip selection</Link><div className="eyebrow">ADMINISTRATION · DEMO</div><h1 id="page-title">Manage bookings</h1><p className="intro">Review reservations saved in this browser and update their status.</p>{notice && <p className="message success-message" role="status">{notice}</p>}{bookings.length === 0 ? <p className="empty-bookings">No bookings have been made on this device.</p> : <div className="booking-list">{[...bookings].reverse().map((booking) => <article className="booking-record" key={booking.reference}><div className="booking-record-main"><strong>{booking.route} · {fmtDate(booking.travelDate)}</strong><span>{booking.pickup} → {booking.dropoff}</span><span>{booking.name} · {booking.email} · {booking.passengers} passenger(s)</span><span>Reference: <b>{booking.reference}</b></span></div><div className="booking-record-actions"><span className={`status-tag ${booking.status}`}>{booking.status}</span><button className="text-action" type="button" onClick={() => setStatus(booking.reference, booking.status === "confirmed" ? "cancelled" : "confirmed")}>{booking.status === "confirmed" ? "Cancel" : "Restore"}</button></div></article>)}</div>}<p className="booking-footnote"><span>ⓘ</span> Demo administration only; a production admin page requires authentication and server-side storage.</p></section></main>;
}
