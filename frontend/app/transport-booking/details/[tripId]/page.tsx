"use client";

import { useParams } from "next/navigation";
import TransportBookingPage from "../../page";

export default function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  return <TransportBookingPage initialTripId={tripId} />;
}