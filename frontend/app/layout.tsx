import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import MainNavigation from "@/components/MainNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "SBUS | Transport routes, fares and bookings",
  description: "Find transport routes, estimated fares, nearby stops, and available trips.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="site-header">
          <Link href="/" className="site-brand" aria-label="SBUS home">
            <span className="site-brand-mark" aria-hidden="true">S</span>
            <span>SBUS<small>Travel information</small></span>
          </Link>
          <Suspense fallback={null}>
            <MainNavigation />
          </Suspense>
        </header>
        <div id="main-content">{children}</div>
        <footer className="site-footer">
          <span>SBUS · Transport information made easier</span>
          <span>Route and fare information is estimated for this demonstration.</span>
        </footer>
      </body>
    </html>
  );
}