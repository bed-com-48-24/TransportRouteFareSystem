import { redirect } from "next/navigation";

/** Keep the old reports URL working while using one shared admin workspace. */
export default function AdminReportsPage() {
  redirect("/maps-admin-integration?panel=admin&section=reports");
}
