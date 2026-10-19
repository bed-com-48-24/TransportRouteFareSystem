"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readBookings, saveBookings, fmtDate, type Booking } from "../booking-data";

export default function MyBookingsPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setBookings(readBookings()), 0); return () => window.clearTimeout(timer); }, []);
  const results = searched ? bookings.filter((item) => item.email === email.trim().toLowerCase()) : [];
  function findBookings(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSearched(true); setNotice(""); }
  function cancel(reference: string) {
    const updated = readBookings().map((item) => item.reference === reference ? { ...item, status: "cancelled" as const } : item);
    saveBookings(updated); setBookings(updated); setNotice(`Booking ${reference} has been cancelled.`);
  }
  return <main className="booking-shell"><header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">R</span> RouteWise</Link><Link className="home-nav-link" href="/transport-booking">Browse trips</Link></header><section className="booking-content" aria-labelledby="page-title"><Link className="back-link" href="/transport-booking">← Browse available trips</Link><div className="eyebrow">PASSENGER BOOKINGS</div><h1 id="page-title">Find your bookings</h1><p className="intro">Enter the email address used when you made the reservation.</p><form className="lookup-form" onSubmit={findBookings}><label className="field-label" htmlFor="booking-email">Email address</label><div className="lookup-row"><input className="booking-input" id="booking-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/><button className="confirm-button" type="submit">Find bookings <span aria-hidden="true">→</span></button></div></form>{notice && <p className="message success-message" role="status">{notice}</p>}{searched && (results.length ? <div className="booking-list">{[...results].reverse().map((booking) => <article className="booking-record" key={booking.reference}><div className="booking-record-main"><strong>{booking.route}</strong><span>{fmtDate(booking.travelDate)} · {booking.pickup} → {booking.dropoff}</span><span>{booking.passengers} passenger(s) · {booking.name}</span><span>Reference: <b>{booking.reference}</b></span><Link href={`/transport-booking/confirmation/${booking.reference}`}>View confirmation →</Link></div><div className="booking-record-actions"><span className={`status-tag ${booking.status}`}>{booking.status}</span>{booking.status === "confirmed" && <button type="button" className="text-action" onClick={() => cancel(booking.reference)}>Cancel booking</button>}</div></article>)}</div> : <p className="empty-bookings">No bookings found for this email on this device.</p>)}<p className="booking-footnote"><span>ⓘ</span> Reservations in this prototype are stored in the current browser only.</p></section></main>;
}
