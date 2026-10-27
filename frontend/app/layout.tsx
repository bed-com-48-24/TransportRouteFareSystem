import type { Metadata } from "next";
import Link from "next/link";
import MainNavigation from "@/components/MainNavigation";
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
          <MainNavigation />
        </header>
        {children}
      </body>
    </html>
  );
}
