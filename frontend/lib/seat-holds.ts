/**
 * Local mirror of seats that have been held for payment. The backend is the
 * source of truth, but this keeps a seat blocked in the browser even if the
 * live seat endpoint is slow or unavailable.
 */

const SEAT_HOLD_KEY = "routewise-seat-holds-v1";
const HOLD_TTL_MS = 30 * 60 * 1000;

export type SeatHold = {
  reference: string;
  tripId: string;
  date: string;
  seats: number[];
  createdAt: string;
};

function isSeatHold(value: unknown): value is SeatHold {
  if (!value || typeof value !== "object") return false;
  const hold = value as Record<string, unknown>;
  return (
    typeof hold.reference === "string" &&
    typeof hold.tripId === "string" &&
    typeof hold.date === "string" &&
    Array.isArray(hold.seats) &&
    hold.seats.every((seat) => typeof seat === "number" && Number.isFinite(seat)) &&
    typeof hold.createdAt === "string"
  );
}

function readHolds(): SeatHold[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEAT_HOLD_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const cutoff = Date.now() - HOLD_TTL_MS;
    const valid = parsed.filter((item): item is SeatHold => {
      if (!isSeatHold(item)) return false;
      const created = Date.parse(item.createdAt);
      return Number.isFinite(created) && created >= cutoff;
    });
    if (valid.length !== parsed.length) writeHolds(valid);
    return valid;
  } catch {
    return [];
  }
}

function writeHolds(holds: SeatHold[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEAT_HOLD_KEY, JSON.stringify(holds));
  } catch {
    // Storage can be unavailable in private browsing; the backend still holds the seats.
  }
}

export function readHeldSeats(tripId: string, date: string): number[] {
  const held = new Set<number>();
  for (const hold of readHolds()) {
    if (hold.tripId !== tripId || hold.date !== date) continue;
    for (const seat of hold.seats) held.add(seat);
  }
  return [...held].sort((first, second) => first - second);
}

export function holdSeats(input: Omit<SeatHold, "createdAt">): void {
  const holds = readHolds().filter((hold) => hold.reference !== input.reference);
  holds.push({ ...input, createdAt: new Date().toISOString() });
  writeHolds(holds);
}

export function releaseSeatHold(reference: string): void {
  if (!reference) return;
  writeHolds(readHolds().filter((hold) => hold.reference !== reference));
}
