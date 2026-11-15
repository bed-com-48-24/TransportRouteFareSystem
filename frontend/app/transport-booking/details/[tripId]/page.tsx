"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import TransportBookingPage from "../../page";

<<<<<<< HEAD
function TripDetails() {
=======
function TripDetailsContent() {
>>>>>>> origin/feature/integration
  const { tripId } = useParams<{ tripId: string }>();
  return <TransportBookingPage initialTripId={tripId} />;
}

export default function TripDetailsPage() {
  return (
<<<<<<< HEAD
    <Suspense fallback={null}>
      <TripDetails />
=======
    <Suspense fallback={<main className="module-shell"><p className="module-empty">Loading trip details…</p></main>}>
      <TripDetailsContent />
>>>>>>> origin/feature/integration
    </Suspense>
  );
}