import Link from "next/link";

const links = [
  ["Plan a journey", "Search routes, connected legs, boarding points, and estimated fares.", "/routes-fares"],
  ["Nearby stops", "Find pickup and drop-off points on the map.", "/maps-admin-integration/nearby"],
  ["Book a trip", "Reserve seats and receive a booking reference.", "/transport-booking"],
  ["My bookings", "Look up or cancel a reservation using your email.", "/transport-booking/my-bookings"],
  ["Report information", "Send a correction about a route, fare, or stop.", "/accounts-reports/report"],
  ["Manage profile", "Update personal information saved on this browser.", "/accounts-reports/profile"],
];

export default function AccountHomePage() {
  return (
    <main className="min-h-screen bg-[#F5F8FB] px-5 py-10 text-[#12304A]">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-[#29466D]">← Passenger home</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#617B96]">SBUS account</p>
        <h1 className="mt-2 text-3xl font-bold">Your travel dashboard</h1>
        <p className="mt-2 max-w-2xl text-[#526D87]">Manage your details and continue planning a journey.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(([title, description, href]) => (
            <Link key={href} href={href} className="rounded-2xl border border-[#D7E2EF] bg-white p-5 shadow-sm transition hover:border-[#AABBD0] hover:shadow-md">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#617B96]">{description}</p>
              <span className="mt-4 inline-block text-sm font-bold text-[#29466D]">Open →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
