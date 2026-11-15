import { redirect } from "next/navigation";

/** Keep the old bookings URL working while using one shared admin workspace. */
export default function AdminBookingsPage() {
  redirect("/maps-admin-integration?panel=admin&section=bookings");
}
