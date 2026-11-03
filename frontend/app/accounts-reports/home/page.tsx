"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  ["Routes & fares", "Compare routes and fares.", "/routes-fares"],
  ["Nearby stops", "View stops on the map.", "/maps-admin-integration/nearby"],
  ["Book seats", "Reserve seats for your trip.", "/transport-booking"],
  ["My bookings", "View or cancel a booking.", "/transport-booking/my-bookings"],
  [
    "Report an issue",
    "Report incorrect route, fare, or stop details.",
    "/accounts-reports/report",
  ],
];

const backgroundImages = [
  "/bus-outside.jpeg",
  "/bus-inside.jpeg",
];

export default function AccountHomePage() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((previous) =>
        previous === backgroundImages.length - 1 ? 0 : previous + 1
      );
    }, 20000); // Change image every 20 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 text-[#12304A]">
      
      {/* Background slideshow */}
      {backgroundImages.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            index === currentImage ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Page content */}
      <section className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm font-semibold text-white hover:text-gray-200"
        >
          ← Home
        </Link>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-gray-200">
          SBUS
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Travel dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-gray-200">
          Plan trips and manage your account.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(([title, description, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-white/30 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md"
            >
              <h2 className="font-bold">{title}</h2>

              <p className="mt-2 text-sm leading-6 text-[#617B96]">
                {description}
              </p>

              <span className="mt-4 inline-block text-sm font-bold text-[#29466D]">
                Open →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}