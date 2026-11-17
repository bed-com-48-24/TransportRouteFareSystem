import type { Booking } from "./types";

const DEMO_NOTIFICATIONS_KEY = "routewise-demo-notifications-v1";

export type BookingNotificationType =
  | "booking-confirmed"
  | "booking-cancelled"
  | "booking-reconfirmed"
  | "payment-complete"
  | "route-update"
  | "report-update"
  | "company-update";

export type DemoNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  source: "demo";
  recipientEmail?: string;
};

function readDemoNotifications(): DemoNotification[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DEMO_NOTIFICATIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed as DemoNotification[] : [];
  } catch {
    return [];
  }
}

function requestRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("backend-notifications-changed"));
  }
}

function addDemoNotification(title: string, message: string, recipientEmail?: string): void {
  try {
    const notification: DemoNotification = {
      id: `demo-${crypto.randomUUID()}`,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      source: "demo",
      ...(recipientEmail?.trim() ? { recipientEmail: recipientEmail.trim().toLowerCase() } : {}),
    };
    localStorage.setItem(
      DEMO_NOTIFICATIONS_KEY,
      JSON.stringify([notification, ...readDemoNotifications()].slice(0, 50)),
    );
  } catch {
    // Demo notifications are optional when browser storage is unavailable.
  }
  requestRefresh();
}

/** Backend-generated events are retrieved from the API after each action. */
export function notifyBookingStatus(
  _booking: Booking,
  type: BookingNotificationType,
  message: string,
): void {
  const title = type === "payment-complete"
    ? "Payment successful"
    : type === "booking-cancelled"
      ? "Booking cancelled"
      : type === "booking-reconfirmed" || type === "booking-confirmed"
        ? "Booking update"
        : type === "route-update"
          ? "Route update"
          : "Booking update";
  addDemoNotification(title, message, _booking.email);
  if (type === "booking-cancelled" || type === "booking-reconfirmed" || type === "booking-confirmed") {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("backend-bookings-changed"));
  }
}

export function notifyRouteUpdate(_message: string, _reference = "Route schedule"): void {
  requestRefresh();
}

/** Reports and company announcements have no backend create endpoint yet. */
export function notifyReportUpdate(message: string, reference: string, recipientEmail?: string): void {
  addDemoNotification("Report update", `${reference}: ${message}`, recipientEmail);
}

export function notifyCompanyUpdate(message: string, reference = "Company announcement", recipientEmail?: string): void {
  addDemoNotification("Company update", `${reference}: ${message}`, recipientEmail);
}

export function readBookingNotifications(recipientEmail?: string): DemoNotification[] {
  const email = recipientEmail?.trim().toLowerCase();
  return readDemoNotifications().filter((item) => !item.recipientEmail || item.recipientEmail === email);
}

export function markBookingNotificationRead(id: string): void {
  try {
    const notifications = readDemoNotifications();
    localStorage.setItem(
      DEMO_NOTIFICATIONS_KEY,
      JSON.stringify(notifications.map((item) => item.id === id ? { ...item, read: true } : item)),
    );
  } catch {
    // Demo notifications are optional.
  }
  requestRefresh();
}

export function markAllBookingNotificationsRead(): void {
  try {
    localStorage.setItem(
      DEMO_NOTIFICATIONS_KEY,
      JSON.stringify(readDemoNotifications().map((item) => ({ ...item, read: true }))),
    );
  } catch {
    // Demo notifications are optional.
  }
  requestRefresh();
}
