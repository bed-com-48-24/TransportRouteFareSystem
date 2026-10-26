export type SeatBooking = {
  tripId: string;
  passengers: number;
  status: string;
};

export type SeatTrip = {
  id: string;
  capacity: number;
};

export type SeatLockProvider = {
  request<T>(name: string, callback: () => T | Promise<T>): Promise<T>;
};

export function getAvailableSeats<T extends SeatBooking>(
  capacity: number,
  bookings: T[],
  tripId: string,
): number;

export function reserveBooking<T extends SeatBooking>(options: {
  trip: SeatTrip;
  passengers: number;
  locks: SeatLockProvider | null | undefined;
  readBookings: () => T[];
  writeBookings: (bookings: T[]) => void;
  createBooking: () => T;
}): Promise<T | null>;
