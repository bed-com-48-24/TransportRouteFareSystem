"use client";

import Link from "next/link";
import { usePassengerAuth } from "@/components/PassengerAuthProvider";
import PassengerNotifications from "@/components/PassengerNotifications";

export default function NotificationsPage() {
  const { passenger, ready, error } = usePassengerAuth();

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">ACCOUNT UPDATES</p>
        <h1>Notifications</h1>
      </header>
      {!ready ? (
        <p className="module-empty" role="status">Checking your passenger account…</p>
      ) : passenger ? (
        <PassengerNotifications passenger={passenger} />
      ) : (
        <section className="module-section account-panel account-auth-card">
          <p className="module-copy">Sign in to view your booking notifications.</p>
          {error && <p className="module-error" role="alert">{error}</p>}
          <Link className="primary-button mt-4" href={`/login?next=${encodeURIComponent("/notifications")}`}>Sign in</Link>
        </section>
      )}
    </main>
  );
}
