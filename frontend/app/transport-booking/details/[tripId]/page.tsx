import { notFound } from "next/navigation";
import { TRIPS } from "../../booking-data";
import BookingDetailsForm from "./form";

export const instant = false;

export default async function BookingDetailsPage({ params }: PageProps<"/transport-booking/details/[tripId]">) {
  const { tripId } = await params;
  const trip = TRIPS.find((item) => item.id === tripId);
  if (!trip) notFound();
  return <BookingDetailsForm trip={trip} />;
}
