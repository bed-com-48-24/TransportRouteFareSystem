import ConfirmationContent from "./confirmation-content";

export const instant = false;

export default async function BookingConfirmationPage({ params }: PageProps<"/transport-booking/confirmation/[reference]">) {
  const { reference } = await params;
  return <ConfirmationContent reference={reference} />;
}
