"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { nearestTransportTown } from "@/lib/malawi-locations";
import { KEYS, SEED_FARES, SEED_ROUTES } from "@/lib/seed";
import { availableSeats, fmtDate } from "@/lib/booking-data";
import { useDemoSeed } from "@/lib/demo-data";
import { useStoredList } from "@/lib/storage";
import type { Booking, FareItem, RouteItem, Trip } from "@/lib/types";

const POPULAR_ROUTES = [
  { origin: "Blantyre", destination: "Lilongwe", defaultService: "Intercity coach", tag: "Most popular" },
  { origin: "Lilongwe", destination: "Blantyre", defaultService: "Intercity coach", tag: "High demand" },
  { origin: "Lilongwe", destination: "Mzuzu", defaultService: "Intercity coach", tag: "Northern corridor" },
  { origin: "Blantyre", destination: "Zomba", defaultService: "Minibus", tag: "Daily departures" },
];

export default function HomePage() {
  const router = useRouter();
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);
  const trips = useStoredList<Trip>(KEYS.trips, []);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  useDemoSeed();
  const towns = [...new Set(routes.flatMap((route) => [route.origin, route.destination]))].sort();
  const [todayValue, setTodayValue] = useState("");
  const bookableTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.date >= todayValue && availableSeats(trip, bookings) > 0)
        .sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure)),
    [trips, bookings, todayValue],
  );
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedTrips, setSelectedTrips] = useState<Record<string, string>>({});
  const [locationStatus, setLocationStatus] = useState("Finding your current location…");
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState("");
  const watchIdRef = useRef<number | null>(null);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Location access is not available in this browser. Enter your starting town.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);
    setLocationStatus("Finding your current location…");

    // Watch the position continuously so the starting town follows the user as they move.
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = nearestTransportTown({ lat: latitude, lng: longitude });
        if (!nearest) {
          setOrigin("");
          setLocationStatus("Your location could not be matched to a supported town. Enter your starting town.");
          setTracking(false);
          return;
        }

        setOrigin((current) => (current === nearest.town ? current : nearest.town));
        setTracking(true);
      },
      (reason) => {
        setLocationStatus(
          reason.code === reason.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access and reload the page to track your position."
            : "Your location could not be found. Check that location services are on and reload the page.",
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date();
      setTodayValue(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(locateUser, 0);
    return () => {
      window.clearTimeout(timer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [locateUser]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const knownOrigin = towns.find((town) =>
      town.toLocaleLowerCase() === origin.trim().toLocaleLowerCase(),
    );
    const knownDestination = towns.find((town) =>
      town.toLocaleLowerCase() === destination.trim().toLocaleLowerCase(),
    );

    if (!knownOrigin) {
      setError("Choose a supported starting town or allow access to your current location.");
      return;
    }
    if (!knownDestination) {
      setError(`A route from ${knownOrigin} to ${destination.trim()} has not been defined by the transport admin yet.`);
      return;
    }
    if (knownOrigin.toLocaleLowerCase() === knownDestination.toLocaleLowerCase()) {
      setError("Choose a destination different from your current town.");
      return;
    }
    const hasDirectRoute = routes.some(
      (route) =>
        route.origin.trim().toLocaleLowerCase() === knownOrigin.toLocaleLowerCase() &&
        route.destination.trim().toLocaleLowerCase() === knownDestination.toLocaleLowerCase(),
    );
    if (!hasDirectRoute) {
      setError(`A direct route from ${knownOrigin} to ${knownDestination} has not been defined by the transport admin yet.`);
      return;
    }

    router.push(
      `/transport-booking?origin=${encodeURIComponent(knownOrigin)}&destination=${encodeURIComponent(knownDestination)}`,
    );
  }

  function handleBookDirect() {
    setError("");
    const knownOrigin = towns.find((town) =>
      town.toLocaleLowerCase() === origin.trim().toLocaleLowerCase(),
    );
    const knownDestination = towns.find((town) =>
      town.toLocaleLowerCase() === destination.trim().toLocaleLowerCase(),
    );

    if (knownOrigin && knownDestination) {
      const match = bookableTrips.find((t) => {
        const [orig, dest] = t.route.split(" → ");
        return orig?.trim().toLowerCase() === knownOrigin.toLowerCase() && dest?.trim().toLowerCase() === knownDestination.toLowerCase();
      });
      if (match) {
        router.push(`/transport-booking/details/${match.id}`);
        return;
      }

      router.push(
        `/transport-booking?origin=${encodeURIComponent(knownOrigin)}&destination=${encodeURIComponent(knownDestination)}`,
      );
      return;
    }

    router.push("/transport-booking");
  }

  function selectPopularRoute(fromTown: string, toTown: string) {
    // Keep the live-tracked current location as the origin and only set the destination.
    const goingToCurrentTown = origin.trim().toLowerCase() === toTown.trim().toLowerCase();
    setDestination(goingToCurrentTown ? fromTown : toTown);
    if (!origin) setOrigin(fromTown);
    setError("");
    window.requestAnimationFrame(() => {
      document.getElementById("home-destination")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    });
  }

  return (
    <main className="home-shell">
      <div className="home-top-grid">
      <section className="home-hero">
        <div className="home-hero-content">
          <h1>Where would you like to go?</h1>
          <form className="home-destination-search" onSubmit={search}>
            {!tracking && <p className="home-location-status" role="status">{locationStatus}</p>}
            {origin ? (
              <div className="home-current-origin">
                <span className="home-current-origin-icon" role="img" aria-label="Current location">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <strong>{origin}</strong>
              </div>
            ) : (
              <>
                <label htmlFor="home-origin">Starting town</label>
                <input
                  id="home-origin"
                  type="text"
                  list="home-route-towns"
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  placeholder="Choose or enter your starting town"
                  autoComplete="off"
                  required
                />
              </>
            )}
            <label htmlFor="home-destination">Destination</label>
            <input
              id="home-destination"
              type="text"
              list="home-route-towns"
              value={destination}
              onChange={(event) => {
                setDestination(event.target.value);
                setError("");
              }}
              placeholder="Start typing a destination"
              autoComplete="off"
              required
            />
            <datalist id="home-route-towns">
              {towns.map((town) => <option key={town} value={town} />)}
            </datalist>
            <div className="home-search-buttons">
              <button type="button" className="home-book-button" onClick={handleBookDirect}>Book now →</button>
            </div>
            {error && <p className="home-search-error" role="alert">{error}</p>}
          </form>
        </div>
      </section>

      <section className="home-popular-panel" aria-labelledby="popular-routes-heading">
        <div className="home-section-heading">
          <h2 id="popular-routes-heading">Popular travel routes</h2>
          <p>Explore the most traveled transport routes across Malawi. Check fares and book your seat directly.</p>
        </div>
        <div className="home-popular-grid">
          {POPULAR_ROUTES.map((item) => {
            const routeDef = routes.find(
              (r) => r.origin.toLowerCase() === item.origin.toLowerCase() && r.destination.toLowerCase() === item.destination.toLowerCase(),
            );
            const fareDef = routeDef ? fares.find((f) => f.routeId === routeDef.id) : undefined;
            const routeTrips = trips
              .filter(
                (t) =>
                  t.route.toLowerCase() === `${item.origin} → ${item.destination}`.toLowerCase() &&
                  t.date >= todayValue,
              )
              .sort(
                (first, second) =>
                  first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure),
              );
            const routeKey = `${item.origin}-${item.destination}`;
            const bookableRouteTrips = routeTrips.filter((t) => availableSeats(t, bookings) > 0);
            const tripDef =
              bookableRouteTrips.find((t) => t.id === selectedTrips[routeKey]) ?? bookableRouteTrips[0];
            const fareAmount = fareDef?.amount ?? 30000;
            const serviceName = routeDef?.service ?? item.defaultService;
            const bookHref = tripDef
              ? `/transport-booking/details/${tripDef.id}`
              : `/transport-booking?origin=${encodeURIComponent(item.origin)}&destination=${encodeURIComponent(item.destination)}`;

            return (
              <article className="home-popular-card" key={routeKey}>
                <div>
                  <div className="home-popular-top">
                    <span className="home-popular-tag">{item.tag}</span>
                    <span className="home-popular-service">{serviceName}</span>
                  </div>
                  <h3>{item.origin} → {item.destination}</h3>
                  <p className="home-popular-fare">
                    From <strong>MWK {fareAmount.toLocaleString("en-MW")}</strong>
                  </p>
                  {bookableRouteTrips.length > 0 ? (
                    <label className="home-popular-choose">
                      <span>Choose a trip</span>
                      <select
                        value={tripDef?.id ?? ""}
                        onChange={(event) =>
                          setSelectedTrips((current) => ({ ...current, [routeKey]: event.target.value }))
                        }
                      >
                        {bookableRouteTrips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {fmtDate(trip.date)} · {trip.departure} · {availableSeats(trip, bookings)} seats left
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="home-popular-schedule">
                      {routeTrips.length > 0
                        ? "Scheduled departures are full — check the route screen for details."
                        : "No admin-scheduled departure yet — check the route screen for details."}
                    </p>
                  )}
                </div>
                <div className="home-popular-actions">
                  <Link className="primary-button" href={bookHref}>
                    {tripDef ? "Book this trip" : "Check schedule"}
                  </Link>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => selectPopularRoute(item.origin, item.destination)}
                  >
                    Select route
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      </div>
    </main>
  );
}
