"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { loginAdmin, logout, useSession } from "@/lib/auth";

const links = [
  ["routes", "Routes"],
  ["fares", "Fares"],
  ["stops", "Stops"],
  ["reports", "Reports"],
  ["bookings", "Bookings"],
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
      <main style={{ maxWidth: 380, margin: "48px auto", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Administrator sign in</h1>
        <p style={{ margin: "8px 0 16px" }}>Only authorised administrators can open this area.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <input className="booking-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="booking-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="confirm-button" type="submit">Sign in</button>
          {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <Link href="/">Home</Link>
        {links.map(([slug, label]) => (
          <Link key={slug} href={`/maps-admin-integration/admin/${slug}`}>{label}</Link>
        ))}
        <button type="button" className="text-action" onClick={logout} style={{ marginLeft: "auto" }}>
          Sign out ({session.email})
        </button>
      </nav>
      {children}
    </main>
  );
}
