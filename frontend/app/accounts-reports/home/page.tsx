import Link from "next/link";

const links = [
  ["Routes & fares", "Compare routes and fares.", "/routes-fares"],
  ["Nearby stops", "View stops on the map.", "/maps-admin-integration/nearby"],
  ["Book seats", "Reserve seats for your trip.", "/transport-booking"],
  ["My bookings", "View or cancel a booking.", "/transport-booking/my-bookings"],
  ["Report an issue", "Report incorrect route, fare, or stop details.", "/accounts-reports/report"],
  ["Profile", "Update your personal details.", "/accounts-reports/profile"],
];

export default function AccountHomePage() {
  return (
    <main className="min-h-screen bg-[#F5F8FB] px-5 py-10 text-[#12304A]">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-[#29466D]">← Home</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#617B96]">SBUS</p>
        <h1 className="mt-2 text-3xl font-bold">Travel dashboard</h1>
        <p className="mt-2 max-w-2xl text-[#526D87]">Plan trips and manage your account.</p>
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
