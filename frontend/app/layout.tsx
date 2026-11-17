import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
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
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>
        <div id="main-content">{children}</div>
        <footer className="site-footer">
          <span>SBUS · Transport information made easier</span>
          <span>Route and fare information is estimated for this demonstration.</span>
        </footer>
      </body>
    </html>
  );
}