"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout, useSession } from "@/lib/auth";

export default function MainNavigation() {
  const router = useRouter();
  const session = useSession();

  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  // Get the logged-in passenger's name
  useEffect(() => {
    const storedUser = localStorage.getItem("loggedInUser");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.fullName || "");
      } catch {
        setUserName("");
      }
    }
  }, []);

  function handleLogout() {
    setError("");

    try {
      // Admin logout
      if (session?.role === "admin") {
        logout();
        router.push("/maps-admin-integration");
        return;
      }

      // Passenger logout
      localStorage.removeItem("loggedInUser");
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

        {/* Display the user's name when logged in */}
        <Link href="/accounts-reports/home">
          {userName || "Account"}
        </Link>

        <Link href="/maps-admin-integration">Admin tools</Link>

        <button
          type="button"
          className="site-nav-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </nav>

      {error && (
        <span className="site-nav-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}