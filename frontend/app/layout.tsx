import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SBUS | Routes, Fares & Bookings",
  description: "Plan local journeys, compare estimated fares, and reserve seats with SBUS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <header className="site-header">
          <Link className="site-brand" href="/">
            <span className="brand-mark">S</span>
            <span>SBUS<small>Travel information system</small></span>
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <Link href="/routes-fares">Routes &amp; fares</Link>
            <Link href="/maps-admin-integration/nearby">Nearby stops</Link>
            <Link href="/transport-booking">Bookings</Link>
            <Link href="/transport-booking/my-bookings">My bookings</Link>
            <Link href="/accounts-reports/report">Report an issue</Link>
            <Link href="/accounts-reports/login">Account</Link>
            <Link href="/maps-admin-integration">Admin tools</Link>
            <Link href="/accounts-reports/login">Logout</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
