"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout, useSession } from "@/lib/auth";

export default function MainNavigation() {
  const session = useSession();
  const pathname = usePathname();
  const [error, setError] = useState("");

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
      if (session?.role === "admin") {
        logout();
      }
    } catch {
      setError("Could not log out. Please try again.");
    }
  }

  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
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
      </nav>
      {error && <span className="site-nav-error" role="alert">{error}</span>}
    </>
  );
}
