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
- `/accounts-reports` — sign in, create an account, update a profile, continue as a guest, or report incorrect transport information.
- `/maps-admin-integration` — explore the route map and nearby stops; authorized administrators can manage routes, fares, stops, reports, and bookings.

Stops can be pickup points, drop-off points, or both. Route and stop information is shared between search, booking, map, and administration views.

## Validation

```bash
npm run test:seat-availability
npm run lint
npm run build
```

## Prototype limitations

This project stores accounts, reports, routes, fares, stops, and reservations in the current browser. Data is not shared between devices, and browser-side administrator access is not production security. Trip schedules and fares are examples; reservations do not collect payment.
