import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/maps-admin-integration?panel=admin");
}
