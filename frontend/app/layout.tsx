import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "Routes & Fares | Mthunzi Express",
  description:
    "Search for bus and taxi routes with Mthunzi Express. A warmer welcome to every journey.",
=======
  title: "RouteWise | Routes, Fares & Bookings",
  description: "Find transport routes, compare fares, and reserve seats with RouteWise.",
>>>>>>> origin/main
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

