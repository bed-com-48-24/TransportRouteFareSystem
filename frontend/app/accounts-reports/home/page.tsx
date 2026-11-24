import Link from "next/link";

const links = [
  ["Plan a journey", "Search scheduled trips and compare fares.", "/transport-booking"],
  ["Book a trip", "Reserve seats and view the route map for your departure.", "/transport-booking"],
  ["My bookings", "View or cancel a booking.", "/transport-booking/my-bookings"],
  ["Account and support", "Manage your profile or report travel information.", "/accounts-reports"],
];

export default function AccountHomePage() {
  return (
    <main className="account-home-page min-h-screen px-5 py-10 text-[var(--sb-ink)]">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-[var(--sb-ink-soft)]">
          ← Passenger home
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[var(--sb-text-quiet)]">
          SBUS account
        </p>
        <h1 className="mt-2 text-3xl font-bold">Your travel dashboard</h1>
        <p className="mt-2 max-w-2xl text-[var(--sb-text-muted)]">
          Manage your details and continue planning a journey.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(([title, description, href]) => (
            <Link
              key={title}
              href={href}
              className="rounded-2xl border border-[var(--sb-border)] bg-white p-5 shadow-sm transition hover:border-[var(--sb-border-hover)] hover:shadow-md"
            >
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sb-text-quiet)]">
                {description}
              </p>
              <span className="mt-4 inline-block text-sm font-bold text-[var(--sb-ink-soft)]">
                Open →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
