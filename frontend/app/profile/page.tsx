"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logout, useSession } from "@/lib/auth";
import DemoDataNotice from "@/components/DemoDataNotice";
import { fmtDate, readBookings, saveBookings } from "@/lib/booking-data";
import { nearestTransportTown, type Coordinates } from "@/lib/malawi-locations";
import * as apiNotifications from "@/services/notifications.service";
import { markBookingNotificationRead, notifyBookingStatus, readBookingNotifications, type DemoNotification } from "@/lib/notifications";
import { logoutPassenger, readPassengerSession } from "@/lib/passenger-auth";
import { readSavedRoutes, removeSavedRoute, type SavedRoute } from "@/lib/saved-routes";
import { useMyBookings } from "@/lib/use-backend-data";
import type { Booking, ReportItem } from "@/lib/types";
import * as apiBookings from "@/services/bookings.service";
import type { Notification } from "@/services/types";
import * as authApi from "@/services/auth.service";
import { readPaymentReceipts, type DemoPaymentReceipt } from "@/lib/payment-receipts";
import { readPassengerBookingDetails, type PassengerBookingDetails } from "@/lib/passenger-booking-details";
import { KEYS, MOCK_REPORTS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";

type ProfileTab = "location" | "bookings" | "journeys" | "reports" | "notifications" | "saved" | "driver-access";
type VisibleNotification = Notification | DemoNotification;

const PROFILE_KEY = "routewise-profile-v1";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function LocationIcon() {
  return <svg {...svgProps}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

function TicketIcon() {
  return <svg {...svgProps}><path d="M4 7h16v3.5a2.5 2.5 0 0 0 0 5V17H4v-1.5a2.5 2.5 0 0 0 0-5V7Z" /><path d="M14 7v2M14 15v2" /></svg>;
}

function HistoryIcon() {
  return <svg {...svgProps}><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4h4" /><path d="M12 8v4l3 2" /></svg>;
}

function BellIcon() {
  return <svg {...svgProps}><path d="M6 9a6 6 0 1 1 12 0c0 4 2 5 2 6H4c0-1 2-2 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return <svg {...svgProps} fill={filled ? "currentColor" : "none"}><path d="M6 4h12v17l-6-4-6 4V4Z" /></svg>;
}

function LogoutIcon() {
  return <svg {...svgProps}><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4" /><path d="M8 12h10" /></svg>;
}

function PanelHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="profile-panel-heading">
      <span className="profile-panel-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function paymentLabel(booking: Booking) {
  if (booking.paymentProvider) return booking.paymentProvider;
  switch (booking.paymentMethod) {
    case "tnm": return "TNM Mpamba";
    case "airtel": return "Airtel Money";
    case "bank": return "Bank transfer";
    case "card": return "Card";
    default: return "Not recorded";
  }
}

const TABS: { id: ProfileTab; label: string; hint: string; icon: ReactNode }[] = [
  { id: "location", label: "Current location", hint: "Where you are now", icon: <LocationIcon /> },
  { id: "bookings", label: "My bookings", hint: "View your ticket and booking history", icon: <TicketIcon /> },
  { id: "journeys", label: "Recent journeys", hint: "View your travel history", icon: <HistoryIcon /> },
  { id: "reports", label: "My reports", hint: "View report status and staff notes", icon: <TicketIcon /> },
  { id: "notifications", label: "Notifications", hint: "View notifications", icon: <BellIcon /> },
  { id: "saved", label: "Saved routes", hint: "View your saved routes", icon: <BookmarkIcon /> },
  { id: "driver-access", label: "Driver access", hint: "Request a driver role", icon: <TicketIcon /> },
];

export default function ProfilePage() {
  const router = useRouter();
  const session = useSession();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("bookings");
  const [displayName, setDisplayName] = useState("");
  const { data: bookings, usingDemo: bookingsAreDemo, reload: reloadBookings } = useMyBookings();
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
  const [notifications, setNotifications] = useState<VisibleNotification[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<DemoPaymentReceipt[]>([]);
  const [passengerBookingDetails, setPassengerBookingDetails] = useState<PassengerBookingDetails[]>([]);
  const [dataError, setDataError] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState("Share your location to find your nearest departure town.");
  const [locating, setLocating] = useState(false);
  const [driverLicenseId, setDriverLicenseId] = useState("");
  const [driverRequestMessage, setDriverRequestMessage] = useState("");
  const [driverRequestBusy, setDriverRequestBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const passenger = readPassengerSession();
        let storedName = passenger?.fullName ?? "";

        if (!storedName) {
          const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as { fullName?: unknown } | null;
          if (saved && typeof saved.fullName === "string") storedName = saved.fullName;
        }

        setDisplayName(storedName);
        setSavedRoutes(readSavedRoutes());
        setPaymentReceipts(readPaymentReceipts());
        setPassengerBookingDetails(readPassengerBookingDetails());
      } catch {
        setDataError("Some of your profile details could not be loaded from this browser.");
      } finally {
        setReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session?.email) {
      let cancelled = false;
      const timer = window.setTimeout(() => {
        if (!cancelled) setNotifications([]);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    let cancelled = false;
    const refreshNotifications = () => {
      apiNotifications.list().catch(() => []).then((items) => {
        if (!cancelled) setNotifications([...items, ...readBookingNotifications(session.email)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      });
    };
    const refreshStoredNotifications = (event: StorageEvent) => {
      if (event.key === "routewise-demo-notifications-v1" || event.key === null) {
        refreshNotifications();
        reloadBookings();
      }
    };
    const refreshBookings = () => reloadBookings();
    refreshNotifications();
    window.addEventListener("backend-notifications-changed", refreshNotifications);
    window.addEventListener("backend-bookings-changed", refreshBookings);
    window.addEventListener("storage", refreshStoredNotifications);
    return () => {
      cancelled = true;
      window.removeEventListener("backend-notifications-changed", refreshNotifications);
      window.removeEventListener("backend-bookings-changed", refreshBookings);
      window.removeEventListener("storage", refreshStoredNotifications);
    };
  }, [session?.email, reloadBookings]);

  function locate() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }

    setLocating(true);
    setLocationStatus("Finding your current location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("Location found.");
        setLocating(false);
      },
      (reason) => {
        setLocationStatus(
          reason.code === reason.PERMISSION_DENIED
            ? "Location permission was denied. Allow it in your browser to see your nearest town."
            : "Your location could not be found. Please try again.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => locate(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const email = session?.email?.trim().toLowerCase() ?? "";
  const visibleBookings = bookingsAreDemo
    ? bookings.filter((booking) => booking.email.trim().toLowerCase() === email)
    : bookings;
  const myBookings = visibleBookings.map((booking) => {
    const receipt = paymentReceipts.find((item) => item.bookingReference === booking.reference);
    const passengerDetails = passengerBookingDetails.find((item) => item.bookingReference === booking.reference);
    if (!receipt && !passengerDetails) return booking;
    const paymentPaid = receipt ? ["paid", "successful", "success", "completed", "succeeded"].includes(receipt.status) : booking.paymentStatus === "paid";
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
  });
  const myReports = reports
    .filter((report) => report.reporterEmail?.trim().toLowerCase() === email)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const sortedBookings = [...myBookings].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const recentJourneys = myBookings
    .filter((booking) => booking.travelDate < localToday())
    .sort((first, second) => second.travelDate.localeCompare(first.travelDate));
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const nearest = userPosition ? nearestTransportTown(userPosition) : null;
  const initials = (displayName || email || "P")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function signOut() {
    try {
      logout();
    } catch {
      // Continue clearing the passenger session even if one store is blocked.
    }
    try {
      logoutPassenger();
    } catch {
      // Ignore blocked storage during sign-out.
    }
    router.push("/");
  }

  async function cancelBooking(reference: string) {
    const target = bookings.find((booking) => booking.reference === reference);
    if (!target || target.status !== "confirmed") return;

    const updatedBooking: Booking = { ...target, status: "cancelled" };

    if (bookingsAreDemo) {
      const current = readBookings();
      const updated = current.map((booking) =>
        booking.reference === reference ? updatedBooking : booking,
      );
      try {
        saveBookings(updated);
        setBookingNotice(
          `Booking ${reference} cancelled. The seats are now available for other passengers.`,
        );
      } catch {
        setDataError("The booking could not be cancelled on this device. Please try again.");
        return;
      }
    } else {
      try {
        await apiBookings.cancel(reference);
        setBookingNotice(
          `Booking ${reference} cancelled. The seats are now available for other passengers.`,
        );
        reloadBookings();
      } catch (reason) {
        setDataError(
          reason instanceof Error
            ? reason.message
            : "The booking could not be cancelled. Please try again.",
        );
        return;
      }
    }

    try {
      notifyBookingStatus(
        updatedBooking,
        "booking-cancelled",
        `You cancelled your booking for ${target.route || `trip ${target.tripId}`} on ${fmtDate(target.travelDate)}. The seats have been released for other passengers.`,
      );
      void apiNotifications.list().then((items) => {
        setNotifications([...items, ...readBookingNotifications(session?.email)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }).catch(() => undefined);
    } catch {
      // The cancellation is saved even if the notification store is blocked.
    }
  }

  async function markNotificationRead(id: string) {
    if (id.startsWith("demo-")) {
      markBookingNotificationRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      return;
    }
    try {
      await apiNotifications.markAsRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (reason) {
      setDataError(reason instanceof Error ? reason.message : "Notification could not be marked as read.");
    }
  }

  async function requestDriverAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDataError("");
    setDriverRequestMessage("");
    setDriverRequestBusy(true);
    try {
      await authApi.requestDriver(driverLicenseId.trim());
      setDriverLicenseId("");
      setDriverRequestMessage("Driver access request sent. An administrator must approve it before driver sign-in is available.");
    } catch (reason) {
      setDataError(reason instanceof Error ? reason.message : "Driver access request could not be sent.");
    } finally {
      setDriverRequestBusy(false);
    }
  }

  function removeRoute(id: string) {
    try {
      setSavedRoutes(removeSavedRoute(id));
    } catch {
      setDataError("The saved route could not be removed from this browser.");
    }
  }

  return (
    <main className="module-shell profile-shell">
      <header className="module-intro profile-intro">
        <p className="module-eyebrow">PASSENGER PROFILE</p>
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
          <div>
            <h1>{displayName || (session ? "Your profile" : "Your travel profile")}</h1>
            <p>{session ? session.email : "Tickets, journeys, and saved routes."}</p>
          </div>
        </div>
      </header>

      <DemoDataNotice show={bookingsAreDemo} what="bookings" />
      {dataError && <p className="module-error" role="alert">{dataError}</p>}

      {!ready ? (
        <p className="module-empty" role="status">Loading your profile…</p>
      ) : !session ? (
        <section className="module-section profile-signed-out">
          <p className="module-eyebrow">SIGN IN REQUIRED</p>
          <h2>Sign in to view your profile</h2>
          <p>Your tickets, journeys, notifications, and saved routes are linked to your passenger account.</p>
          <div className="module-actions">
            <Link className="primary-button" href="/login">Sign in</Link>
            <Link className="secondary-button" href="/transport-booking">Browse trips</Link>
          </div>
        </section>
      ) : (
        <div className="profile-layout">
          <aside className="profile-menu-card">
            <nav className="profile-menu" aria-label="Profile sections">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={tab === item.id ? "is-active" : ""}
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                >
                  <span className="profile-menu-icon">{item.icon}</span>
                  <span className="profile-menu-text">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                  {item.id === "notifications" && unreadCount > 0 && (
                    <span className="profile-menu-count">{unreadCount}</span>
                  )}
                </button>
              ))}
            </nav>
            <button type="button" className="profile-logout" onClick={signOut}>
              <LogoutIcon />
              <span>Log out</span>
            </button>
          </aside>

          <section className="module-section profile-panel" aria-live="polite">
            {tab === "location" && (
              <>
                <PanelHeading
                  icon={<LocationIcon />}
                  title="Current location"
                  description="Used to estimate the distance from you to your departure town."
                />
                <div className="profile-location-card">
                  <p className="profile-location-status" role="status">{locationStatus}</p>
                  {userPosition && (
                    <div className="profile-location-grid">
                      <div>
                        <span>Nearest transport town</span>
                        <strong>{nearest ? nearest.town : "Outside supported towns"}</strong>
                      </div>
                      <div>
                        <span>Distance</span>
                        <strong>{nearest ? `≈ ${Math.round(nearest.distance)} km` : "—"}</strong>
                      </div>
                      <div>
                        <span>Coordinates</span>
                        <strong>{userPosition.lat.toFixed(4)}, {userPosition.lng.toFixed(4)}</strong>
                      </div>
                    </div>
                  )}
                  <div className="module-actions">
                    <button className="primary-button" type="button" onClick={locate} disabled={locating}>
                      {locating ? "Finding location…" : "Update current location"}
                    </button>
                    <Link className="secondary-button" href="/transport-booking">Plan a trip from here</Link>
                  </div>
                </div>
                <p className="module-footnote">Location is used only in this browser and is never stored or shared.</p>
              </>
            )}

            {tab === "bookings" && (
              <>
                <PanelHeading
                  icon={<TicketIcon />}
                  title="My bookings"
                  description="View your ticket and booking history."
                />
                {bookingNotice && (
                  <p className="module-feedback" role="status">{bookingNotice}</p>
                )}
                {sortedBookings.length === 0 ? (
                  <div className="module-empty">
                    <p>No bookings are linked to {session.email} on this device yet.</p>
                    <Link className="primary-button" href="/transport-booking">Book a trip</Link>
                  </div>
                ) : (
                  <div className="profile-booking-list">
                    {sortedBookings.map((booking) => (
                      <article className="profile-booking-card" key={booking.reference}>
                        <div className="profile-booking-head">
                          <div>
                            <p className="module-eyebrow">{booking.status === "confirmed" ? "BOOKING" : "BOOKING HISTORY"}</p>
                            <h3>{booking.route}</h3>
                          </div>
                          <div className="profile-booking-actions">
                            <span className={`status-tag ${booking.status}`}>{booking.status}</span>
                            {booking.status === "confirmed" && (
                              <>
                                {booking.paymentStatus !== "paid" && <Link className="text-action" href={`/transport-booking?bookingReference=${encodeURIComponent(booking.reference)}`}>Continue payment</Link>}
                                <button
                                  type="button"
                                  className="text-action danger-action"
                                  onClick={() => cancelBooking(booking.reference)}
                                >
                                  Cancel booking
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="profile-booking-meta">
                          <span>{fmtDate(booking.travelDate)}</span>
                          <span>{booking.pickup} → {booking.dropoff}</span>
                          <span>{booking.passengers} passenger{booking.passengers === 1 ? "" : "s"}</span>
                          <span>Ref. {booking.reference}</span>
                        </div>
                        <details className="profile-ticket">
                          <summary>View ticket</summary>
                          <div className="profile-ticket-body">
                            <dl>
                              <div><dt>Passenger</dt><dd>{booking.name}</dd></div>
                              <div><dt>Passenger email</dt><dd>{booking.email || "Not recorded"}</dd></div>
                              <div><dt>Passenger phone</dt><dd>{booking.payerPhone ?? "Not recorded"}</dd></div>
                              <div><dt>Travel date</dt><dd>{fmtDate(booking.travelDate)}</dd></div>
                              <div><dt>Seats</dt><dd>{booking.seats?.length ? booking.seats.join(", ") : "Not recorded"}</dd></div>
                              <div><dt>Payment method</dt><dd>{paymentLabel(booking)}</dd></div>
                              <div><dt>Payment status</dt><dd>{booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus === "failed" ? "Failed" : "Not paid"}</dd></div>
                              <div><dt>Amount paid</dt><dd>{booking.paymentStatus === "paid" && booking.amountPaid !== undefined ? `MWK ${booking.amountPaid.toLocaleString("en-MW")}` : "Not paid"}</dd></div>
                              <div><dt>Payment reference</dt><dd>{booking.paymentReference ?? "Not recorded"}</dd></div>
                              <div><dt>Payment record ID</dt><dd>{booking.paymentId ?? "Not recorded"}</dd></div>
                              <div><dt>Confirmation code</dt><dd>{booking.paymentCode ?? "Not recorded"}</dd></div>
                              {booking.paidAt && <div><dt>Paid at</dt><dd>{new Date(booking.paidAt).toLocaleString()}</dd></div>}
                              <div><dt>Status</dt><dd>{booking.status}</dd></div>
                            </dl>
                            <p className="module-footnote">Payment status comes from the payment response. Passenger details and payment IDs saved in this browser are available on this device; the backend does not provide payment history for older bookings.</p>
                          </div>
                        </details>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "journeys" && (
              <>
                <PanelHeading
                  icon={<HistoryIcon />}
                  title="Recent journeys"
                  description="View your travel history."
                />
                {recentJourneys.length === 0 ? (
                  <div className="module-empty">
                    <p>No past journeys yet. Trips appear here after their travel date.</p>
                    <Link className="secondary-button" href="/transport-booking">Plan your next journey</Link>
                  </div>
                ) : (
                  <ol className="profile-journey-list">
                    {recentJourneys.map((journey) => (
                      <li key={journey.reference}>
                        <span className="profile-journey-dot" aria-hidden="true" />
                        <div>
                          <strong>{journey.route}</strong>
                          <p>{fmtDate(journey.travelDate)} · {journey.pickup} → {journey.dropoff}</p>
                          <small>
                            {journey.passengers} passenger{journey.passengers === 1 ? "" : "s"} ·{" "}
                            MWK {(journey.amountPaid ?? 0).toLocaleString("en-MW")} · {journey.status}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}

            {tab === "reports" && (
              <>
                <PanelHeading
                  icon={<TicketIcon />}
                  title="My reports"
                  description="See the reports you submitted and the company response."
                />
                {myReports.length === 0 ? (
                  <div className="module-empty">
                    <p>No reports are linked to your account yet.</p>
                    <Link className="secondary-button" href="/help#report-heading">Report a route or stop issue</Link>
                  </div>
                ) : (
                  <div className="report-update-list">
                    {myReports.map((report) => (
                      <article className="report-update-card" key={report.id}>
                        <div className="report-update-heading">
                          <div><strong>{report.type}: {report.itemName}</strong><small>Reference {report.id.toUpperCase()} · {new Date(report.createdAt).toLocaleString()}</small></div>
                          <span className={`report-status-badge is-${report.status}`}>{report.status === "open" ? "Awaiting review" : report.status === "reviewing" ? "Being considered" : report.status === "resolved" ? "Resolved" : "Closed"}</span>
                        </div>
                        {report.location && <p><strong>Location:</strong> {report.location}</p>}
                        <p>{report.description}</p>
                        {report.adminNote.trim() && <div className="report-staff-note"><strong>Company response</strong><p>{report.adminNote}</p></div>}
                      </article>
                    ))}
                  </div>
                )}
                <p className="module-footnote">Reports and company responses are demonstration records saved in this browser.</p>
              </>
            )}

            {tab === "notifications" && (
              <>
                <PanelHeading
                  icon={<BellIcon />}
                  title="Notifications"
                  description="View payment confirmations and route updates."
                />
                {notifications.length === 0 ? (
                  <div className="module-empty">
                    <p>No notifications yet. Payment and route updates will appear here.</p>
                  </div>
                ) : (
                  <ul className="profile-notification-list">
                    {notifications.map((notification) => (
                      <li key={notification.id} className={notification.read ? "" : "is-unread"}>
                        <div className="profile-notification-head">
                          <strong>{notification.title}</strong>
                          {"source" in notification && notification.source === "demo" && <span className="profile-unread-dot">Demo</span>}
                          {!notification.read && <span className="profile-unread-dot">New</span>}
                        </div>
                        <p>{notification.message}</p>
                        <small>{new Date(notification.createdAt).toLocaleString()}</small>
                        {!notification.read && <button type="button" className="text-action" onClick={() => void markNotificationRead(notification.id)}>Mark as read</button>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="module-footnote">Account notices come from the backend. Booking, report, and company demo updates are saved in this browser and shown in the bell and profile.</p>
              </>
            )}

            {tab === "saved" && (
              <>
                <PanelHeading
                  icon={<BookmarkIcon />}
                  title="Saved routes"
                  description="View your saved routes."
                />
                <DemoDataNotice show what="saved routes (stored in this browser only; the backend has no saved-routes endpoint)" />
                {savedRoutes.length === 0 ? (
                  <div className="module-empty">
                    <p>No saved routes yet. Use the bookmark on a departure card to save a route.</p>
                    <Link className="primary-button" href="/transport-booking">Browse departures</Link>
                  </div>
                ) : (
                  <ul className="profile-saved-list">
                    {savedRoutes.map((route) => (
                      <li key={route.id}>
                        <span className="profile-saved-icon"><BookmarkIcon filled /></span>
                        <div>
                          <strong>{route.route}</strong>
                          <p>MWK {route.fare.toLocaleString("en-MW")} · Saved {new Date(route.savedAt).toLocaleDateString("en-MW")}</p>
                        </div>
                        <div className="profile-saved-actions">
                          <Link
                            className="secondary-button"
                            href={`/transport-booking?origin=${encodeURIComponent(route.route.split(" → ")[0] ?? "")}&destination=${encodeURIComponent(route.route.split(" → ")[1] ?? "")}`}
                          >
                            Find trips
                          </Link>
                          <button type="button" className="text-action" onClick={() => removeRoute(route.id)}>
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {tab === "driver-access" && (
              <>
                <PanelHeading icon={<TicketIcon />} title="Request driver access" description="Submit your license ID for administrator review." />
                <form className="module-form narrow-form" onSubmit={requestDriverAccess}>
                  <label>Driver license ID<input value={driverLicenseId} onChange={(event) => setDriverLicenseId(event.target.value)} required /></label>
                  <button className="primary-button form-submit" type="submit" disabled={driverRequestBusy}>{driverRequestBusy ? "Sending request…" : "Request driver access"}</button>
                </form>
                {driverRequestMessage && <p className="module-feedback success" role="status">{driverRequestMessage}</p>}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
