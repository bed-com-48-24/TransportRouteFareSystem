"use client";

import Link from "next/link";
import PassengerReportForm from "@/components/PassengerReportForm";
import PassengerUserInformation from "@/components/PassengerUserInformation";
import { usePassengerAuth } from "@/components/PassengerAuthProvider";

export default function AccountsReportsPage() {
  const { passenger, ready, error } = usePassengerAuth();

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">SBUS · TRAVEL SUPPORT</p>
        <h1>Account &amp; support</h1>
        <p>
          View your account details, manage notifications, and submit or check travel reports.
        </p>
        <div className="module-shortcuts">
          {!passenger && <Link href="/login">Sign in</Link>}
          {!passenger && <Link href="/login?mode=register">Create passenger account</Link>}
          <Link href="/transport-booking">View trips and bookings</Link>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="account-details-heading">
          <h2 id="account-details-heading" className="mb-3 text-xl font-bold text-[#12304A]">Account details</h2>
          {!ready ? (
            <p className="module-empty" role="status">Checking your passenger account…</p>
          ) : passenger ? (
            <PassengerUserInformation passenger={passenger} />
          ) : (
            <div className="module-section account-panel account-auth-card">
              <p className="module-copy">Sign in or create a passenger account to view your account information and notification preferences.</p>
              {error && <p className="module-error mt-3" role="alert">{error}</p>}
              <div className="module-shortcuts mt-4">
                <Link className="primary-button" href="/login">Sign in</Link>
                <Link href="/login?mode=register">Create account</Link>
              </div>
            </div>
          )}
        </section>

        <section className="module-section account-panel account-auth-card" aria-labelledby="travel-reports-heading" aria-live="polite">
          <div className="module-section-heading">
            <div>
              <p className="module-eyebrow">TRAVEL SUPPORT</p>
              <h2 id="travel-reports-heading">Reports</h2>
            </div>
          </div>
          <p className="module-copy mb-4">
            Tell us about an incorrect route, fare, pickup point, or other travel issue. You can submit a report as a guest.
          </p>
          <PassengerReportForm />
        </section>
      </div>
    </main>
  );
}
