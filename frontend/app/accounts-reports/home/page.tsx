"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const services = [
  {
    title: "Bus Routes",
    description: "Explore available routes and destinations.",
    href: "/routes",
  },
  {
    title: "Fare Information",
    description: "Check fares before travelling.",
    href: "/routes-fares",
  },
  {
    title: "Staff Portal",
    description: "Access authorized company services.",
    href: "/login",
  },
  {
    title: "Report Information",
    description: "Report incorrect route or fare details.",
    href: "/accounts-reports/report",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto max-w-2xl rounded-xl bg-white shadow-md">
      {/* Navigation */}
      <header className="bg-white shadow-sm">
        <nav className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-left"
          >
            <span className="text-2xl"></span>
            <span>
              <span className="block text-base font-bold text-slate-900">
                SBUS
              </span>
              <span className="block text-xs text-[#617B96]">
                Route & Fare Information System
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/accounts-reports/login")}
              className="rounded-lg px-4 py-2 font-medium text-[#29466D] hover:bg-[#EAF2FA]"
            >
              Login
            </button>

            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex flex-col items-center justify-center gap-1 rounded-lg bg-[#14233b] px-4 py-2 text-sm font-medium text-white hover:bg-[#29466d]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                </svg>
                My Account
              </button>

              {showAccountMenu && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-2 shadow-lg"
                >
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      router.push("/accounts-reports/profile");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Manage profile
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      router.push("/accounts-reports/login");
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="bg-[#12304A] text-white">
        <div className=" px-5 py-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white">
            Your journey starts here
          </p>

          <h1 className="max-w-2xl text-2xl font-bold leading-tight md:text-3xl">
            Travel smarter. Know your route.
          </h1>

          <div className="mt-4 flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/routes")}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#12304A] hover:bg-[#EAF2FA]"
            >
              🗺️ Find Routes
            </button>

            <button
              onClick={() => router.push("/fares")}
              className="rounded-lg border border-[#AABBD0] px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
               Check Fares
            </button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-5 py-4">
        <div className="mb-8">
          <h2 className="text-base font-bold text-[#12304A]">
            Explore Our Services
          </h2>
          
        </div>

        <div className="grid grid-cols-2 gap-3">
          {services.map((service) => (
            <button
              key={service.title}
              onClick={() => router.push(service.href)}
              className="rounded-lg border border-[#D7E2EF] bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >

              <h3 className="mt-2 text-lg font-semibold text-[#12304A]">
                {service.title}
              </h3>

              <p className="mt-1 text-sm leading-4 text-[#526D87]">
                {service.description}
              </p>

              <span className="mt-2 inline-block text-xs font-semibold text-[#14233b]">
                Explore →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#D7E2EF] bg-white">
        <div className="px-5 py-3 text-xs text-[#617B96]">
          Transport Route and Fare Information System
          <span className="mt-1 block">
            Helping passengers access transport information.
          </span>
        </div>
      </footer>
      </div>
    </main>
  );
}