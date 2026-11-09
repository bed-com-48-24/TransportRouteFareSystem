import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect("/accounts-reports?mode=forgot-password");
}
