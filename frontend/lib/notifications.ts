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

function addDemoNotification(title: string, message: string): void {
  try {
    const notification: DemoNotification = {
      id: `demo-${crypto.randomUUID()}`,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      source: "demo",
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
  if (type === "payment-complete") {
    addDemoNotification("Payment successful", message);
    return;
  }
  requestRefresh();
}

export function notifyRouteUpdate(_message: string, _reference = "Route schedule"): void {
  requestRefresh();
}

/** Reports and company announcements have no backend create endpoint yet. */
export function notifyReportUpdate(message: string, reference: string): void {
  addDemoNotification("Demo report update", `${reference}: ${message}`);
}

export function notifyCompanyUpdate(message: string, reference = "Company announcement"): void {
  addDemoNotification("Demo company update", `${reference}: ${message}`);
}

export function readBookingNotifications(): DemoNotification[] {
  return readDemoNotifications();
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
