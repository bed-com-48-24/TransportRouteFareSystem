/**
 * The booking form hands the reservation to the dedicated payment page through
 * session storage: no passenger details are put in the URL or shared with the
 * server until the payment is actually submitted.
 */
export type PaymentDraft = {
  tripId: string;
  travelDate: string;
  seats: number[];
  pickup: string;
  dropoff: string;
  name: string;
  email: string;
  phone: string;
  pendingBookingReference?: string;
};

const PAYMENT_DRAFT_KEY = "routewise-payment-draft-v1";

export function savePaymentDraft(draft: PaymentDraft): void {
  try {
    sessionStorage.setItem(PAYMENT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private browsing can block storage; the booking form still validates.
  }
}

export function readPaymentDraft(): PaymentDraft | null {
  try {
    const raw = sessionStorage.getItem(PAYMENT_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Record<string, unknown>;
    if (
      typeof value.tripId !== "string" ||
      typeof value.travelDate !== "string" ||
      !Array.isArray(value.seats) ||
      value.seats.some((seat) => typeof seat !== "number" || !Number.isFinite(seat)) ||
      value.seats.length === 0 ||
      typeof value.pickup !== "string" ||
      typeof value.dropoff !== "string" ||
      typeof value.name !== "string" ||
      typeof value.email !== "string" ||
      typeof value.phone !== "string"
    ) {
      return null;
    }
    return {
      tripId: value.tripId,
      travelDate: value.travelDate,
      seats: value.seats as number[],
      pickup: value.pickup,
      dropoff: value.dropoff,
      name: value.name,
      email: value.email,
      phone: value.phone,
      ...(typeof value.pendingBookingReference === "string"
        ? { pendingBookingReference: value.pendingBookingReference }
        : {}),
    };
  } catch {
    return null;
  }
}

export function clearPaymentDraft(): void {
  try {
    sessionStorage.removeItem(PAYMENT_DRAFT_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
