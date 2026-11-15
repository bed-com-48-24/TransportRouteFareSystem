export function getAvailableSeats(capacity, bookings, tripId) {
  if (!Number.isSafeInteger(capacity) || capacity < 0) {
    throw new RangeError("Trip capacity must be a non-negative whole number.");
  }

  const reserved = bookings.reduce((total, booking) => {
    if (
      booking.tripId !== tripId ||
      booking.status !== "confirmed" ||
      !Number.isSafeInteger(booking.passengers) ||
      booking.passengers < 0
    ) {
      return total;
    }

    return total + booking.passengers;
  }, 0);

  return Math.max(0, capacity - reserved);
}

export async function reserveBooking({
  trip,
  passengers,
  locks,
  readBookings,
  writeBookings,
  createBooking,
}) {
  if (!Number.isSafeInteger(passengers) || passengers < 1) {
    throw new RangeError("Passenger count must be a positive whole number.");
  }

  if (typeof locks?.request !== "function") {
    throw new Error("This browser cannot safely reserve seats. Try a supported browser.");
  }

  return locks.request(`routewise-trip-${trip.id}`, async () => {
    const bookings = readBookings();
    if (getAvailableSeats(trip.capacity, bookings, trip.id) < passengers) {
      return null;
    }

    const booking = createBooking();
    if (
      typeof booking.reference === "string" &&
      bookings.some((existing) => existing.reference === booking.reference)
    ) {
      throw new Error("Could not generate a unique booking reference. Please try again.");
    }

    writeBookings([...bookings, booking]);
    return booking;
  });
}