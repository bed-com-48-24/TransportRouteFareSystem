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

export function getUnavailableSeatNumbers(capacity, bookings, tripId) {
  if (!Number.isSafeInteger(capacity) || capacity < 0) {
    throw new RangeError("Trip capacity must be a non-negative whole number.");
  }

  const confirmedBookings = bookings.filter(
    (booking) => booking.tripId === tripId && booking.status === "confirmed",
  );
  const occupied = new Set();
  const bookingsWithSeats = confirmedBookings.filter((booking) =>
    Number.isSafeInteger(booking.passengers) &&
    booking.passengers > 0 &&
    Array.isArray(booking.seatNumbers) &&
    booking.seatNumbers.length === booking.passengers &&
    new Set(booking.seatNumbers).size === booking.seatNumbers.length &&
    booking.seatNumbers.every(
      (seatNumber) => Number.isSafeInteger(seatNumber) && seatNumber >= 1 && seatNumber <= capacity,
    ),
  );
  const legacyBookings = confirmedBookings.filter((booking) => !bookingsWithSeats.includes(booking));

  for (const booking of bookingsWithSeats) {
    for (const seatNumber of booking.seatNumbers) {
      occupied.add(seatNumber);
    }
  }

  for (const booking of legacyBookings) {
    const count = Number.isSafeInteger(booking.passengers) && booking.passengers > 0
      ? booking.passengers
      : 0;
    let assigned = 0;
    for (let seatNumber = 1; seatNumber <= capacity && assigned < count; seatNumber += 1) {
      if (!occupied.has(seatNumber)) {
        occupied.add(seatNumber);
        assigned += 1;
      }
    }
  }

  return [...occupied].sort((first, second) => first - second);
}

export async function reserveBooking({
  trip,
  passengers,
  selectedSeats,
  locks,
  readBookings,
  writeBookings,
  createBooking,
}) {
  if (!Number.isSafeInteger(passengers) || passengers < 1) {
    throw new RangeError("Passenger count must be a positive whole number.");
  }

  if (
    selectedSeats !== undefined &&
    (!Array.isArray(selectedSeats) ||
      selectedSeats.length !== passengers ||
      selectedSeats.some((seatNumber) => !Number.isSafeInteger(seatNumber) || seatNumber < 1 || seatNumber > trip.capacity) ||
      new Set(selectedSeats).size !== selectedSeats.length)
  ) {
    throw new RangeError("Choose one unique valid seat for each passenger.");
  }

  if (typeof locks?.request !== "function") {
    throw new Error("This browser cannot safely reserve seats. Try a supported browser.");
  }

  return locks.request(`routewise-trip-${trip.id}`, async () => {
    const bookings = readBookings();
    if (getAvailableSeats(trip.capacity, bookings, trip.id) < passengers) {
      return null;
    }

    const unavailableSeats = new Set(getUnavailableSeatNumbers(trip.capacity, bookings, trip.id));
    if (selectedSeats?.some((seatNumber) => unavailableSeats.has(seatNumber))) {
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