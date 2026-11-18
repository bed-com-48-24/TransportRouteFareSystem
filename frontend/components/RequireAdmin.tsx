"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { logout, useSession } from "@/lib/auth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();

  function signOut() {
    logout();
    router.push("/");
  }

  if (session?.role !== "admin") {
    const signedInAsOther = Boolean(session);

    return (
      <section className="account-page">
        <section className="account-card" aria-labelledby="admin-login-title">
          <p className="account-kicker">STAFF ACCESS</p>
          <h1 id="admin-login-title">
            {signedInAsOther ? "Staff access only" : "Sign in required"}
          </h1>
          <p className="account-description">
            {signedInAsOther
              ? "This area is only for transport company administrators. Your account does not have administrator access."
              : "Sign in with your company account to manage routes, fares, stops, reports, and bookings."}
          </p>

          {signedInAsOther ? (
            <button type="button" className="account-submit" onClick={signOut}>
              Log out ({session?.email}) <span aria-hidden="true">→</span>
            </button>
          ) : (
            <Link className="account-submit" href="/login">
              Go to sign in <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      </section>
    );
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Administration navigation">
        <button type="button" className="text-action admin-signout" onClick={signOut}>
          Log out ({session.email})
        </button>
      </nav>
      {children}
    </div>
  );
}