# SBUS Transport Information System

A simple transport information prototype for passengers planning journeys in Malawi. The interface uses a white and dark-blue palette and keeps each passenger workflow together on one page.

## Run locally

From the repository root, run:

```bash
npm run start:dev
```

Open [http://localhost:3000](http://localhost:3000).

From the `frontend` directory, either command works:

```bash
npm run start:dev
# or
npm run dev
```

## Passenger pages

- `/routes-fares` — search between towns and see direct or connecting routes, estimated fares, and pickup/drop-off points.
- `/transport-booking` — compare departures, select a trip, enter passenger details, confirm a reservation, and view or cancel bookings.
- `/accounts-reports` — submit travel reports and check local demo updates.
- `/accounts-reports/home` — passenger dashboard with local profile and notification pages.
- `/transport-booking/my-bookings` — find or cancel demo bookings on this device.
- `/maps-admin-integration` — explore the route map and nearby stops; the admin demo manages routes, stops, reports, and bookings.

Stops can be pickup points, drop-off points, or both. Route and stop information is shared between search, booking, map, and administration views.

## Mockup scope

This is a frontend-only demonstration. Routes, schedules, profile details, bookings, reports, and notifications use sample data or browser storage. There are no calls to the MOVA backend, bookings are not shared across devices, and checkout is simulated; no money is collected. Browser administrator access is for demonstration only and is not secure.

The mobile-to-web feature notes and future API expectations are documented in [docs/API-ENDPOINTS.md](./docs/API-ENDPOINTS.md). That document is a handoff reference, not an implemented backend integration.

## Validation

```bash
npm run test:seat-availability
npm run lint
npm run build
```
