"use client";

import { useRouter } from "next/navigation";

const services = [
  {
    title: "Bus Routes",
    description: "Explore available routes and destinations.",
    icon: "🚌",
    href: "/routes",
  },
  {
    title: "Fare Information",
    description: "Check fares before travelling.",
    icon: "💰",
    href: "/fares",
  },
  {
    title: "Staff Portal",
    description: "Access authorized company services.",
    icon: "💼",
    href: "/login",
  },
  {
    title: "Report Information",
    description: "Report incorrect route or fare details.",
    icon: "📝",
    href: "/reports",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full max-w-3xl mx-auto overflow-y-auto bg-gray-50">
      {/* Navigation */}
      <header className="bg-white shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 text-left"
          >
            <span className="text-3xl">🚌</span>
            <span>
              <span className="block text-lg font-bold text-slate-900">
                Transport Hub
              </span>
              <span className="block text-xs text-slate-500">
                Route & Fare Information System
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            //<button
              //onClick={() => router.push("/accounts-reports/register/login")}
              //className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
           >
             Login
            </button>

            <button
              onClick={() => router.push("/accounts-reports/register")}
              className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
            >
              Register
            </button>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="bg-[#12304A] text-white px-5 py-8 min-h-0">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-300">
            Your journey starts here
          </p>

          <h1 className="text-3xl font-bold">
            Travel smarter. Know your route.
          </h1>

          <p className="mt-5 max-w-xl leading-7 text-slate-300">
            Find bus routes, check fare information and access
            transport services in one convenient place.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/routes")}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-[#12304A] hover:bg-sky-100"
            >
              🗺️ Find Routes
            </button>

            <button
              onClick={() => router.push("/fares")}
              className="rounded-lg border border-slate-400 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              💰 Check Fares
            </button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Explore Our Services
          </h2>
          <p className="mt-2 text-slate-600">
            Information and services for passengers and company staff.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <button
              key={service.title}
              onClick={() => router.push(service.href)}
              className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="text-3xl">{service.icon}</span>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {service.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {service.description}
              </p>

              <span className="mt-5 inline-block text-sm font-semibold text-blue-700">
                Explore →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-sm text-slate-500">
          Transport Route and Fare Information System
          <span className="mt-1 block">
            Helping passengers access transport information.
          </span>
        </div>
      </footer>
    </main>
  );
}