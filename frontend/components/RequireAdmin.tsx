"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { loginAdmin, logout, registerAdmin, useSession } from "@/lib/auth";

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      if (mode === "register") {
        if (password.length < 8) {
          setError("Use at least 8 characters for your password.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        await registerAdmin(email, password);
        return;
      }

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
      <main className="account-page">
        <section className="account-card" aria-labelledby="admin-login-title">
          <Link href="/maps-admin-integration" className="account-back">← Admin tools</Link>
          <p className="account-kicker">ADMIN TOOLS</p>
          <h1 id="admin-login-title">
            {mode === "login" ? "Administrator sign in" : "Create admin account"}
          </h1>
          <p className="account-description">
            {mode === "login"
              ? "Sign in to manage routes, fares, stops, reports, and bookings."
              : "Create an account to manage the transport system."}
          </p>
          <form className="account-form" onSubmit={submit}>
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 8 : undefined} placeholder={mode === "register" ? "At least 8 characters" : "Password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {mode === "register" && (
              <>
                <label htmlFor="admin-confirm-password">Confirm password</label>
                <input id="admin-confirm-password" type="password" autoComplete="new-password" placeholder="Enter your password again" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </>
            )}
            <button className="account-submit" type="submit">
              {mode === "login" ? "Sign in" : "Create account"} <span aria-hidden="true">→</span>
            </button>
            {error && <p className="account-message" role="alert">{error}</p>}
          </form>
          <p className="account-guest">
            {mode === "login" ? "Need an admin account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="account-text-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
          <p className="account-footnote">
            Demo only: accounts are stored in this browser and are not secure for production use.
          </p>
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
          Log out ({session.email})
        </button>
      </nav>
      {children}
    </div>
  );
}
