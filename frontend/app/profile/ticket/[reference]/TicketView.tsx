"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import PaymentTicketCard from "@/components/PaymentTicketCard";
import { useSession } from "@/lib/auth";
import { readPassengerBookingDetails } from "@/lib/passenger-booking-details";
import { readPaymentReceipts } from "@/lib/payment-receipts";
import { readPaymentSuccess } from "@/lib/payment-success";
import { withLocalBookingDetails } from "@/lib/profile-booking";
import type { Booking } from "@/lib/types";
import { useMyBookings } from "@/lib/use-backend-data";

type TicketViewProps = {
  params: Promise<{ reference: string }>;
};

function decodeReference(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function TicketView({ params }: TicketViewProps) {
  const { reference } = use(params);
  const bookingReference = decodeReference(reference);
  const session = useSession();
  const { data: bookings, usingDemo, loading } = useMyBookings();
  const [receipts, setReceipts] = useState<ReturnType<typeof readPaymentReceipts>>([]);
  const [details, setDetails] = useState<ReturnType<typeof readPassengerBookingDetails>>([]);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReceipts(readPaymentReceipts());
      setDetails(readPassengerBookingDetails());
      setSuccessBooking(readPaymentSuccess());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const email = session?.email?.trim().toLowerCase() ?? "";
  const visibleBookings = usingDemo
    ? bookings.filter((booking) => booking.email.trim().toLowerCase() === email)
    : bookings;
  const storedBooking = successBooking?.reference.toLowerCase() === bookingReference.toLowerCase()
    ? successBooking
    : null;
  const booking = storedBooking ?? visibleBookings.find((item) => item.reference.toLowerCase() === bookingReference.toLowerCase());
  const ticketBooking = booking ? withLocalBookingDetails(
    booking,
    receipts.find((item) => item.bookingReference === booking.reference),
    details.find((item) => item.bookingReference === booking.reference),
  ) : null;

  return (
    <main className="module-shell transport-page-shell payment-success-page profile-ticket-page">
      <div className="transport-background" aria-hidden="true" />
      <section className="module-section payment-success-panel" aria-live="polite">
        {!session ? (
          <>
            <p>Sign in to view your ticket.</p>
            <div className="module-actions">
              <Link className="primary-button" href="/login/user">Sign in</Link>
            </div>
          </>
        ) : loading || !ready ? (
          <p role="status">Loading your ticket…</p>
        ) : !ticketBooking ? (
          <p>No ticket was found for this booking.</p>
        ) : (
          <PaymentTicketCard booking={ticketBooking} />
        )}
      </section>
    </main>
  );
}
