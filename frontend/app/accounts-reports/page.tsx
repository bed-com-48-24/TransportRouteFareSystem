"use client";

import Link from "next/link";
import PassengerReportForm from "@/components/PassengerReportForm";

export default function AccountsReportsPage() {
  return (
    <main className="module-shell account-auth-shell">
      <header className="module-intro account-auth-intro">
        <p className="module-eyebrow">SBUS · TRAVEL SUPPORT</p>
        <h1>Report route or travel information.</h1>
        <p>
          Tell us about an incorrect route, fare, pickup point, or other travel issue.
          You can continue browsing without creating an account.
        </p>
        <div className="module-shortcuts">
          <Link href="/routes-fares">Continue as a guest</Link>
          <Link href="/transport-booking">View trips and bookings</Link>
        </div>
      </header>

      <section className="module-section account-panel account-auth-card" aria-live="polite">
        <div className="module-section-heading">
          <div>
            <p className="module-eyebrow">TRAVEL REPORT</p>
            <h2>Submit a report</h2>
          </div>
        </div>
        <PassengerReportForm />
      </section>
    </main>
  );
}
