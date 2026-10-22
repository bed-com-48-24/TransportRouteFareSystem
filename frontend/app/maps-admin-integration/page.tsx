import Link from "next/link";

const items = [
  ["/maps-admin-integration/nearby", "Nearby stops map", "Find pickup and drop-off points near you"],
  ["/maps-admin-integration/admin/routes", "Admin: routes", "Add, edit and remove routes"],
  ["/maps-admin-integration/admin/fares", "Admin: fares", "Manage estimated fares"],
  ["/maps-admin-integration/admin/stops", "Admin: stops", "Manage pickup and drop-off stops"],
  ["/maps-admin-integration/admin/reports", "Admin: reports", "Review passenger reports"],
  ["/maps-admin-integration/admin/bookings", "Admin: bookings", "View and manage bookings"],
] as const;

export default function MapsAdminHub() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Maps and administration</h1>
      <ul style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {items.map(([href, title, text]) => (
          <li key={href} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <Link href={href}><strong>{title}</strong></Link>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}