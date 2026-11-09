"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import TransportBookingPage from "../../page";

function TripDetails() {
  const { tripId } = useParams<{ tripId: string }>();
  return <TransportBookingPage initialTripId={tripId} />;
}

export default function TripDetailsPage() {
  return (
    <Suspense fallback={null}>
      <TripDetails />
    </Suspense>
  );
}