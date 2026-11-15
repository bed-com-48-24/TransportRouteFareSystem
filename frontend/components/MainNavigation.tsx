"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import BookingNotificationCenter from "@/components/BookingNotificationCenter";
import { logout, useSession } from "@/lib/auth";

type NavItem = { href: string; label: string };

export default function MainNavigation() {
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  const adminNavItems: NavItem[] = [
    { href: "/home", label: "Home" },
    { href: "/maps-admin-integration?panel=admin&section=overview", label: "Overview" },
    { href: "/maps-admin-integration?panel=admin&section=routes", label: "Routes & fares" },
    { href: "/maps-admin-integration?panel=admin&section=schedules", label: "Schedules" },
    { href: "/maps-admin-integration?panel=admin&section=bookings", label: "Bookings" },
    { href: "/maps-admin-integration?panel=admin&section=reports", label: "Reports" },
    { href: "/maps-admin-integration?panel=admin&section=passengers", label: "Passengers" },
    { href: "/maps-admin-integration?panel=admin&section=company", label: "Company" },
    { href: "/help", label: "Help" },
  ];

  const passengerNavItems: NavItem[] = [
    { href: "/home", label: "Home" },
    { href: "/transport-booking", label: "Book a trip" },
    { href: "/help", label: "Help" },
  ];

  const navItems = session?.role === "admin" ? adminNavItems : passengerNavItems;

  const profileHref = session?.role === "admin"
    ? "/maps-admin-integration?panel=admin&section=company"
    : "/profile";

  function isActive(href: string) {
    const [base, query = ""] = href.split("?");
    if (pathname !== base) return false;

    const expected = new URLSearchParams(query);
    if ([...expected.keys()].length === 0) {
      // A plain page link is not active while the administration panel is open.
      return searchParams.get("panel") !== "admin";
    }

    for (const [key, value] of expected.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  function renderNavLink(item: NavItem) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={active ? "is-active" : ""}
        aria-current={active ? "page" : undefined}
      >
        {item.label}
      </Link>
    );
  }

  function handleLogout() {
    setError("");

    try {
      logout();
      router.push("/");
    } catch {
      setError("Could not log out. Please try again.");
    }
  }

  return (
    <>
      {session && (
        <>
          <nav className="site-nav" aria-label="Main navigation">
            {navItems.map(renderNavLink)}
            <div className="site-nav-actions" role="group" aria-label="Account">
              <BookingNotificationCenter />
              <Link
                href={profileHref}
                className="site-profile-badge"
                title={session.role === "admin" ? "SBUS company profile" : "SBUS profile"}
                aria-label={
                  session.role === "admin"
                    ? "Open the SBUS company profile"
                    : "Open your SBUS profile"
                }
              >
                <svg
                  className="site-profile-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
                </svg>
              </Link>
            </div>
            <button type="button" className="site-nav-logout" onClick={handleLogout}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 17l5-5-5-5" />
                <path d="M20 12H9" />
                <path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
              </svg>
              Sign out
            </button>
          </nav>
        </>
      )}
      {error && <span className="site-nav-error" role="alert">{error}</span>}
    </>
  );
}
