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
<<<<<<< HEAD
- `/accounts-reports` — submit travel reports and check local demo updates.
- `/accounts-reports/home` — passenger dashboard with local profile and notification pages.
- `/transport-booking/my-bookings` — find or cancel demo bookings on this device.
- `/maps-admin-integration` — explore the route map and nearby stops; the admin demo manages routes, stops, reports, and bookings.
=======
- `/accounts-reports` — sign in, create an account, reset a password, update a profile, continue as a guest, or report incorrect transport information.
- `/maps-admin-integration` — use your location to find pickup and drop-off stops within 30 km; authorized administrators can manage transport information.
>>>>>>> origin/feature/integration

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
<<<<<<< HEAD
=======

## Passenger authentication setup

Passenger sign-in, account creation, and password recovery use Supabase Auth. Create a Supabase project, enable email/password authentication, and copy `.env.example` to `.env.local` with the project URL and public anon key. These `NEXT_PUBLIC_` values are intentionally public; never put a Supabase service-role key in the frontend.

In the Supabase Auth URL configuration, set the local site URL to `http://localhost:3000` and allow the deployed site URL too. Allow `/login?mode=reset` and `/login?mode=confirmed` as redirect URLs (or use an appropriately scoped wildcard). Configure email delivery in Supabase before expecting real messages.

Passenger accounts created by the earlier browser-only prototype are not migrated. Those passengers must create new Supabase accounts; existing routes and bookings remain in browser storage.

## Prototype limitations

This project stores reports, routes, fares, stops, and reservations in the current browser. Passenger credentials and authentication sessions are managed by Supabase, but bookings are not shared between devices. Browser-side administrator access is not production security. Trip schedules and fares are examples; reservations do not collect payment.
>>>>>>> origin/feature/integration
