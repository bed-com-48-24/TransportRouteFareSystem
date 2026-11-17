import assert from "node:assert/strict";
import test from "node:test";
import { getAvailableSeats, reserveBooking } from "./seat-inventory.mjs";

test("available seats exclude cancelled bookings and other trips", () => {
  const bookings = [
    { tripId: "trip-a", passengers: 3, status: "confirmed" },
    { tripId: "trip-a", passengers: 2, status: "cancelled" },
    { tripId: "trip-b", passengers: 4, status: "confirmed" },
  ];

  assert.equal(getAvailableSeats(10, bookings, "trip-a"), 7);
});

test("reservation refuses to exceed remaining capacity", async () => {
  const trip = { id: "trip-a", capacity: 4 };
  const bookings = [{ tripId: "trip-a", passengers: 3, status: "confirmed" }];
  const result = await reserveBooking({
    trip,
    passengers: 2,
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
      locks,
      readBookings: () => bookings,
      writeBookings: (next) => {
        bookings = next;
      },
      createBooking: () => ({
        tripId: trip.id,
        passengers: 1,
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
      trip: { id: "trip-a", capacity: 2 },
      passengers: 1,
      locks: { request: (_name, callback) => callback() },
      readBookings: () => [existing],
      writeBookings: () => assert.fail("A duplicate reference must not be written"),
      createBooking: () => ({ ...existing }),
    }),
    /unique booking reference/,
  );
});