"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { loginAdmin, useSession } from "@/lib/auth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      if (!(await loginAdmin(email, password))) {
        setError("Invalid administrator email or password.");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Administrator sign-in is unavailable. Please try again.",
      );
    }
  }

  if (session?.role !== "admin") {
    return (
      <section className="account-page">
        <section className="account-card" aria-labelledby="admin-login-title">
          <p className="account-kicker">STAFF ACCESS</p>
          <h1 id="admin-login-title">Staff sign in</h1>
          <p className="account-description">
            Sign in with your company account to manage routes, fares, stops, reports, and bookings.
          </p>
          <form className="account-form" onSubmit={submit}>
            <label htmlFor="admin-email">Company email address</label>
            <input id="admin-email" type="email" autoComplete="username" placeholder="name@yourcompany.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="account-submit" type="submit">
              Sign in <span aria-hidden="true">→</span>
            </button>
            {error && <p className="account-message" role="alert">{error}</p>}
          </form>
          <p className="account-footnote">
            Need a company account? <Link href="/login/admin">Sign in or create one here</Link>.
          </p>
        </section>
      </section>
    );
  }

  return (
    <div className="admin-shell">
      {children}
    </div>
  );
}
