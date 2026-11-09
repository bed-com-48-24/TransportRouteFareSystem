# MOVA mobile-to-web mockup coverage

## Current scope

The website implements a frontend demonstration only. It does not call the MOVA API described by the mobile requirements. Routes, schedules, fares, bookings, profile details, reports, and notifications are sample data or browser storage. Browser storage is device-local and is not authoritative or shared. Checkout is simulated, and no payment details or money are handled.

The web mockup now demonstrates:

- Home destination suggestions, recent destinations (up to five), and featured routes.
- Route search, connecting-journey summaries, ordered route stops, and route detail pages.
- Schedule cards, destination/date filters, a map view, seat selection (41-seat sample buses), and trip details.
- Passenger name, email, phone, and optional identification details in the booking flow.
- Simulated payment method/status, local booking history, cancellation, and a QR e-ticket preview.
- Local passenger profile and notifications, including simulated booking/payment updates.
- Admin mock screens for routes, fares, featured/active flags, ordered stops, schedules, reports, and bookings.

These are UI demonstrations, not implementations of the API's authentication, authorization, concurrency, or payment safeguards. In particular, mock bookings and administrator controls must not be used for real travel or payment.

## Future API integration reference

The backend contract supplied by the mobile team uses `/api/v1` and bearer authentication. The web frontend should be integrated only after the backend team provides a deployed API and agreed response shapes.

Required passenger-facing resources from that contract:

| Area | Methods and endpoints |
|---|---|
| Auth and profile | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset`; `GET /me`, `/me/passenger-profile`; `PUT /me/passenger-profile` |
| Route discovery | `GET /routes`, `/routes/{routeId}`, `/routes/search`, `/places/search` |
| Schedules and seats | `GET /schedules`, `/schedules/{scheduleId}`, `/schedules/{scheduleId}/seats` |
| Bookings | `POST /bookings`, `GET /me/bookings`, `/bookings/{reference}`, `PATCH /bookings/{reference}/passenger`, `POST /bookings/{reference}/cancel` |
| Payments | `GET /payment-methods`, `POST /bookings/{reference}/payments`, `GET /payments/{paymentId}`, `POST /payments/webhooks/{provider}` |
| Notifications | `GET /me/notifications`, `/me/notifications/unread-count`; `PATCH /me/notifications/{notificationId}` |

Admin resource groups are `GET/POST /admin/routes`, `GET/PATCH/DELETE /admin/routes/{routeId}`, `PUT /admin/routes/{routeId}/stops`, `PATCH /admin/routes/{routeId}/fare`; `GET/POST /admin/schedules`, `GET/PATCH/DELETE /admin/schedules/{scheduleId}`; and `GET /admin/bookings`, `/admin/bookings/{reference}`.

When integration is authorized, the website must rely on the server for route/schedule status, fare totals, seat availability and holds, booking ownership/status, payment outcome, and notifications. It must not treat a browser-generated payment reference or localStorage record as proof of payment or booking.
