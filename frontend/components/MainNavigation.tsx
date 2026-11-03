"use client";

import Link from "next/link";
<<<<<<< HEAD
import { usePathname } from "next/navigation";
import { useState } from "react";
=======
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
>>>>>>> origin/feature/accounts-reports
import { logout, useSession } from "@/lib/auth";

export default function MainNavigation() {
  const session = useSession();
<<<<<<< HEAD
  const pathname = usePathname();
=======

>>>>>>> origin/feature/accounts-reports
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

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/routes-fares", label: "Routes & fares" },
    { href: "/transport-booking", label: "Bookings" },
    { href: "/help", label: "Help" },
    { href: "/login", label: "Login" },
  ];

  function isActive(href: string) {
    if (href === "/login") {
      return pathname === "/login" || (pathname === "/maps-admin-integration" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("panel") === "admin");
    }
    return pathname === href;
  }

  function handleLogout() {
    setError("");

    try {
      // Admin logout
      if (session?.role === "admin") {
        logout();
      }
<<<<<<< HEAD
=======

      // Passenger logout
      localStorage.removeItem("loggedInUser");
      router.push("/accounts-reports/login");
>>>>>>> origin/feature/accounts-reports
    } catch {
      setError("Could not log out. Please try again.");
    }
  }

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
<<<<<<< HEAD
        {navItems.filter((item) => item.href !== "/login" || session?.role !== "admin").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "is-active" : ""}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        {session?.role === "admin" && (
          <button type="button" className="site-nav-logout" onClick={handleLogout}>Admin sign out</button>
        )}
=======
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
>>>>>>> origin/feature/accounts-reports
      </nav>

      {error && (
        <span className="site-nav-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}