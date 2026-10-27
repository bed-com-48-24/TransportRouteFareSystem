import Link from "next/link";

const items = [
  ["/maps-admin-integration/nearby", "Nearby stops map", "Find pickup and drop-off points near a selected area or your location"],
  ["/maps-admin-integration/admin/routes", "Admin: routes", "Add, edit and remove routes"],
  ["/maps-admin-integration/admin/fares", "Admin: fares", "Manage estimated fares"],
  ["/maps-admin-integration/admin/stops", "Admin: stops", "Manage pickup and drop-off stops"],
  ["/maps-admin-integration/admin/reports", "Admin: reports", "Review and update passenger information reports"],
  ["/transport-booking/manage", "Admin: bookings", "Review demo reservations saved on this device"],
] as const;

export default function MapsAdminHub() {
  return (
    <main className="admin-hub">
      <Link href="/" className="nearby-back">← Passenger home</Link>
      <p className="admin-kicker">SYSTEM TOOLS</p>
      <h1 className="admin-title">Maps and administration</h1>
      <p className="admin-description">Maintain transport information and review passenger activity.</p>
      <ul className="admin-hub-grid">
        {items.map(([href, title, text]) => (
          <li key={href}>
            <Link href={href}><strong>{title}</strong><span>{text}</span><b>Open tool →</b></Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
