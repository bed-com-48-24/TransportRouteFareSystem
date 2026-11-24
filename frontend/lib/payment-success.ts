/**
 * Hands a confirmed payment to the dedicated success page without putting
 * booking details in the URL. The booking object is already plain data, so it
 * can be stored in session storage and restored after a refresh.
 */
import type { Booking } from "@/lib/types";

const PAYMENT_SUCCESS_KEY = "routewise-payment-success-v1";

export function savePaymentSuccess(booking: Booking): void {
  try {
    sessionStorage.setItem(PAYMENT_SUCCESS_KEY, JSON.stringify(booking));
  } catch {
    // Private browsing can block storage; the confirmation still completes.
  }
}

export function readPaymentSuccess(): Booking | null {
  try {
    const raw = sessionStorage.getItem(PAYMENT_SUCCESS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Record<string, unknown>;
    if (
      typeof value.reference !== "string" ||
      typeof value.tripId !== "string" ||
      typeof value.route !== "string" ||
      typeof value.travelDate !== "string" ||
      typeof value.pickup !== "string" ||
      typeof value.dropoff !== "string" ||
      typeof value.name !== "string"
    ) {
      return null;
    }
    return parsed as Booking;
  } catch {
    return null;
  }
}

export function clearPaymentSuccess(): void {
  try {
    sessionStorage.removeItem(PAYMENT_SUCCESS_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
