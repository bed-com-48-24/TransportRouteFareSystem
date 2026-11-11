"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import TransportBookingPage from "../../page";

function TripDetailsContent() {
  const { tripId } = useParams<{ tripId: string }>();
  return <TransportBookingPage initialTripId={tripId} />;
}

export default function TripDetailsPage() {
  return (
    <Suspense fallback={<main className="module-shell"><p className="module-empty">Loading trip details…</p></main>}>
      <TripDetailsContent />
    </Suspense>
  );
}