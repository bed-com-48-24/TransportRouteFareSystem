"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSession } from "@/lib/auth";
import * as apiBookings from "@/services/bookings.service";

export default function DriverManifestPage() {
  const session = useSession();
  const [scheduleId, setScheduleId] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [manifest, setManifest] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadManifest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManifest(null);
    setError("");
    setLoading(true);
    try {
      const id = Number(scheduleId);
      if (!Number.isSafeInteger(id) || id < 1) throw new Error("Enter a valid schedule ID.");
      setManifest(await apiBookings.driverManifest(id, travelDate));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The trip manifest could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  if (session?.role !== "driver") {
    return (
      <main className="module-shell">
        <section className="module-section">
          <p className="module-eyebrow">DRIVER ACCESS</p>
          <h1>Driver sign in required</h1>
          <p className="module-copy">The manifest endpoint requires an approved driver account.</p>
          <Link className="primary-button" href="/login/driver">Sign in as driver</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">DRIVER WORKSPACE</p>
        <h1>Trip passenger manifest</h1>
        <p>Look up passengers assigned to one of your scheduled trips.</p>
      </header>
      <section className="module-section" aria-labelledby="manifest-heading">
        <div className="module-section-heading"><div><p className="module-eyebrow">SIGNED IN AS {session.email}</p><h2 id="manifest-heading">Load manifest</h2></div></div>
        <form className="module-form admin-demo-lookup" onSubmit={loadManifest}>
          <label>Schedule ID<input inputMode="numeric" value={scheduleId} onChange={(event) => setScheduleId(event.target.value)} required /></label>
          <label>Travel date<input type="date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} required /></label>
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Loading…" : "Load manifest"}</button>
        </form>
        {error && <p className="module-error" role="alert">{error}</p>}
        {manifest !== null && <pre className="admin-demo-record">{JSON.stringify(manifest, null, 2)}</pre>}
      </section>
    </main>
  );
}
