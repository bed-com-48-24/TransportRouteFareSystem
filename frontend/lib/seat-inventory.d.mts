export type SeatBooking = {
  tripId: string;
  passengers: number;
  status: "confirmed" | "cancelled";
  reference?: string;
};

export type SeatTrip = {
  id: string;
  capacity: number;
};

export type SeatLockManager = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export function getAvailableSeats(
  capacity: number,
  bookings: SeatBooking[],
  tripId: string,
): number;

export function reserveBooking<T extends SeatBooking>({
  trip,
  passengers,
  locks,
  readBookings,
  writeBookings,
  createBooking,
}: {
  trip: SeatTrip;
  passengers: number;
  locks: SeatLockManager | undefined;
  readBookings: () => T[];
  writeBookings: (bookings: T[]) => void;
  createBooking: () => T;
}): Promise<T | null>;