"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout, useSession } from "@/lib/auth";
import { usePassengerAuth } from "@/components/PassengerAuthProvider";
import { usePassengerNotificationPreferences } from "@/components/usePassengerNotificationPreferences";
import usePassengerNotificationState from "@/components/usePassengerNotificationState";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { Booking } from "@/lib/types";

export default function MainNavigation() {
  const session = useSession();
  const pathname = usePathname();
  const { passenger, error: authError, signOut } = usePassengerAuth();
  const [logoutError, setLogoutError] = useState("");
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const notificationState = usePassengerNotificationState(passenger?.email ?? "");
  const { preferences: notificationPreferences, error: notificationPreferencesError } =
    usePassengerNotificationPreferences(passenger?.email ?? "");
  const notificationCount = passenger && notificationPreferences.inApp
    ? bookings.filter((booking) =>
        booking.email.trim().toLowerCase() === passenger.email.toLowerCase() &&
        !notificationState.readReferences.has(booking.reference) &&
        !notificationState.dismissedReferences.has(booking.reference),
      ).length
    : 0;
  const accountHref = passenger || !pathname.startsWith("/transport-booking")
    ? "/login"
    : `/login?next=${encodeURIComponent(pathname)}`;

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/routes-fares", label: "Routes & fares" },
    { href: "/transport-booking", label: "Bookings" },
    { href: "/help", label: "Help" },
    { href: accountHref, label: passenger ? passenger.fullName : "Sign in" },
  ];

  function isActive(href: string) {
    return href.startsWith("/login")
      ? pathname === "/login" || pathname.startsWith("/login/")
      : pathname === href;
  }

  async function handleLogout() {
    setLogoutError("");
    try {
      if (session?.role === "admin") {
        logout();
      }
      if (passenger) await signOut();
    } catch (reason) {
      setLogoutError(reason instanceof Error ? reason.message : "Could not log out. Please try again.");
    }
  }

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              isActive(item.href) ? "is-active" : "",
              item.href.startsWith("/login") ? "site-nav-login" : "",
            ].filter(Boolean).join(" ")}
            aria-current={isActive(item.href) ? "page" : undefined}
            aria-label={passenger && item.label === passenger.fullName ? `View user information for ${passenger.fullName}` : undefined}
            title={item.href === "/" ? "Home" : undefined}
          >
            {item.href === "/" ? (
              <svg className="inline-block size-5 align-middle" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : passenger && item.href === accountHref ? (
              <span className="inline-flex items-center gap-2">
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>{passenger.fullName}</span>
              </span>
            ) : item.label}
            {item.href === "/" && <span className="sr-only">Home</span>}
          </Link>
        ))}
        <Link
          href="/notifications"
          className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg p-2 text-[#42566c] transition hover:bg-[#eaf2fa] hover:text-[#12304a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466d]${passenger && pathname === "/notifications" ? " bg-[#eaf2fa] text-[#12304a]" : ""}`}
          aria-label={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : "Notifications"}
          title="Notifications"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-5 text-white" aria-hidden="true">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Link>
        {session?.role === "admin" && (
          <button type="button" className="site-nav-logout" onClick={handleLogout}>Admin sign out</button>
        )}
        {passenger && (
          <button type="button" className="site-nav-logout" onClick={handleLogout}>Sign out</button>
        )}
      </nav>
      {(logoutError || authError || (passenger && (notificationState.error || notificationPreferencesError))) && (
        <span className="site-nav-error" role="alert">
          {logoutError || authError || notificationState.error || notificationPreferencesError}
        </span>
      )}
    </>
  );
}
