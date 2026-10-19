export function getAvailableSeats(capacity, bookings, tripId) {
  const reserved = bookings
    .filter((booking) => booking.tripId === tripId && booking.status === "confirmed")
    .reduce((total, booking) => total + booking.passengers, 0);

  return Math.max(0, capacity - reserved);
}

/**
 * Reads capacity again inside a per-trip browser lock before writing. The
 * caller must supply Web Locks; without it, the function refuses to risk
 * accepting two bookings for the same final seats.
 */
export async function reserveBooking({ trip, passengers, locks, readBookings, writeBookings, createBooking }) {
  if (!locks?.request) {
    throw new Error("Safe seat booking requires a browser with Web Locks support.");
  }

  return locks.request(`routewise-trip-${trip.id}`, () => {
    const latestBookings = readBookings();
    if (getAvailableSeats(trip.capacity, latestBookings, trip.id) < passengers) {
      return null;
    }

    const booking = createBooking();
    writeBookings([...latestBookings, booking]);
    return booking;
  });
}
