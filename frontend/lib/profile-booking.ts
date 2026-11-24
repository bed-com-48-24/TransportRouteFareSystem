import type { Booking } from "./types";
import type { DemoPaymentReceipt } from "./payment-receipts";
import type { PassengerBookingDetails } from "./passenger-booking-details";

export function paymentLabel(booking: Booking): string {
  if (booking.paymentProvider) return booking.paymentProvider;
  switch (booking.paymentMethod) {
    case "tnm": return "TNM Mpamba";
    case "airtel": return "Airtel Money";
    case "bank": return "Bank transfer";
    case "card": return "Card";
    default: return "Not recorded";
  }
}

export function withLocalBookingDetails(
  booking: Booking,
  receipt?: DemoPaymentReceipt,
  passengerDetails?: PassengerBookingDetails,
): Booking {
  if (!receipt && !passengerDetails) return booking;
  const paymentPaid = receipt
    ? ["paid", "successful", "success", "completed", "succeeded"].includes(receipt.status)
    : booking.paymentStatus === "paid";
  return {
    ...booking,
    paymentStatus: paymentPaid ? "paid" as const : receipt?.status === "failed" ? "failed" as const : "pending" as const,
    amountPaid: paymentPaid ? (receipt?.amount ?? booking.amountPaid) : undefined,
    paymentMethod: receipt?.method.toLowerCase().includes("airtel") ? "airtel" as const
      : receipt?.method.toLowerCase().includes("tnm") ? "tnm" as const
        : receipt?.method.toLowerCase().includes("bank") ? "bank" as const : receipt ? "card" as const : booking.paymentMethod,
    paymentProvider: receipt ? `${receipt.method} · ${receipt.provider}` : booking.paymentProvider,
    paymentReference: receipt?.transactionReference ?? receipt?.paymentId ?? booking.paymentReference,
    paymentCode: receipt?.transactionReference,
    paymentId: receipt?.paymentId,
    payerPhone: booking.payerPhone || receipt?.passengerPhone || passengerDetails?.passengerPhone,
    payerEmail: booking.payerEmail || receipt?.passengerEmail || passengerDetails?.passengerEmail,
    paidAt: paymentPaid ? receipt?.createdAt : undefined,
    name: booking.name || receipt?.passengerName || passengerDetails?.passengerName || "",
    email: booking.email || receipt?.passengerEmail || passengerDetails?.passengerEmail || "",
  };
}
