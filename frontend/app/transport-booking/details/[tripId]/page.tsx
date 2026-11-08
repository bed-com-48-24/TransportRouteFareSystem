import TransportBookingPage from "../../page";

export default async function TripDetailsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TransportBookingPage initialTripId={tripId} />;
}