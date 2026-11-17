export type DemoPaymentReceipt = {
  bookingReference: string;
  paymentId: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  transactionReference?: string;
  createdAt: string;
};

const RECEIPTS_KEY = "routewise-demo-payment-receipts-v1";

export function readPaymentReceipts(): DemoPaymentReceipt[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "[]");
    return Array.isArray(value) ? value as DemoPaymentReceipt[] : [];
  } catch {
    return [];
  }
}

export function savePaymentReceipt(receipt: DemoPaymentReceipt) {
  const receipts = readPaymentReceipts().filter((item) => item.bookingReference !== receipt.bookingReference);
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify([receipt, ...receipts]));
}
