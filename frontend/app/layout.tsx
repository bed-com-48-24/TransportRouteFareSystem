import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SBUS | Routes, Fares & Bookings",
  description: "Find transport routes, compare fares, and reserve seats with SBUS.",
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

