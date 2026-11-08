export function getBookedSeatNumbers(capacity, bookings, tripId) {
  if (!Number.isSafeInteger(capacity) || capacity < 0) {
    throw new RangeError("Trip capacity must be a non-negative whole number.");
  }

  const seatClaims = new Set();
  const legacyPassengerCounts = [];

  for (const booking of bookings) {
    if (booking.tripId !== tripId || booking.status !== "confirmed") continue;
    if (!Number.isSafeInteger(booking.passengers) || booking.passengers < 0) continue;

    const storedSeats = Array.isArray(booking.seatNumbers) ? new Set(booking.seatNumbers) : new Set();
    let assignedSeats = 0;
    for (const seatNumber of storedSeats) {
      if (Number.isSafeInteger(seatNumber) && seatNumber >= 1 && seatNumber <= capacity) {
        if (seatClaims.has(seatNumber)) continue;
        seatClaims.add(seatNumber);
        assignedSeats += 1;
      }
    }

    legacyPassengerCounts.push(Math.max(0, booking.passengers - assignedSeats));
  }

  const booked = new Set(seatClaims);
  for (const passengerCount of legacyPassengerCounts) {
    let remaining = passengerCount;
    for (let seatNumber = 1; seatNumber <= capacity && remaining > 0; seatNumber += 1) {
      if (booked.has(seatNumber)) continue;
      booked.add(seatNumber);
      remaining -= 1;
    }
  }

  return [...booked].sort((first, second) => first - second);
}

export function getAvailableSeats(capacity, bookings, tripId) {
  return capacity - getBookedSeatNumbers(capacity, bookings, tripId).length;
}

export async function reserveBooking({
  trip,
  passengers,
  seatNumbers,
  locks,
  readBookings,
  writeBookings,
  createBooking,
}) {
  if (!Number.isSafeInteger(passengers) || passengers < 1) {
    throw new RangeError("Passenger count must be a positive whole number.");
  }

  if (
    !Array.isArray(seatNumbers) ||
    seatNumbers.length !== passengers ||
    seatNumbers.some((seatNumber) => !Number.isSafeInteger(seatNumber) || seatNumber < 1 || seatNumber > trip.capacity) ||
    new Set(seatNumbers).size !== seatNumbers.length
  ) {
    throw new RangeError("Select one unique, available seat for each passenger.");
  }

  if (typeof locks?.request !== "function") {
    throw new Error("This browser cannot safely reserve seats. Try a supported browser.");
  }

  return locks.request(`routewise-trip-${trip.id}`, async () => {
    const bookings = readBookings();
    const bookedSeatNumbers = new Set(getBookedSeatNumbers(trip.capacity, bookings, trip.id));
    if (
      getAvailableSeats(trip.capacity, bookings, trip.id) < passengers ||
      seatNumbers.some((seatNumber) => bookedSeatNumbers.has(seatNumber))
    ) {
      return null;
    }

    const booking = createBooking(seatNumbers);
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