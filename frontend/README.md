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

- `/` — welcome page linking straight to sign-in and trip exploration.
- `/login` — sign in or create a passenger account directly; there is no account-type chooser step.
- `/login/user` — the same passenger sign-in / registration form, linked from booking and profile pages.
- `/login/admin` — sign in or register with a company name and company email.
- `/home` — the travel homepage shown after successful sign-in. It detects the nearest supported town (with permission), lets the passenger enter a destination, and checks for a direct or connecting admin-defined route before showing results.
- `/routes-fares` — public route discovery and autocomplete journey search; see direct or connecting results, route details, estimated fares, and pickup/drop-off points without signing in.
- `/transport-booking` — search by starting town, destination, and travel date; choose an admin-scheduled departure, seats, and a simulated payment option to receive a QR ticket.
- `/accounts-reports` — sign in, create an account, update a profile, continue as a guest, or report incorrect transport information and follow the report's status.
- `/help` — booking steps plus the same signed-in or guest report form, with report status and staff notes.
- `/maps-admin-integration` — the administration map page. Passengers see route maps inside the booking flow (the Cards/Map switch and each trip's map), not in the main navigation. Authorized administrators open the company workspace from `?panel=admin` and can deep-link to a section with `?panel=admin&section=<section>`, or open the public map from the workspace.

Stops can be pickup points, drop-off points, or both. Route and stop information is shared between search, booking, map, and administration views.

## Admin workspace

Sign in at `/login` to open the company workspace. Its tabs cover each task separately and are deep-linkable. Saving a new route and fare starts a guided setup flow through **Stops → Schedules → Bookings → Passengers → Fleet & access → Reports → Company**. Adding a new stop advances to Schedules, and scheduling a new departure advances to Bookings. Every step also has a **Continue** button, and the last one returns to Overview:

- **Overview** — live counts for routes, upcoming departures, seats sold and available, paid demo revenue, bookings, reports, passengers, and stops, plus the latest passenger bookings and reports.
- **Routes & fares** — add, edit, or remove a route and its estimated fare. Changes immediately affect passenger route search, fare estimates, and saved routes.
- **Stops** — add, edit, or remove pickup/drop-off points and map coordinates. Renaming a stop updates the scheduled trips and existing bookings that use it.
- **Schedules** — add or edit future departures with date, times, seat capacity, fare, and pickup/drop-off points. Only these departures can be booked by passengers.
- **Bookings** — search, filter, cancel, and re-confirm passenger bookings. Seat availability is checked against the live seat map, including seat 1 reserved for the transport admin, and the passenger receives an in-app notification.
- **Passengers** — see registered passenger accounts and guest contacts from bookings and reports, then send an in-app update to a passenger.
- **Fleet & access** — approve driver/admin access requests, manage vehicles and assigned drivers, and look up individual backend records.
- **Reports** — filter by status, save a staff note, change the report status, or delete a report. Status changes and notes appear in the passenger's report updates and notification feed.
- **Company** — update the company name or send an announcement to the passenger notification feed.

Administrator actions use the same browser data as passenger pages, so route, fare, schedule, stop, booking, report, and notification changes stay aligned. The old `/maps-admin-integration/admin/bookings` and `/maps-admin-integration/admin/reports` URLs redirect to the matching workspace section.

## Colour system

The interface uses one documented palette defined as CSS custom properties at the top of `app/globals.css`. New work should reference the tokens rather than hard-coded hex values.

| Role | Token | Value | Used for |
| --- | --- | --- | --- |
| Brand ink | `--sb-ink` | `#12304a` | Header marks, headings, dark heroes, primary buttons |
| Ink soft | `--sb-ink-soft` | `#29466d` | Secondary headings, hover ink, badges |
| Text | `--sb-text` | `#334e68` | Body copy and nav labels |
| Text muted | `--sb-text-muted` | `#526d87` | Supporting copy and form help |
| Text quiet | `--sb-text-quiet` | `#5b7288` | Captions, metadata, placeholders |
| Accent | `--sb-accent` | `#1d4ed8` | Links, focus, primary actions |
| Accent soft | `--sb-accent-soft` | `#eaf2fa` | Selected and highlighted surfaces |
| Page | `--sb-page` | `#f5f8fb` | App background |
| Surface | `--sb-surface` | `#ffffff` | Cards, panels, inputs |
| Border | `--sb-border` | `#d7e2ef` | Default dividers and outlines |
| Border strong | `--sb-border-strong` | `#b7cde0` | Emphasised edges |
| Success | `--sb-success` | `#1f6b45` | Positive states (on `#e6f6ec`) |
| Danger | `--sb-danger` | `#943f37` | Errors and cancellation (on `#fff1ef`) |
| Warning | `--sb-warning` | `#8a5a16` | Pending and advisory states (on `#fff4e0`) |

Design rules followed:

- **One accent.** Every interactive state uses the same blue, so links, focus rings, and primary buttons read as one system.
- **Ink for identity, neutrals for reading.** Navy carries brand meaning; text is a grey-blue scale rather than pure black or grey.
- **Contrast first.** All text tokens clear WCAG AA on the page background (text-quiet is 4.7:1, the lightest step). Status text on its tint is at least 5.4:1. Disabled controls are intentionally exempt.
- **Semantic colour only for status.** Green, red, and amber never decorate; they only signal an outcome.
- **Map pins keep their own scheme** (origin green, destination red, user location sky) because they encode data rather than interface state.

Legacy names `--navy`, `--navy-light`, `--line`, `--muted`, `--background`, and `--foreground` are aliases of the tokens above, so older rules keep working while they are migrated.

## Validation

```bash
npm run test:seat-availability
npm run lint
npm run build
```

## Prototype limitations

This project stores accounts, reports, routes, fares, stops, admin-created trip schedules, reservations, and in-app booking notifications in the current browser. An administrator adds a route schedule with a future date, times, seat capacity, and fare; passengers can book only an exact matching route and date. If none exists, the booking page says the trip was not scheduled. Account creation uses an existing email address; it does not create Google/Gmail accounts or verify company email addresses. Location access requires browser permission and suggests an approximate supported starting town; if access is unavailable, the passenger can enter a town manually. Data is not shared between devices, and browser-side administrator access is not production security. Checkout is a demo: no money is collected, and the demo mobile-money/bank details and payment PIN are never stored or sent anywhere.

The map pages request road-following geometry from the public OSRM routing demo service using OpenStreetMap road data. The service is external, keyless, and has no availability guarantee; while a request is pending or if it fails, a dashed direct-line connection remains visible. Road geometry depends on mapped roads and driving access, and is an estimate rather than an operator-verified itinerary.
