"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PaymentTicketCard from "@/components/PaymentTicketCard";
import { readPaymentSuccess } from "@/lib/payment-success";
import type { Booking } from "@/lib/types";

export default function PaymentSuccessPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBooking(readPaymentSuccess());
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="module-shell transport-page-shell payment-success-page">
      <div className="transport-background" aria-hidden="true" />
      <section className="module-section payment-success-panel" aria-live="polite" data-payment-success>
        {loading ? (
          <p>Loading your confirmation…</p>
        ) : !booking ? (
          <>
            <h1>No payment confirmation</h1>
            <p>Choose a trip to continue.</p>
            <Link className="primary-button" href="/transport-booking">Back to booking</Link>
          </>
        ) : (
          <>
            <div className="payment-success-heading">
              <span className="payment-success-check" aria-hidden="true">✓</span>
              <div>
                <p className="module-eyebrow">PAYMENT SUCCESSFUL</p>
                <h1>Your ticket is ready</h1>
              </div>
            </div>
            <PaymentTicketCard booking={booking} />
          </>
        )}
      </section>
    </main>
  );
}
