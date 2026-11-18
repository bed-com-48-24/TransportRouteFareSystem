import AccountAccessForm from "@/components/AccountAccessForm";

/**
 * The welcome page links straight here. Show the sign-in / create-account form
 * directly so visitors do not have to pick an account type first.
 */
export default function LoginPage() {
  return <AccountAccessForm />;
}