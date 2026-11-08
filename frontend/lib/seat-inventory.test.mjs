import assert from "node:assert/strict";
import test from "node:test";
import { getAvailableSeats, getBookedSeatNumbers, reserveBooking } from "./seat-inventory.mjs";

test("booked seats exclude cancelled bookings and other trips", () => {
  const bookings = [
    { tripId: "trip-a", passengers: 3, seatNumbers: [2, 4, 6], status: "confirmed" },
    { tripId: "trip-a", passengers: 2, status: "cancelled" },
    { tripId: "trip-b", passengers: 4, status: "confirmed" },
  ];

  assert.deepEqual(getBookedSeatNumbers(10, bookings, "trip-a"), [2, 4, 6]);
  assert.equal(getAvailableSeats(10, bookings, "trip-a"), 7);
});

test("legacy bookings without seat numbers occupy the first available seats", () => {
  const bookings = [
    { tripId: "trip-a", passengers: 2, status: "confirmed" },
    { tripId: "trip-a", passengers: 1, seatNumbers: [2], status: "confirmed" },
  ];

  assert.deepEqual(getBookedSeatNumbers(5, bookings, "trip-a"), [1, 2, 3]);
});

test("seat reservations reject a seat already booked by another passenger", async () => {
  const trip = { id: "trip-a", capacity: 4 };
  const bookings = [{ tripId: "trip-a", passengers: 1, seatNumbers: [2], status: "confirmed" }];

  const result = await reserveBooking({
    trip,
    passengers: 1,
    seatNumbers: [2],
    locks: { request: (_name, callback) => callback() },
    readBookings: () => bookings,
    writeBookings: () => assert.fail("A booked seat must not be written"),
    createBooking: () => assert.fail("A booked seat must not create a booking"),
  });

  assert.equal(result, null);
});

test("overlapping old seat assignments reserve replacement seats for each passenger", () => {
  const bookings = [
    { tripId: "trip-a", passengers: 1, seatNumbers: [2], status: "confirmed" },
    { tripId: "trip-a", passengers: 1, seatNumbers: [2], status: "confirmed" },
  ];

  assert.deepEqual(getBookedSeatNumbers(4, bookings, "trip-a"), [1, 2]);
});

test("concurrent reservations cannot claim the same numbered seat", async () => {
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
  const reserve = (reference) =>
    reserveBooking({
      trip,
      passengers: 1,
      seatNumbers: [1],
      locks,
      readBookings: () => bookings,
      writeBookings: (next) => {
        bookings = next;
      },
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

test("concurrent reservations cannot overbook the last seat", async () => {
  const trip = { id: "trip-a", capacity: 1 };
  let bookings = [];
  let tail = Promise.resolve();
  const locks = {
    request: (_name, callback) => {
      const current = tail.then(callback);
      tail = current.then(() => undefined, () => undefined);
      return current;
    },
  };
  const reserve = (reference) =>
    reserveBooking({
      trip,
      passengers: 1,
      seatNumbers: [1],
      locks,
      readBookings: () => bookings,
      writeBookings: (next) => {
        bookings = next;
      },
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
  assert.equal(getAvailableSeats(trip.capacity, bookings, trip.id), 0);
});

test("reservation rejects invalid passenger counts", async () => {
  await assert.rejects(
    reserveBooking({
      trip: { id: "trip-a", capacity: 2 },
      passengers: 0,
      seatNumbers: [],
      locks: { request: (_name, callback) => callback() },
      readBookings: () => [],
      writeBookings: () => {},
      createBooking: () => ({ tripId: "trip-a", passengers: 0, status: "confirmed" }),
    }),
    /positive whole number/,
  );
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