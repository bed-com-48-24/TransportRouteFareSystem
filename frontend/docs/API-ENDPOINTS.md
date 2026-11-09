# API Endpoints for Current SBUS Screens

This is a backend handoff based on the features currently present in the frontend pages. The frontend does not currently call a backend API: it uses browser storage and sample data. These are the endpoints needed to connect those existing screens, not endpoints that have already been implemented.

Base path: `/api/v1`

Send and receive JSON. Protect staff operations with real server-side staff authentication. Passenger-specific operations must not rely on browser storage as proof of identity.

## Endpoint list

| Method | Endpoint | Used by current screen |
|---|---|---|
| POST | `/auth/passenger/register` | Passenger create-account form |
| POST | `/auth/passenger/login` | Passenger sign-in form |
| POST | `/auth/passenger/logout` | Passenger sign-out button |
| GET | `/auth/passenger/session` | Restore signed-in passenger/profile on page load |
| GET | `/passenger/profile` | Load saved passenger name, email, and phone |
| PATCH | `/passenger/profile` | Save passenger name and optional phone |
| POST | `/auth/admin/login` | Staff sign-in form |
| POST | `/auth/admin/logout` | Staff logout button |
| GET | `/auth/admin/session` | Check staff session before showing admin screens |
| GET | `/routes` | Route/fare search and map route list |
| POST | `/admin/routes` | Add a route and its estimated fare |
| PUT | `/admin/routes/{routeId}` | Edit a route and its estimated fare |
| DELETE | `/admin/routes/{routeId}` | Remove a route and its fare |
| GET | `/stops` | Map, nearby-stop list, and route search pickup/drop-off details |
| POST | `/admin/stops` | Add a pickup/drop-off stop |
| PUT | `/admin/stops/{stopId}` | Edit a stop |
| DELETE | `/admin/stops/{stopId}` | Remove a stop |
| GET | `/trips` | Browse departures; filter by destination/date |
| GET | `/trips/{tripId}/availability` | Show remaining seats and seat selection |
| POST | `/bookings` | Reserve seats after the mock checkout step |
| GET | `/bookings?email={email}` | Find bookings by the email entered on the My Bookings screen |
| POST | `/bookings/{reference}/cancel` | Cancel a confirmed passenger booking |
| GET | `/admin/bookings?query={text}` | Admin bookings screen search |
| PATCH | `/admin/bookings/{reference}` | Admin cancel or re-confirm a booking |
| POST | `/reports` | Submit a report from Account or Help screens |
| GET | `/reports?email={email}` | Show report updates matching the entered email |
| GET | `/admin/reports?status={status}` | Admin report list and status filter |
| PATCH | `/admin/reports/{reportId}` | Admin update report status or note |
| DELETE | `/admin/reports/{reportId}` | Admin delete a report |

## Current screen behavior and request fields

### Passenger and staff accounts

- Passenger registration: `{ "fullName": "Passenger Name", "email": "person@example.com", "password": "..." }`. The screen requires a name of 2–100 characters, a valid email, and a password of at least 8 characters. Password confirmation is checked in the UI and is not sent as a separate field.
- Passenger login: `{ "email": "person@example.com", "password": "..." }`.
- Passenger session response: `{ "fullName": "Passenger Name", "email": "person@example.com" }`.
- Passenger profile response: `{ "fullName": "Passenger Name", "email": "person@example.com", "phone": "+265..." }`.
- Profile update: `{ "fullName": "Updated Name", "phone": "+265..." }`. Email is displayed as read-only. Phone is optional.
- Staff login: `{ "email": "staff@example.com", "password": "..." }`. The current prototype accepts any non-empty username and password; the backend must use actual staff credentials and enforce staff authorization.
- The UI does not currently provide admin registration, password reset, or account deletion.

### Routes and fares

- `GET /routes` supplies the route and fare data used by the search, map, and route-management screens. A route has `id`, `origin`, `destination`, `service`; its estimated fare has `id`, `routeId`, and `amount` in MWK.
- Route/fare create and edit use `{ "origin": "Blantyre", "destination": "Zomba", "service": "Minibus", "fare": 8000 }`. Origin and destination must differ; fare must be a positive whole number.
- Delete is offered for a route; the screen also removes that route's fare.
- The route search page finds direct and connecting combinations in the browser from the route list. There is no separate journey-planning screen or journey API call in the current frontend.

### Stops and map

- `GET /stops` supplies stop records with `id`, `name`, `kind`, `city`, `lat`, and `lng`.
- `kind` is `pickup`, `dropoff`, or `both`. Latitude and longitude are either both present or both `null`.
- Admin create/edit fields: `{ "name": "Blantyre Bus Depot", "kind": "pickup", "city": "Blantyre", "lat": -15.7861, "lng": 35.0058 }`.
- The map's route filter and 30 km nearby-stop calculation currently run in the browser using the routes, stops, and the visitor's selected town or geolocation. No standalone nearby-stops API is called by the current UI.

### Trips and bookings

- `GET /trips` returns the sample scheduled departures. Each trip has `id`, `route`, `pickup` and `dropoff` options, `date`, `departure`, `arrival`, `capacity`, and `fare`. The current screen filters the list by destination and date.
- `GET /trips/{tripId}/availability` supplies remaining capacity and which seat numbers are unavailable for that trip.
- Booking request:

```json
{
  "tripId": "BT-ZO-0900",
  "travelDate": "2026-11-04",
  "pickup": "Blantyre Bus Depot",
  "dropoff": "Zomba Bus Depot",
  "passengers": 1,
  "seatNumbers": [4],
  "name": "Passenger Name",
  "email": "person@example.com"
}
```

The screen allows 1–8 passengers and requires a distinct selected seat for each. The backend must use its own trip, capacity, and current booking data when reserving seats, and prevent two bookings from taking the same seat. It must not trust a fare or availability calculated by the browser.

- Booking response includes a reference, trip and passenger details, `status` (`confirmed` or `cancelled`), and `createdAt`. The UI uses it to show the ticket and generate a downloadable QR image in the browser.
- Checkout is explicitly a mock payment. No real payment provider or payment API exists in the current screens.
- The My Bookings screen searches bookings using the email entered by the passenger and allows cancellation of confirmed bookings.
- Admin booking management searches by reference, passenger name/email, or route. Staff can cancel or re-confirm a booking; re-confirmation must respect trip capacity and seat availability.
- The admin map preview also shows fixed fictional sample bookings. Those records are explicitly static and are not real bookings.

### Reports

- Report request: `{ "reporterName": "Passenger Name", "reporterEmail": "person@example.com", "type": "Route", "itemName": "Blantyre to Zomba", "description": "At least 10 characters describing the issue.", "location": "Blantyre" }`. Location is optional. `type` is `Route`, `Fare`, `Stop`, or `Other`.
- The server creates the report ID, timestamp, initial `open` status, and empty `adminNote`.
- The passenger-facing report updates are currently matched by the entered email. The admin screen can filter reports by `open`, `reviewing`, `resolved`, or `dismissed`.
- Admin report update fields are `status` and `adminNote`. The standalone admin reports page also has a delete action.

## Important notes for the backend team

- The current frontend stores these records in the browser, so the endpoint list above describes the integration needed to replace that behavior with shared backend data.
- The booking lookup and report update screens currently identify records by email alone. Do not expose private bookings or reports to anyone solely because they know an email address. Agree on a safe access/verification approach before connecting those read endpoints.
- The current frontend has no real payment, trip schedule management, email notifications, password-reset form, or standalone nearby-stop request. Those are intentionally not included as API endpoints here.
