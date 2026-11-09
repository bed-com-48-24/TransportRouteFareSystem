import assert from "node:assert/strict";
import test from "node:test";
import { getAvailableSeats, getBookedSeatNumbers, getUnavailableSeatNumbers, reserveBooking } from "./seat-inventory.mjs";

test("seat availability ignores cancelled bookings and bookings for other trips", () => {
  const bookings = [
    { tripId: "trip-a", passengers: 3, seatNumbers: [2, 4, 6], status: "confirmed" },
    { tripId: "trip-a", passengers: 2, status: "cancelled" },
    { tripId: "trip-b", passengers: 4, status: "confirmed" },
  ];
  assert.deepEqual(getBookedSeatNumbers(10, bookings, "trip-a"), [2, 4, 6]);
  assert.equal(getAvailableSeats(10, bookings, "trip-a"), 7);
});

test("legacy bookings reserve seats without overwriting explicit seats", () => {
  const bookings = [
    { tripId: "trip-a", passengers: 2, status: "confirmed" },
    { tripId: "trip-a", passengers: 1, seatNumbers: [5], status: "confirmed" },
    { tripId: "trip-a", passengers: 1, seatNumbers: [7], status: "cancelled" },
  ];
  assert.deepEqual(getUnavailableSeatNumbers(8, bookings, "trip-a"), [1, 2, 5]);
});

test("booking rejects a seat already claimed", async () => {
  const trip = { id: "trip-a", capacity: 4 };
  const bookings = [{ tripId: "trip-a", passengers: 1, seatNumbers: [2], status: "confirmed" }];
  const result = await reserveBooking({
    trip,
    passengers: 1,
    seatNumbers: [2],
    locks: { request: (_name, callback) => callback() },
    readBookings: () => bookings,
    writeBookings: () => assert.fail("A claimed seat must not be written"),
    createBooking: () => assert.fail("A claimed seat must not create a booking"),
  });
  assert.equal(result, null);
});

test("concurrent reservations cannot claim the same seat", async () => {
  const trip = { id: "trip-a", capacity: 2 };
  let bookings = [];
  let tail = Promise.resolve();
  const locks = {
    request: (_name, callback) => {
      const current = tail.then(callback);
      tail = current.then(() => undefined, () => undefined);
      return current;
    },
  };
  const reserve = (reference) => reserveBooking({
    trip,
    passengers: 1,
    seatNumbers: [1],
    locks,
    readBookings: () => bookings,
    writeBookings: (next) => { bookings = next; },
    createBooking: (seatNumbers) => ({
      tripId: trip.id,
      passengers: 1,
      seatNumbers,
      status: "confirmed",
      reference,
    }),
  });
  const results = await Promise.all([reserve("first"), reserve("second")]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.deepEqual(getBookedSeatNumbers(trip.capacity, bookings, trip.id), [1]);
});

test("reservation refuses to exceed remaining capacity", async () => {
  const trip = { id: "trip-a", capacity: 4 };
  const bookings = [{ tripId: "trip-a", passengers: 3, status: "confirmed" }];
  const result = await reserveBooking({
    trip,
    passengers: 2,
    seatNumbers: [3, 4],
    locks: { request: (_name, callback) => callback() },
    readBookings: () => bookings,
    writeBookings: () => assert.fail("A full trip must not be written"),
    createBooking: () => assert.fail("A full trip must not create a booking"),
  });
  assert.equal(result, null);
});

test("reservation validates passenger count, seat count, and unique seat numbers", async () => {
  const base = {
    trip: { id: "trip-a", capacity: 4 },
    locks: { request: (_name, callback) => callback() },
    readBookings: () => [],
    writeBookings: () => {},
    createBooking: () => ({ status: "confirmed" }),
  };
  await assert.rejects(reserveBooking({ ...base, passengers: 0, seatNumbers: [] }), /positive whole number/);
  await assert.rejects(reserveBooking({ ...base, passengers: 2, seatNumbers: [1] }), /one unique/);
  await assert.rejects(reserveBooking({ ...base, passengers: 2, seatNumbers: [1, 1] }), /one unique/);
});

test("reservation never saves a duplicate booking reference", async () => {
  const existing = { tripId: "trip-a", passengers: 1, status: "confirmed", reference: "TR-duplicate" };
  await assert.rejects(
    reserveBooking({
      trip: { id: "trip-a", capacity: 3 },
      passengers: 1,
      seatNumbers: [2],
      locks: { request: (_name, callback) => callback() },
      readBookings: () => [existing],
      writeBookings: () => assert.fail("A duplicate reference must not be written"),
      createBooking: () => ({ ...existing }),
    }),
    /unique booking reference/,
  );
});
