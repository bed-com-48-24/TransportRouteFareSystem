import test from "node:test";
import assert from "node:assert/strict";
import { getAvailableSeats, reserveBooking } from "./seat-inventory.mjs";

const trip = { id: "trip-1", capacity: 4 };
const booking = (tripId, passengers, status = "confirmed") => ({ tripId, passengers, status });

class MemoryLockManager {
  tails = new Map();

  async request(name, callback) {
    const previous = this.tails.get(name) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    this.tails.set(name, current);
    await previous;
    try {
      return await callback();
    } finally {
      release();
      if (this.tails.get(name) === current) this.tails.delete(name);
    }
  }
}

function createMemoryStorage(initial = []) {
  let bookings = initial;
  return {
    read: () => bookings,
    write: (updated) => { bookings = updated; },
  };
}

test("available seats count confirmed bookings only for the selected trip", () => {
  const bookings = [booking("trip-1", 2), booking("trip-1", 1, "cancelled"), booking("trip-2", 4)];
  assert.equal(getAvailableSeats(4, bookings, "trip-1"), 2);
});

test("availability never goes below zero", () => {
  assert.equal(getAvailableSeats(3, [booking("trip-1", 5)], "trip-1"), 0);
});

test("a booking updates stored availability", async () => {
  const storage = createMemoryStorage([booking("trip-1", 1)]);
  const reserved = await reserveBooking({
    trip, passengers: 2, locks: new MemoryLockManager(),
    readBookings: storage.read, writeBookings: storage.write,
    createBooking: () => booking("trip-1", 2),
  });

  assert.ok(reserved);
  assert.equal(getAvailableSeats(trip.capacity, storage.read(), trip.id), 1);
});

test("a booking is rejected when no seats are available", async () => {
  const storage = createMemoryStorage([booking("trip-1", 4)]);
  const reserved = await reserveBooking({
    trip, passengers: 1, locks: new MemoryLockManager(),
    readBookings: storage.read, writeBookings: storage.write,
    createBooking: () => booking("trip-1", 1),
  });

  assert.equal(reserved, null);
  assert.equal(storage.read().length, 1);
});

test("simultaneous requests cannot reserve more than the final seats", async () => {
  const storage = createMemoryStorage([booking("trip-1", 2)]);
  const locks = new MemoryLockManager();
  const attempt = () => reserveBooking({
    trip, passengers: 2, locks,
    readBookings: storage.read, writeBookings: storage.write,
    createBooking: () => booking("trip-1", 2),
  });

  const results = await Promise.all([attempt(), attempt()]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(getAvailableSeats(trip.capacity, storage.read(), trip.id), 0);
});

test("booking fails safely when Web Locks are unavailable", async () => {
  const storage = createMemoryStorage();
  await assert.rejects(reserveBooking({
    trip, passengers: 1, locks: undefined,
    readBookings: storage.read, writeBookings: storage.write,
    createBooking: () => booking("trip-1", 1),
  }), /Web Locks support/);
  assert.equal(storage.read().length, 0);
});
