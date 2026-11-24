"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { nearestTransportTown } from "@/lib/malawi-locations";
import { adminReservedSeatNumbers, availableSeats, fmtDate } from "@/lib/booking-data";
import type { Booking, Trip } from "@/lib/types";
import {
  useBackendFares,
  useBackendRoutes,
  useBackendTrips,
  useMyBookings,
} from "@/lib/use-backend-data";

/** A weekly schedule repeats across dates, so include the date in the key. */
function tripKey(trip: Pick<Trip, "id" | "date">) {
  return `${trip.id}:${trip.date}`;
}

/** Prefer the live count from the schedule search; fall back to local bookings. */
function seatsLeftFor(trip: Trip, bookings: Booking[]) {
  return typeof trip.availableSeats === "number"
    ? Math.min(trip.availableSeats, Math.max(0, trip.capacity - adminReservedSeatNumbers(trip).length))
    : availableSeats(trip, bookings);
}

export default function HomePage() {
  const router = useRouter();
  const { data: routes, loading: routesLoading } = useBackendRoutes();
  const { data: fares } = useBackendFares();
  const { data: trips, usingDemo: tripsAreDemo, error: tripsError, loading: tripsLoading } = useBackendTrips();
  const { data: bookings } = useMyBookings();
  const towns = [...new Set(routes.flatMap((route) => [route.origin, route.destination]))].sort();
  const seatsLeft = (trip: Trip) => seatsLeftFor(trip, bookings);
  const [todayValue, setTodayValue] = useState("");
  const bookableTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.date >= todayValue && seatsLeftFor(trip, bookings) > 0)
        .sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure)),
    [trips, bookings, todayValue],
  );
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);
  useEffect(() => {
    if (bookableTrips.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveScheduleIndex((current) => (current + 1) % bookableTrips.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [bookableTrips.length]);
  const safeScheduleIndex = activeScheduleIndex % Math.max(bookableTrips.length, 1);
  const activeSchedule = bookableTrips[safeScheduleIndex] ?? bookableTrips[0];
  const activeFare = fares.find((fare) => fare.routeId === activeSchedule?.routeId);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
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
        router.push(`/transport-booking/details/${match.id}?date=${match.date}`);
        return;
      }

      router.push(
        `/transport-booking?origin=${encodeURIComponent(knownOrigin)}&destination=${encodeURIComponent(knownDestination)}`,
      );
      return;
    }

    // Keep whatever the passenger already typed so the next screen can act on it.
    const params = new URLSearchParams();
    const originValue = knownOrigin ?? origin.trim();
    const destinationValue = knownDestination ?? destination.trim();
    if (originValue) params.set("origin", originValue);
    if (destinationValue) params.set("destination", destinationValue);
    const query = params.toString();
    router.push(query ? `/transport-booking?${query}` : "/transport-booking");
  }

  return (
    <main className="home-shell">
      {tripsError && !tripsAreDemo && (
        <p role="alert" className="home-search-error">
          Could not load departures: {tripsError}
        </p>
      )}
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
                <button type="button" className="primary-button home-book-button" onClick={handleBookDirect}>Book now <span aria-hidden="true">&rarr;</span></button>
              </div>
              {error && <p className="home-search-error" role="alert">{error}</p>}
            </form>
          </div>
        </section>
  
        <section className="home-popular-panel home-schedule-panel" aria-labelledby="next-departures-heading">
          <div className="home-section-heading">
            <h2 id="next-departures-heading">Next departures</h2>
          </div>
          <div className="home-schedule-stage" aria-live="polite">
            {activeSchedule ? (
              <article className="home-schedule-card" key={tripKey(activeSchedule)}>
                <h3>{activeSchedule.route}</h3>
                <p className="home-schedule-line">
                  {fmtDate(activeSchedule.date)} · {activeSchedule.departure}–{activeSchedule.arrival} · MWK {activeSchedule.fare.toLocaleString("en-MW")} · {seatsLeft(activeSchedule) > 0 ? `${seatsLeft(activeSchedule)} seats left` : "Full"}
                </p>
                {activeFare && <p className="home-popular-fare">From <strong>MWK {activeFare.amount.toLocaleString("en-MW")}</strong></p>}
                <div className="home-popular-actions">
                  <Link className="primary-button" href={`/transport-booking/details/${activeSchedule.id}?date=${activeSchedule.date}`}>Book this trip</Link>
                </div>
              </article>
            ) : (
              !routesLoading && !tripsLoading && (
                <p className="module-empty">No bookable departures right now. Please check back soon.</p>
              )
            )}
          </div>
          {bookableTrips.length > 1 && (
            <div className="home-schedule-dots" aria-label={`${bookableTrips.length} bookable departures`}>
              {bookableTrips.map((trip, index) => (
                <button
                  key={tripKey(trip)}
                  type="button"
                  className={`home-schedule-dot${index === safeScheduleIndex ? " is-active" : ""}`}
                  aria-label={`Show ${trip.route} on ${fmtDate(trip.date)}`}
                  aria-pressed={index === safeScheduleIndex}
                  onClick={() => setActiveScheduleIndex(index)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
