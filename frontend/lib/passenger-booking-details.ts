export type PassengerBookingDetails = {
  bookingReference: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
};

const DETAILS_KEY = "routewise-passenger-booking-details-v1";

export function readPassengerBookingDetails(): PassengerBookingDetails[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed as PassengerBookingDetails[] : [];
  } catch {
    return [];
  }
}

export function savePassengerBookingDetails(details: PassengerBookingDetails): void {
  const items = readPassengerBookingDetails().filter((item) => item.bookingReference !== details.bookingReference);
  localStorage.setItem(DETAILS_KEY, JSON.stringify([details, ...items].slice(0, 100)));
}
