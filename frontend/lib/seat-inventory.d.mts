export type SeatBooking = {
  tripId: string;
  passengers: number;
  seatNumbers?: number[];
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

export function getBookedSeatNumbers(
  capacity: number,
  bookings: SeatBooking[],
  tripId: string,
): number[];

export function reserveBooking<T extends SeatBooking>({
  trip,
  passengers,
  seatNumbers,
  locks,
  readBookings,
  writeBookings,
  createBooking,
}: {
  trip: SeatTrip;
  passengers: number;
  seatNumbers: number[];
  locks: SeatLockManager | undefined;
  readBookings: () => T[];
  writeBookings: (bookings: T[]) => void;
  createBooking: (seatNumbers: number[]) => T;
}): Promise<T | null>;