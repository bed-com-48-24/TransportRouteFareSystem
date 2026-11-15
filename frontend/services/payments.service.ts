import { apiRequest, apiRequestList } from "./http";
import type { Payment, PaymentMethod } from "./types";

/**
 * Payments are mounted at the server root, not under /api/v1 — scope "root"
 * keeps them working through the /backend-root proxy.
 */

export function listMethods(): Promise<PaymentMethod[]> {
  return apiRequestList<PaymentMethod>("/payment-methods", { scope: "root", auth: false });
}

export function create(
  bookingReference: string,
  method: "mobile_money" | "bank_card",
): Promise<Payment> {
  return apiRequest<Payment>(`/bookings/${bookingReference}/payments`, {
    method: "POST",
    body: { method },
    scope: "root",
  });
}

export function get(paymentId: string): Promise<Payment> {
  return apiRequest<Payment>(`/payments/${paymentId}`, { scope: "root" });
}
