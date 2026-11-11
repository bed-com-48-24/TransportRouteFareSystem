"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { loginAdmin, logout, useSession } from "@/lib/auth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
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
          {!showSignIn ? (
            <>
              <h1 id="admin-login-title">Staff sign-in required</h1>
              <p className="account-description">
                Please sign in to access route, fare, stop, report, and booking management.
              </p>
              <button className="account-submit" type="button" onClick={() => setShowSignIn(true)}>
                Sign in <span aria-hidden="true">→</span>
              </button>
            </>
          ) : (
            <>
              <h1 id="admin-login-title">Staff sign in</h1>
              <p className="account-description">
                Sign in to manage routes, fares, stops, reports, and bookings.
              </p>
              <form className="account-form" onSubmit={submit}>
                <label htmlFor="admin-email">Email or username</label>
                <input id="admin-email" type="text" autoComplete="username" placeholder="Enter any username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <label htmlFor="admin-password">Password</label>
                <input id="admin-password" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button className="account-submit" type="submit">
                  Sign in <span aria-hidden="true">→</span>
                </button>
                {error && <p className="account-message" role="alert">{error}</p>}
              </form>
              <button className="account-footnote" type="button" onClick={() => { setShowSignIn(false); setError(""); }}>
                Back
              </button>
              <p className="account-footnote">
                Prototype only: any non-empty username and password will open staff tools.
              </p>
            </>
          )}
        </section>
      </section>
    );
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Administration navigation">
        <button type="button" className="text-action admin-signout" onClick={logout}>
          Log out ({session.email})
        </button>
      </nav>
      {children}
    </div>
  );
}
