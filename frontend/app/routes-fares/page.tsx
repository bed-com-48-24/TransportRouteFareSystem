"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { KEYS, SEED_FARES, SEED_ROUTES, SEED_STOPS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { Booking, FareItem, RouteItem, StopItem, Trip } from "@/lib/types";
import { availableSeats, TRIPS } from "@/lib/booking-data";

const popularDestinations = ["Blantyre", "Lilongwe", "Mzuzu", "Zomba", "Salima"];
const ROUTE_STOPOVERS: Record<string, string[]> = {
  "blantyre-lilongwe-coach": ["Zomba", "Balaka", "Dedza"],
};

type RouteOption = {
  id: string;
  origin: string;
  destination: string;
  service: string;
  pickupPoint: string;
  dropOffPoint: string;
  estimatedFare: number | null;
  stopovers: string[];
};

type JourneyOption = {
  legs: RouteOption[];
  totalFare: number | null;
};

function findJourneyOptions(origin: string, destination: string, sampleRoutes: RouteOption[]): JourneyOption[] {
  const cities = [...new Set(sampleRoutes.flatMap((route) => [route.origin, route.destination]))];
  const journeys: JourneyOption[] = [];

  function findPaths(
    currentCity: string,
    visitedCities: Set<string>,
    legs: RouteOption[],
  ) {
    if (legs.length >= cities.length - 1) {
      return;
    }

    for (const route of sampleRoutes) {
      if (
        route.origin.toLocaleLowerCase() !== currentCity.toLocaleLowerCase() ||
        visitedCities.has(route.destination.toLocaleLowerCase())
      ) {
        continue;
      }

      const nextLegs = [...legs, route];
      if (route.destination.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
        journeys.push({
          legs: nextLegs,
          totalFare: nextLegs.some((leg) => leg.estimatedFare === null)
            ? null
            : nextLegs.reduce((total, leg) => total + (leg.estimatedFare ?? 0), 0),
        });
        continue;
      }

      const nextVisitedCities = new Set(visitedCities);
      nextVisitedCities.add(route.destination.toLocaleLowerCase());
      findPaths(route.destination, nextVisitedCities, nextLegs);
    }
  }

  findPaths(origin, new Set([origin.toLocaleLowerCase()]), []);
  return journeys.sort(
      (first, second) =>
      first.legs.length - second.legs.length || (first.totalFare ?? Infinity) - (second.totalFare ?? Infinity),
  );
}

function findTripForRoute(route: RouteOption, trips: Trip[] = TRIPS) {
  const routeName = `${route.origin} → ${route.destination}`.toLocaleLowerCase();
  return trips.find((trip) => trip.route.toLocaleLowerCase() === routeName);
}

export default function RoutesFaresPage() {
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);
  const stops = useStoredList<StopItem>(KEYS.stops, SEED_STOPS);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const availableTrips = TRIPS.filter((trip) => availableSeats(trip, bookings) > 0);
  const availableRouteNames = new Set(availableTrips.map((trip) => trip.route.toLocaleLowerCase()));
  const sampleRoutes: RouteOption[] = routes.filter((route) =>
    availableRouteNames.has(`${route.origin} → ${route.destination}`.toLocaleLowerCase()),
  ).map((route) => {
    const pickup = stops.find((stop) => stop.city.toLowerCase() === route.origin.toLowerCase() && (stop.kind === "pickup" || stop.kind === "both"));
    const dropoff = stops.find((stop) => stop.city.toLowerCase() === route.destination.toLowerCase() && (stop.kind === "dropoff" || stop.kind === "both"));
    return {
      ...route,
      pickupPoint: pickup?.name ?? `Pickup point in ${route.origin}`,
      dropOffPoint: dropoff?.name ?? `Drop-off point in ${route.destination}`,
      estimatedFare: fares.find((fare) => fare.routeId === route.id)?.amount ?? null,
      stopovers: ROUTE_STOPOVERS[route.id] ?? [],
    };
  });
  const cities = [...new Set(sampleRoutes.flatMap((route) => [route.origin, route.destination]))].sort();
  function reachableDestinations(from: string) {
    return cities.filter((city) => city !== from && findJourneyOptions(from, city, sampleRoutes).length > 0);
  }
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [searchedOrigin, setSearchedOrigin] = useState<string | null>(null);
  const [searchedDestination, setSearchedDestination] = useState<string | null>(
    null,
  );
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState(0);
  const [error, setError] = useState("");
  const destinationOptions = origin ? reachableDestinations(origin) : cities;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    searchJourney(origin, destination);
  }

  function swapLocations() {
    if (!origin || !destination || findJourneyOptions(destination, origin, sampleRoutes).length === 0) return;
    setOrigin(destination);
    setDestination(origin);
    setSelectedJourneyIndex(0);
    setError("");
    setSearchedOrigin(null);
    setSearchedDestination(null);
  }

  function focusJourneySearch(field: "origin" | "destination") {
    const searchPanel = document.getElementById("destination-search");
    const input = document.getElementById(field);
    searchPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  }

  function searchJourney(originValue: string, destinationValue: string) {
    const normalizedOrigin = originValue.trim().replace(/\s+/g, " ");
    const normalizedDestination = destinationValue.trim().replace(/\s+/g, " ");

    if (!normalizedOrigin || !normalizedDestination) {
      setError("Enter both an origin and a destination.");
      setSearchedOrigin(null);
      setSearchedDestination(null);
      return;
    }

    if (normalizedOrigin.length < 2 || normalizedDestination.length < 2) {
      setError("Enter at least 2 characters for both locations.");
      setSearchedOrigin(null);
      setSearchedDestination(null);
      return;
    }

    if (
      !/^[\p{L}\p{M}\s'-]+$/u.test(normalizedOrigin) ||
      !/^[\p{L}\p{M}\s'-]+$/u.test(normalizedDestination)
    ) {
      setError("Use letters, spaces, apostrophes, or hyphens only.");
      setSearchedOrigin(null);
      setSearchedDestination(null);
      return;
    }

    if (
      normalizedOrigin.toLocaleLowerCase() ===
      normalizedDestination.toLocaleLowerCase()
    ) {
      setError("Starting point and final destination must be different.");
      setSearchedOrigin(null);
      setSearchedDestination(null);
      return;
    }

    const knownOrigin = cities.find(
      (city) => city.toLocaleLowerCase() === normalizedOrigin.toLocaleLowerCase(),
    );
    const knownDestination = knownOrigin && reachableDestinations(knownOrigin).find(
      (city) =>
        city.toLocaleLowerCase() === normalizedDestination.toLocaleLowerCase(),
    );

    if (!knownOrigin || !knownDestination) {
      setError("Choose a destination with a scheduled route and available seats.");
      setSearchedOrigin(null);
      setSearchedDestination(null);
      return;
    }

    setError("");
    setSelectedJourneyIndex(0);
    setOrigin(knownOrigin);
    setDestination(knownDestination);
    setSearchedOrigin(knownOrigin);
    setSearchedDestination(knownDestination);
  }

  function selectPopularDestination(place: string) {
    setDestination(place);
    setError("");
    setSearchedOrigin(null);
    setSearchedDestination(null);
    if (origin.trim()) {
      searchJourney(origin, place);
    }
  }

  const matchingJourneys =
    searchedOrigin === null || searchedDestination === null
      ? []
      : findJourneyOptions(searchedOrigin, searchedDestination, sampleRoutes);
  const selectedJourney =
    matchingJourneys[selectedJourneyIndex] ?? matchingJourneys[0] ?? null;
  const selectedJourneyStops = selectedJourney && searchedOrigin
    ? [searchedOrigin, ...selectedJourney.legs.flatMap((leg) => [...leg.stopovers, leg.destination])]
    : [];
  const selectedJourneyTrip = selectedJourney?.legs.length === 1
    ? findTripForRoute(selectedJourney.legs[0], availableTrips)
    : undefined;

  useEffect(() => {
    if (searchedOrigin === null || searchedDestination === null) {
      return;
    }

    const results = document.getElementById("journey-results");
    results?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    results?.focus({ preventScroll: true });
  }, [searchedOrigin, searchedDestination]);

  return (
    <main className="min-h-screen bg-white text-[#12304A]">
      <a
        href="#destination-search"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-[#0D2438] focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-[#1B4B72]"
      >
        Skip to destination search
      </a>
      <section className="relative isolate overflow-hidden bg-[#0D2438]">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-12 pt-14 text-center sm:px-8 sm:pb-16 sm:pt-20">
          <section className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">
              ROUTES, FARES &amp; LOCAL TRAVEL
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Know the way before you go.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white sm:text-lg">
              Find direct and connecting bus and minibus routes, with sample
              fares, stops, and transfer guidance for the full journey.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-sm font-medium text-white">
              <button
                type="button"
                onClick={() => document.getElementById("destination")?.focus()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/50 bg-white/15 px-3 py-1.5 backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                  <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Destination search
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("routes-fares-heading")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/50 bg-white/15 px-3 py-1.5 backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                  <path d="M2.5 6.5h15v9h-15zM5 6.5l1.5-3h7l1.5 3m-10 9v1.5m9-1.5v1.5M5.5 10h.01M14.5 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Buses &amp; taxis
              </button>
            </div>
          </section>

          <section
            id="destination-search"
            aria-label="Search for a journey"
            tabIndex={-1}
            className="mt-8 w-full max-w-3xl rounded-2xl border border-white/80 bg-white p-4 text-left shadow-2xl shadow-[#0D2438]/20 focus:outline-2 focus:outline-offset-4 focus:outline-white sm:p-6"
          >
            <form onSubmit={handleSearch} noValidate>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-end">
                <div>
                  <label
                    htmlFor="origin"
                    className="mb-2 block text-sm font-semibold text-[#26364d]"
                  >
                    Starting point
                  </label>
                  <select
                    id="origin"
                    name="origin"
                    required
                    aria-describedby={`journey-help${error ? " journey-error" : ""}`}
                    value={origin}
                    onChange={(event) => {
                      const nextOrigin = event.target.value;
                      setOrigin(nextOrigin);
                      if (!reachableDestinations(nextOrigin).includes(destination)) setDestination("");
                      setError("");
                      setSearchedOrigin(null);
                      setSearchedDestination(null);
                    }}
                    aria-invalid={Boolean(error)}
                    aria-required="true"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-[#26364d] outline-none transition placeholder:text-slate-500 focus:border-[#29466d] focus:ring-4 focus:ring-[#29466d]/10 aria-[invalid=true]:border-red-500 motion-reduce:transition-none"
                  >
                    <option value="">Choose a starting town</option>
                    {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={swapLocations}
                  disabled={!origin || !destination || findJourneyOptions(destination, origin, sampleRoutes).length === 0}
                  aria-label="Swap starting point and destination"
                  title="Swap locations"
                  className="inline-flex size-12 items-center justify-self-center rounded-xl border border-slate-300 text-[#29466d] transition hover:border-[#29466d] hover:bg-[#eef2f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466d] motion-reduce:transition-none md:h-12 md:w-auto md:px-3"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
                    <path d="M7 7h13m0 0-3-3m3 3-3 3M17 17H4m0 0 3 3m-3-3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div>
                  <label
                    htmlFor="destination"
                    className="mb-2 block text-sm font-semibold text-[#26364d]"
                  >
                    Final destination
                  </label>
                  <select
                    id="destination"
                    name="destination"
                    required
                    disabled={!origin || destinationOptions.length === 0}
                    aria-describedby={`journey-help${error ? " journey-error" : ""}`}
                    value={destination}
                    onChange={(event) => {
                      setDestination(event.target.value);
                      setError("");
                      setSearchedOrigin(null);
                      setSearchedDestination(null);
                    }}
                    aria-invalid={Boolean(error)}
                    aria-required="true"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-[#26364d] outline-none transition placeholder:text-slate-500 focus:border-[#29466d] focus:ring-4 focus:ring-[#29466d]/10 aria-[invalid=true]:border-red-500 motion-reduce:transition-none"
                  >
                    <option value="">{origin ? "Choose a reachable destination" : "Choose a starting town first"}</option>
                    {destinationOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0D2438] px-6 text-sm font-semibold text-white transition hover:bg-[#1B4B72] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4B72] motion-reduce:transition-none md:w-auto"
              >
                Find journey
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
                id="journey-error"
                role="alert"
                className="mt-2 text-sm font-medium text-[#12304A]"
              >
                {error}
              </p>
            ) : (
              <div id="journey-help" className="mt-2 text-sm text-slate-600">
                <p>Choose an origin to see destinations with a scheduled route and available seats.</p>
                <p className="sr-only">
                  Enter a starting point and final destination, then choose
                  Find journey. Connecting legs and transfer stops are shown
                  in travel order. Popular destination buttons fill the final
                  destination.
                </p>
              </div>
            )}
              <fieldset className="mt-5 border-t border-[#D7E2EF] pt-4">
                <legend className="mb-2.5 pt-4 text-xs font-semibold uppercase tracking-wider text-[#526D87]">
                  Popular destinations
                </legend>
                <div className="flex flex-wrap gap-2">
                  {popularDestinations.filter((place) => destinationOptions.includes(place)).map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => selectPopularDestination(place)}
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
        <div aria-live="polite" aria-atomic="true" className="mb-8">
          {searchedOrigin === null || searchedDestination === null ? (
            <section
              aria-labelledby="start-search-heading"
              className="mx-auto max-w-4xl rounded-2xl border border-dashed border-[#C7D8E8] bg-white px-4 py-8 text-center sm:px-6 sm:py-10"
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#EDF4FA] text-[#1B4B72]">
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
                className="mt-4 text-lg font-semibold text-[#0D2438]"
              >
                Plan your full journey
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Enter where you are starting and where you are going. We’ll
                show each route leg in order, including where to change.
              </p>
            </section>
          ) : (
            <section
              id="journey-results"
              aria-labelledby="travel-information-heading"
              tabIndex={-1}
              className="mx-auto max-w-4xl scroll-mt-6 focus:outline-none"
            >
              <div className="mb-5">
                <h2
                  id="travel-information-heading"
                  className="break-words text-xl font-bold text-[#0D2438] sm:text-2xl"
                >
                  Journey from {searchedOrigin} to {searchedDestination}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {matchingJourneys.length
                    ? `${matchingJourneys.length} sample ${matchingJourneys.length === 1 ? "journey" : "journeys"} found, ordered by fewest changes.`
                    : `No sample route connects ${searchedOrigin} to ${searchedDestination} yet.`}
                </p>
              </div>
              {matchingJourneys.length ? (
                <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <ul className="grid gap-3">
                    {matchingJourneys.map((journey, journeyIndex) => {
                      const isSelected = selectedJourneyIndex === journeyIndex;
                      const hasAvailableTrips = journey.legs.every((leg) => findTripForRoute(leg, availableTrips));

                      return (
                        <li key={`${journey.legs.map((leg) => leg.id).join("-")}-${journeyIndex}`} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedJourneyIndex(journeyIndex)}
                            className={`w-full rounded-2xl border p-4 text-left shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466D] ${
                              isSelected
                                ? "border-[#29466D] bg-[#EEF4FB] shadow-md"
                                : "border-slate-200 bg-white hover:border-[#AABBD0] hover:bg-[#F9FBFD]"
                            }`}
                            aria-pressed={isSelected}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526D87]">
                                  Option {journeyIndex + 1}
                                </p>
                                <h3 className="mt-1 break-words text-lg font-bold text-[#14233b]">
                                  {journey.legs.length === 1
                                    ? "Direct journey"
                                    : `${journey.legs.length} legs, ${journey.legs.length - 1} transfer${journey.legs.length === 2 ? "" : "s"}`}
                                </h3>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#29466d] ring-1 ring-slate-200">
                                {isSelected ? "Selected" : "View details"}
                              </span>
                            </div>

                            <p className="mt-3 break-words text-sm text-slate-600">
                              {journey.legs.map((leg) => leg.origin).join(" → ")} → {searchedDestination}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-[#12304A]">
                                {journey.totalFare === null
                                  ? "Fare unavailable"
                                  : `MWK ${journey.totalFare.toLocaleString("en-MW")}`}
                              </span>
                              <span className="text-xs font-medium text-[#526D87]">
                                {hasAvailableTrips ? "Seats available" : "No available trip"}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {selectedJourney && (
                    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526D87]">
                        Route details
                      </p>
                      <h3 className="mt-2 text-xl font-bold text-[#14233b]">
                        Option {selectedJourneyIndex + 1}
                      </h3>

                      <div className="mt-4 overflow-hidden rounded-xl border border-[#D7E2EF] bg-[#F8FBFF] p-3">
                        <svg viewBox="0 0 420 180" className="h-32 w-full" role="img" aria-label="Selected route map preview">
                          <path
                            d={
                              selectedJourneyStops
                                .map((stop, index) => {
                                  const x = 30 + index * (360 / Math.max(selectedJourneyStops.length - 1, 1));
                                  const y = index % 2 === 0 ? 120 : 72;
                                  return `${index === 0 ? "M" : "L"}${x} ${y}`;
                                })
                                .join(" ")
                            }
                            fill="none"
                            stroke="#12304A"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {selectedJourneyStops.map((stop, index) => {
                            const x = 30 + index * (360 / Math.max(selectedJourneyStops.length - 1, 1));
                            const y = index % 2 === 0 ? 120 : 72;
                            return (
                              <g key={`${stop}-${index}`}>
                                <circle cx={x} cy={y} r="9" fill="#12304A" />
                                <circle cx={x} cy={y} r="14" fill="none" stroke="#9BB8D5" strokeWidth="2" opacity="0.8" />
                                <text x={x} y={165} textAnchor="middle" fontSize="10" fill="#526D87">{stop}</text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="mt-4 rounded-xl bg-[#EEF2F7] px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sample total fare
                        </p>
                        <p className="mt-1 text-2xl font-bold text-[#14233b]">
                          {selectedJourney.totalFare === null ? "Fare unavailable" : `MWK ${selectedJourney.totalFare.toLocaleString("en-MW")}`}
                        </p>
                      </div>

                      <ol className="mt-4 space-y-3">
                        {selectedJourney.legs.map((leg, legIndex) => (
                          <li key={leg.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-[#14233b]">
                                Leg {legIndex + 1}: {leg.origin} → {leg.destination}
                              </p>
                              <span className="rounded-full bg-[#EEF2F7] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#29466D]">
                                {leg.service}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              Board at {leg.pickupPoint} · Drop off at {leg.dropOffPoint}
                            </p>
                            {leg.stopovers.length > 0 && (
                              <p className="mt-2 text-sm text-slate-600">Sample stops: {leg.stopovers.join(" → ")}</p>
                            )}
                            <p className="mt-2 text-sm font-semibold text-[#26364d]">
                              {leg.estimatedFare === null ? "Fare unavailable" : `MWK ${leg.estimatedFare.toLocaleString("en-MW")}`}
                            </p>
                          </li>
                        ))}
                      </ol>

                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {selectedJourneyTrip ? (
                          <Link
                            href={`/transport-booking/details/${encodeURIComponent(selectedJourneyTrip.id)}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#12304A] px-4 text-sm font-bold text-white transition hover:bg-[#29466D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466D]"
                          >
                            Reserve trip
                          </Link>
                        ) : (
                          <Link
                            href="/transport-booking"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#AABBD0] px-4 text-sm font-bold text-[#12304A] transition hover:bg-[#EAF2FA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466D]"
                          >
                            Browse available trip legs
                          </Link>
                        )}
                        <Link
                          href="/maps-admin-integration"
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#AABBD0] px-4 text-sm font-bold text-[#12304A] transition hover:bg-[#EAF2FA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466D]"
                        >
                          Nearby stops
                        </Link>
                      </div>
                    </aside>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
                  <p className="text-sm text-slate-600">
                    Check the town names or try another starting point or
                    destination. This demonstration only includes the towns
                    listed in the route search.
                  </p>
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-[#617B96]">
                These sample stops and fare estimates are for demonstration
                only, not confirmed operator information. Check the actual
                pickup point and current fare with your transport provider
                before travelling.
              </p>
            </section>
          )}
        </div>

        <section
          aria-labelledby="routes-fares-heading"
          className="mb-8 overflow-hidden rounded-2xl border border-[#D7E2EF] bg-white shadow-sm"
        >
          <div className="border-b border-[#D7E2EF] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526D87]">
              PLAN WITH CONFIDENCE
            </p>
            <h2
              id="routes-fares-heading"
              className="mt-2 text-xl font-bold tracking-tight text-[#0D2438] sm:text-2xl"
            >
              Routes &amp; fares, at a glance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526D87]">
              Browse routes matching your destination, with sample fare
              estimates and boarding points. Information is for demonstration
              only and is not confirmed operator data.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-[#EDF4FA] lg:grid-cols-2">
            <article className="min-w-0 bg-white p-4 sm:p-6 lg:p-8">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4FA] text-[#1B4B72] sm:size-11">
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
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#0D2438]">
                    Route options
                  </h3>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                    Find direct coach and minibus routes, or see each leg and
                    transfer stop for a longer journey.
                  </p>
                  <span className="mt-3 inline-flex max-w-full rounded-full bg-[#EAF2FA] px-3 py-1 text-xs font-semibold text-[#12304A]">
                    Direct and connecting journeys
                  </span>
                </div>
              </div>
            </article>
            <article className="min-w-0 bg-white p-4 sm:p-6 lg:p-8">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4FA] text-[#1B4B72] sm:size-11">
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
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#0D2438]">
                    Fare estimates
                  </h3>
                  <p className="mt-1 break-words text-sm leading-6 text-[#526D87]">
                    Check available sample fares in Malawi kwacha (MWK) for
                    your route. Estimates are indicative; confirm the current
                    fare with your provider.
                  </p>
                  <span className="mt-3 inline-flex max-w-full rounded-full bg-[#EAF2FA] px-3 py-1 text-xs font-semibold text-[#12304A]">
                    Estimates shown with route results
                  </span>
                </div>
              </div>
            </article>
          </div>
          <div className="flex justify-center border-t border-[#D7E2EF] bg-white p-4 sm:p-5">
            <button
              type="button"
              onClick={() => focusJourneySearch("origin")}
              aria-controls="destination-search"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#12304A] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#29466D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466D] sm:w-auto"
            >
              Search routes &amp; fares <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <section aria-labelledby="journey-tools-heading" className="mx-auto mt-12 max-w-5xl">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526D87]">MORE WAYS TO TRAVEL</p>
            <h2 id="journey-tools-heading" className="mt-2 text-2xl font-bold tracking-tight text-[#0D2438]">
              Plan, book, and manage your journey
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526D87]">
              Continue from route planning to nearby stops, seat reservations, or your passenger account.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/maps-admin-integration",
                title: "Nearby stops",
                description: "Explore pickup and drop-off points by town or location.",
                action: "Open stop finder",
              },
              {
                href: "/transport-booking",
                title: "Book a trip",
                description: "Compare scheduled departures and reserve available seats.",
                action: "View available trips",
              },
              {
                href: "/accounts-reports",
                title: "Passenger account",
                description: "Sign in or create an account to manage your details.",
                action: "Manage account",
              },
              {
                href: "/transport-booking",
                title: "My bookings",
                description: "Look up or manage an existing seat reservation.",
                action: "Find a booking",
              },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex min-h-40 flex-col rounded-2xl border border-[#D7E2EF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#AABBD0] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29466D] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="font-semibold text-[#0D2438]">{tool.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#526D87]">{tool.description}</p>
                <span className="mt-auto pt-4 text-sm font-semibold text-[#29466D] group-hover:text-[#0D2438]">
                  {tool.action} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-12 max-w-3xl border-t border-[#D7E2EF] pt-5 text-center text-xs leading-5 text-[#617B96]">
          Sample route information is for planning demonstrations only.
        </footer>
      </div>
    </main>
  );
}
