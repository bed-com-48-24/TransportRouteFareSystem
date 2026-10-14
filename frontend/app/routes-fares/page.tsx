"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const brandName = "Mthunzi Express";
const popularDestinations = ["Blantyre", "Lilongwe", "Mzuzu", "Zomba", "Salima"];

export default function RoutesFaresPage() {
  const [destination, setDestination] = useState("");
  const [searchedDestination, setSearchedDestination] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    searchDestination(destination);
  }

  function searchDestination(value: string) {
    const normalizedDestination = value.trim().replace(/\s+/g, " ");

    if (!normalizedDestination) {
      setError("Enter a destination to search.");
      setSearchedDestination(null);
      return;
    }

    if (normalizedDestination.length < 2) {
      setError("Enter at least 2 characters.");
      setSearchedDestination(null);
      return;
    }

    if (!/^[\p{L}\p{M}\s'-]+$/u.test(normalizedDestination)) {
      setError("Use letters, spaces, apostrophes, or hyphens only.");
      setSearchedDestination(null);
      return;
    }

    setError("");
    setDestination(normalizedDestination);
    setSearchedDestination(normalizedDestination);
  }

  return (
    <main className="min-h-screen bg-white text-[#26364d]">
      <a
        href="#destination-search"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-[#14233b] focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-[#29466d]"
      >
        Skip to destination search
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Mthunzi Express home"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#14233b] text-white shadow-sm">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="size-5"
              >
                <path
                  d="M4 15.5 5.5 9a2 2 0 0 1 1.94-1.5h9.12A2 2 0 0 1 18.5 9l1.5 6.5V19h-2v-2H6v2H4v-3.5ZM6 13h12M8 10h.01M16 10h.01M8 15.5h.01M16 15.5h.01M8 4.5l4-2 4 2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-[#14233b]">
              {brandName}
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-[#64748b]">
                Travel • Connect • Belong
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-5 text-sm font-medium text-[#52627a]"
          >
            <span className="hidden sm:inline">A warmer way to travel</span>
            <span className="rounded-full bg-[#eef2f7] px-3 py-1.5 text-xs font-semibold text-[#29466d]">
              Routes &amp; fares
            </span>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#14233b]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&w=2000&q=90')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[#111c30]/75"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-12 pt-14 text-center sm:px-8 sm:pb-16 sm:pt-20">
          <section className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">
              ROUTES, FARES &amp; LOCAL TRAVEL
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Know the way before you go.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white sm:text-lg">
              Search a destination and get ready to explore bus and taxi
              options. We’ll make it clear when verified route and fare
              information is available.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-sm font-medium text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                  <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Destination search
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                  <path d="M2.5 6.5h15v9h-15zM5 6.5l1.5-3h7l1.5 3m-10 9v1.5m9-1.5v1.5M5.5 10h.01M14.5 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Buses &amp; taxis
              </span>
            </div>
          </section>

          <section
            id="destination-search"
            aria-label="Search for a destination"
            tabIndex={-1}
            className="mt-8 w-full max-w-3xl rounded-2xl border border-white/80 bg-white p-4 text-left shadow-2xl shadow-[#101b30]/20 focus:outline-2 focus:outline-offset-4 focus:outline-white sm:p-6"
          >
            <form onSubmit={handleSearch} noValidate>
            <label
              htmlFor="destination"
              className="mb-2 block text-sm font-semibold text-[#26364d]"
            >
              Destination
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                >
                  <circle
                    cx="10.8"
                    cy="10.8"
                    r="6.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="m16 16 4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="destination"
                  name="destination"
                  type="search"
                  autoComplete="off"
                  maxLength={60}
                  required
                  aria-describedby={`destination-help${error ? " destination-error" : ""}`}
                  value={destination}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setError("");
                    setSearchedDestination(null);
                  }}
                  placeholder="e.g. Blantyre, Mzuzu or Zomba"
                  aria-invalid={Boolean(error)}
                  aria-required="true"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-base text-[#26364d] outline-none transition placeholder:text-slate-500 focus:border-[#29466d] focus:ring-4 focus:ring-[#29466d]/10 aria-[invalid=true]:border-red-500 motion-reduce:transition-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#14233b] px-6 text-sm font-semibold text-white transition hover:bg-[#29466d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466d] motion-reduce:transition-none"
              >
                Search routes
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-4"
                >
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {error ? (
              <p
                id="destination-error"
                role="alert"
                className="mt-2 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            ) : (
              <div id="destination-help" className="mt-2 text-sm text-slate-600">
                <p>Enter a destination to check for travel information.</p>
                <p className="sr-only">
                  Screen reader instructions: Type a town or city in the
                  Destination field, then activate Search routes. You can also
                  choose a popular destination button. Search results will be
                  announced after you search. Verified route, fare, and
                  departure information is not currently connected.
                </p>
              </div>
            )}
              <fieldset className="mt-5 border-t border-slate-100 pt-4">
                <legend className="mb-2.5 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Popular destinations
                </legend>
                <div className="flex flex-wrap gap-2">
                  {popularDestinations.map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => searchDestination(place)}
                      className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-[#29466d] transition hover:border-[#29466d] hover:bg-[#eef2f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466d] motion-reduce:transition-none"
                    >
                      {place}
                    </button>
                  ))}
                </div>
              </fieldset>
            </form>
          </section>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <section
          aria-labelledby="routes-fares-heading"
          className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              PLAN WITH CONFIDENCE
            </p>
            <h2
              id="routes-fares-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-[#14233b]"
            >
              Routes &amp; fares, at a glance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Find a destination first, then check the travel details that
              matter before setting off.
            </p>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
            <article className="bg-white p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2f7] text-[#29466d]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-5"
                  >
                    <path
                      d="M4 15.5 5.5 9a2 2 0 0 1 1.94-1.5h9.12A2 2 0 0 1 18.5 9l1.5 6.5V19h-2v-2H6v2H4v-3.5ZM6 13h12M8 10h.01M16 10h.01"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-[#14233b]">
                    Route options
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Search by town or city to start exploring bus and taxi
                    travel. Verified routes, stops, and departure times are not
                    connected yet.
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    Route data coming soon
                  </span>
                </div>
              </div>
            </article>
            <article className="bg-white p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2f7] text-[#29466d]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-5"
                  >
                    <path
                      d="M12 3v18m4-14.5c-.7-1-2-1.5-4-1.5-2.2 0-3.5 1-3.5 2.5S10 10 12 10s3.5 1 3.5 2.5S14.2 15 12 15c-2 0-3.3-.5-4-1.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-[#14233b]">
                    Fare estimates
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Fares can vary by operator and service. We don’t show
                    unverified prices; please confirm the current fare with
                    your transport provider.
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    Verified fares coming soon
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <div aria-live="polite" aria-atomic="true">
          {searchedDestination === null ? (
            <section
              aria-labelledby="start-search-heading"
              className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#eef2f7] text-[#29466d]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-6"
                >
                  <path
                    d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="2.3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <h2
                id="start-search-heading"
                className="mt-4 text-lg font-semibold text-[#14233b]"
              >
                Find a route to your destination
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose a popular destination or search for a town or city
                above. We’ll show the travel information status for it here.
              </p>
            </section>
          ) : (
            <section
              aria-labelledby="travel-information-heading"
              className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm"
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#eef2f7] text-[#29466d]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-6"
                >
                  <path
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.42-1.42M7.06 7.06 5.64 5.64m12.72 0-1.42 1.42M7.06 16.94l-1.42 1.42M8 12h8"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <h2
                id="travel-information-heading"
                className="mt-4 text-lg font-semibold text-[#14233b]"
              >
                Travel information for {searchedDestination}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                We don’t have verified bus or taxi routes, fare estimates, or
                departure times for this destination yet. Please confirm
                available services and current prices with a local transport
                provider.
              </p>
              <p className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Verified route and fare details are not available yet
              </p>
            </section>
          )}
        </div>

        <footer className="mx-auto mt-12 max-w-3xl border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">
          Search for destinations and get ready to explore your travel options.
        </footer>
      </div>
    </main>
  );
}