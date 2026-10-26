"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtDate, readBookings, type Booking } from "../../booking-data";

export default function ConfirmationContent({ reference }: { reference: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setBooking(readBookings().find((item) => item.reference === reference) ?? null), 0);
    return () => window.clearTimeout(timer);
  }, [reference]);
  return <main className="booking-shell"><header className="booking-header"><Link className="brand" href="/"><span className="brand-mark">S</span> SBUS</Link><Link className="home-nav-link" href="/transport-booking/my-bookings">My bookings</Link></header><section className="booking-content" aria-labelledby="page-title"><div className="confirmation-card">{booking ? <><span className="confirmation-check">✓</span><div className="eyebrow">STEP 3 OF 3 · RESERVATION COMPLETE</div><h1 id="page-title">Your trip is booked</h1><p className="intro">Your seat reservation is confirmed. Keep this reference to look up your booking.</p><div className="reference-box"><span>BOOKING REFERENCE</span><strong>{booking.reference}</strong></div><div className="confirmation-details"><div><span>Route</span><strong>{booking.route}</strong></div><div><span>Date</span><strong>{fmtDate(booking.travelDate)}</strong></div><div><span>Pickup</span><strong>{booking.pickup}</strong></div><div><span>Drop-off</span><strong>{booking.dropoff}</strong></div><div><span>Passengers</span><strong>{booking.passengers}</strong></div><div><span>Lead passenger</span><strong>{booking.name}</strong></div></div><p className="fare-note">This is a reservation only. Fare is an estimate; payment is not collected online.</p><Link className="confirm-button confirmation-cta" href="/transport-booking/my-bookings">View my bookings <span aria-hidden="true">→</span></Link></> : <><div className="eyebrow">BOOKING REFERENCE</div><h1 id="page-title">Booking not found</h1><p className="intro">This reference is not saved in this browser. It may have been cleared or created on another device.</p><Link className="confirm-button confirmation-cta" href="/transport-booking">Browse trips</Link></>}</div></section></main>;
}
