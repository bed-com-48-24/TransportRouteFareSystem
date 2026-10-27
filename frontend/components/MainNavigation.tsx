"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout, useSession } from "@/lib/auth";

export default function MainNavigation() {
  const router = useRouter();
  const session = useSession();
  const [error, setError] = useState("");

  function handleLogout() {
    setError("");

    try {
      if (session?.role === "admin") {
        logout();
        router.push("/maps-admin-integration");
        return;
      }

      router.push("/accounts-reports/login");
    } catch {
      setError("Could not log out. Please try again.");
    }
  }

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/routes-fares">Routes &amp; fares</Link>
        <Link href="/maps-admin-integration/nearby">Nearby stops</Link>
        <Link href="/transport-booking">Bookings</Link>
        <Link href="/transport-booking/my-bookings">My bookings</Link>
        <Link href="/accounts-reports/report">Report an issue</Link>
        <Link href="/accounts-reports/login">Account</Link>
        <Link href="/maps-admin-integration">Admin tools</Link>
        <button type="button" className="site-nav-logout" onClick={handleLogout}>
          Logout
        </button>
      </nav>
      {error && <span className="site-nav-error" role="alert">{error}</span>}
    </>
  );
}
