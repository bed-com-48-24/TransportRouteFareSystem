"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { loginAdmin, logout, useSession } from "@/lib/auth";

const links = [
  ["/maps-admin-integration/admin/routes", "Routes"],
  ["/maps-admin-integration/admin/fares", "Fares"],
  ["/maps-admin-integration/admin/stops", "Stops"],
  ["/transport-booking/manage", "Bookings"],
  ["/maps-admin-integration/admin/reports", "Reports"],
] as const;

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(loginAdmin(email, password) ? "" : "Invalid administrator email or password.");
  }

  if (session?.role !== "admin") {
    return (
      <main className="account-page">
        <section className="account-card" aria-labelledby="admin-login-title">
          <Link href="/" className="account-back">← Back to SBUS</Link>
          <p className="account-kicker">ADMINISTRATION</p>
          <h1 id="admin-login-title">Administrator sign in</h1>
          <p className="account-description">Sign in to maintain routes, fare estimates, stops, reports, and bookings.</p>
          <form className="account-form" onSubmit={submit}>
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" placeholder="Administrator email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="account-submit" type="submit">Sign in <span aria-hidden="true">→</span></button>
            {error && <p className="account-message" role="alert">{error}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Administration navigation">
        <Link href="/">Home</Link>
        {links.map(([href, label]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
        <button type="button" className="text-action admin-signout" onClick={logout}>
          Sign out ({session.email})
        </button>
      </nav>
      {children}
    </div>
  );
}
