"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import ListPagination from "@/components/ListPagination";
import { usePagedItems } from "@/components/usePagedItems";
import { useSession } from "@/lib/auth";
import { fmtDate } from "@/lib/booking-data";
import { nearestTransportTown, type Coordinates } from "@/lib/malawi-locations";
import * as apiNotifications from "@/services/notifications.service";
import { readBookingNotifications, type DemoNotification } from "@/lib/notifications";
import { readPassengerSession } from "@/lib/passenger-auth";
import { useMyBookings } from "@/lib/use-backend-data";
import type { ReportItem } from "@/lib/types";
import { withLocalBookingDetails } from "@/lib/profile-booking";
import type { Notification } from "@/services/types";
import { readPaymentReceipts, type DemoPaymentReceipt } from "@/lib/payment-receipts";
import { readPassengerBookingDetails, type PassengerBookingDetails } from "@/lib/passenger-booking-details";
import { KEYS, MOCK_REPORTS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";

type ProfileTab = "location" | "bookings" | "journeys" | "reports" | "notifications";
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

function PanelHeading({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="profile-panel-heading">
      <span className="profile-panel-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const TABS: { id: ProfileTab; label: string; icon: ReactNode }[] = [
  { id: "location", label: "Current location", icon: <LocationIcon /> },
  { id: "bookings", label: "My bookings", icon: <TicketIcon /> },
  { id: "journeys", label: "Recent journeys", icon: <HistoryIcon /> },
  { id: "reports", label: "My reports", icon: <TicketIcon /> },
  { id: "notifications", label: "Notifications", icon: <BellIcon /> },
];

export default function ProfilePage() {
  const session = useSession();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("bookings");
  const [displayName, setDisplayName] = useState("");
  const { data: bookings, usingDemo: bookingsAreDemo, reload: reloadBookings } = useMyBookings();
  const reports = useStoredList<ReportItem>(KEYS.reports, MOCK_REPORTS);
  const [notifications, setNotifications] = useState<VisibleNotification[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<DemoPaymentReceipt[]>([]);
  const [passengerBookingDetails, setPassengerBookingDetails] = useState<PassengerBookingDetails[]>([]);
  const [dataError, setDataError] = useState("");
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState("Share your location to find your nearest departure town.");
  const [locating, setLocating] = useState(false);

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
        setLocationStatus("");
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
  const myBookings = visibleBookings.map((booking) => withLocalBookingDetails(
    booking,
    paymentReceipts.find((item) => item.bookingReference === booking.reference),
    passengerBookingDetails.find((item) => item.bookingReference === booking.reference),
  ));
  const myReports = reports
    .filter((report) => report.reporterEmail?.trim().toLowerCase() === email)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const sortedBookings = [...myBookings].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const recentJourneys = myBookings
    .filter((booking) => booking.travelDate < localToday())
    .sort((first, second) => second.travelDate.localeCompare(first.travelDate));
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const bookingPages = usePagedItems(sortedBookings, (booking) => `${booking.route} ${booking.travelDate}`);
  const journeyPages = usePagedItems(recentJourneys, (journey) => `${journey.route} ${journey.travelDate}`);
  const reportPages = usePagedItems(myReports, (report) => `${report.type} ${report.itemName}`);
  const notificationPages = usePagedItems(notifications, (notification) => notification.title);
  const nearest = userPosition ? nearestTransportTown(userPosition) : null;
  const initials = (displayName || email || "P")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="module-shell profile-shell transport-page-shell">
      <div className="transport-background" aria-hidden="true" />
      <header className="module-intro profile-intro">
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
          <div>
            <h1>{displayName || (session ? "Your profile" : "Your travel profile")}</h1>
            <p>{session ? session.email : "Tickets, journeys, and notifications."}</p>
          </div>
        </div>
      </header>

      {dataError && <p className="module-error" role="alert">{dataError}</p>}

      {!ready ? (
        <p className="module-empty" role="status">Loading your profile…</p>
      ) : !session ? (
        <section className="module-section profile-signed-out">
          <p className="module-eyebrow">SIGN IN REQUIRED</p>
          <h2>Sign in to view your profile</h2>
          <p>Your tickets, journeys, and notifications are linked to your passenger account.</p>
          <div className="module-actions">
            <Link className="primary-button" href="/login/user">Sign in</Link>
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
                  </span>
                  {item.id === "notifications" && unreadCount > 0 && (
                    <span className="profile-menu-count">{unreadCount}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <section className="module-section profile-panel" aria-live="polite">
            {tab === "location" && (
              <>
                <PanelHeading icon={<LocationIcon />} title="Current location" />
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
                  </div>
                </div>
              </>
            )}

            {tab === "bookings" && (
              <>
                <PanelHeading icon={<TicketIcon />} title="My bookings" />
                {sortedBookings.length === 0 ? (
                  <div className="module-empty">
                    <p>No bookings are linked to {session.email} on this device yet.</p>
                    <Link className="primary-button" href="/transport-booking">Book a trip</Link>
                  </div>
                ) : (
                  <div className="admin-table-wrap profile-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Passenger</th>
                          <th>Phone</th>
                          <th>Route</th>
                          <th>Travel date</th>
                          <th>Ticket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingPages.visibleItems.map((booking) => (
                          <tr key={booking.reference}>
                            <td><strong>{booking.reference}</strong></td>
                            <td>{booking.name}<small>{booking.email}</small></td>
                            <td>{booking.payerPhone ?? "Not recorded"}</td>
                            <td>{booking.route}<small>{booking.pickup} → {booking.dropoff}</small></td>
                            <td>{fmtDate(booking.travelDate)}</td>
                            <td>
                              <Link className="text-action" href={`/profile/ticket/${encodeURIComponent(booking.reference)}`}>Ticket</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ListPagination
                  page={bookingPages.page}
                  pageCount={bookingPages.pageCount}
                  onPageChange={bookingPages.setPage}
                  label="booking"
                />
              </>
            )}

            {tab === "journeys" && (
              <>
                <PanelHeading icon={<HistoryIcon />} title="Recent journeys" />
                {recentJourneys.length === 0 ? (
                  <div className="module-empty">
                    <p>No past journeys yet. Trips appear here after their travel date.</p>
                    <Link className="secondary-button" href="/transport-booking">Plan your next journey</Link>
                  </div>
                ) : (
                  <ol className="profile-journey-list">
                    {journeyPages.visibleItems.map((journey) => (
                      <li key={journey.reference}>
                        <span className="profile-journey-dot" aria-hidden="true" />
                        <div>
                          <strong>{journey.route}</strong>
                          <p>{fmtDate(journey.travelDate)} · {journey.pickup} → {journey.dropoff}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <ListPagination
                  page={journeyPages.page}
                  pageCount={journeyPages.pageCount}
                  onPageChange={journeyPages.setPage}
                  label="journey"
                />
              </>
            )}

            {tab === "reports" && (
              <>
                <PanelHeading icon={<TicketIcon />} title="My reports" />
                {myReports.length === 0 ? (
                  <div className="module-empty">
                    <p>No reports are linked to your account yet.</p>
                    <Link className="secondary-button" href="/help#report-heading">Report a route or stop issue</Link>
                  </div>
                ) : (
                  <div className="admin-table-wrap profile-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Report</th>
                          <th>Location</th>
                          <th>Submitted</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportPages.visibleItems.map((report) => (
                          <tr key={report.id}>
                            <td>{report.type}</td>
                            <td>
                              <strong>{report.itemName}</strong>
                              <small>Ref. {report.id.toUpperCase()}</small>
                              <small>{report.description}</small>
                            </td>
                            <td>{report.location || "Not recorded"}</td>
                            <td>{new Date(report.createdAt).toLocaleString()}</td>
                            <td>
                              <span className={`report-status-badge is-${report.status}`}>
                                {report.status === "open" ? "Awaiting review" : report.status === "reviewing" ? "Being considered" : report.status === "resolved" ? "Resolved" : "Closed"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ListPagination
                  page={reportPages.page}
                  pageCount={reportPages.pageCount}
                  onPageChange={reportPages.setPage}
                  label="report"
                />
              </>
            )}

            {tab === "notifications" && (
              <>
                <PanelHeading icon={<BellIcon />} title="Notifications" />
                {notifications.length === 0 ? (
                  <div className="module-empty">
                    <p>No notifications yet. Payment and route updates will appear here.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrap profile-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Message</th>
                          <th>Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notificationPages.visibleItems.map((notification) => (
                          <tr key={notification.id}>
                            <td><strong>{notification.title}</strong></td>
                            <td>{notification.message}</td>
                            <td>{new Date(notification.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ListPagination
                  page={notificationPages.page}
                  pageCount={notificationPages.pageCount}
                  onPageChange={notificationPages.setPage}
                  label="notification"
                />
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
