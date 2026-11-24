"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import TransportBookingPage from "../../page";

function TripDetails() {
  const { tripId } = useParams<{ tripId: string }>();
  const searchParams = useSearchParams();
  return (
    <TransportBookingPage
      initialTripId={tripId}
      initialDate={searchParams.get("date") ?? undefined}
    />
  );
}

export default function TripDetailsPage() {
  return (
    <Suspense fallback={(
      <main className="module-shell" aria-busy="true">
        <div className="module-empty" role="status">Opening your trip…</div>
      </main>
    )}>
      <TripDetails />
    </Suspense>
  );
}
