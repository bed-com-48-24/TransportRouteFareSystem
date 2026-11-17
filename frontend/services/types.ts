/**
 * Shared types for the YendaRoute backend (Swagger: http://localhost:3001/docs).
 * Kept in one place so pages and components never import raw API shapes.
 */

export type BackendRole = "admin" | "driver" | "passenger";

export type BackendUser = {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  role: BackendRole;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
};

/** Envelope returned by list endpoints that paginate (e.g. /stops). */
export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type Stop = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description?: string | null;
};

export type RouteStop = {
  id?: number;
  stopId: number;
  stop?: Stop;
  order?: number;
};

export type Fare = {
  id: number;
  routeId?: number;
  originStopId: number;
  destinationStopId: number;
  amount: number;
  currency?: string;
};

export type Route = {
  id: number;
  name: string;
  originStopId?: number;
  destinationStopId?: number;
  originStop?: Stop;
  destinationStop?: Stop;
  intermediateStops?: RouteStop[];
  stops?: RouteStop[];
  /**
   * The backend's formatted route response lists stops by label, e.g.
   * `[{ "origin stop": { name: "Blantyre" } }, { "in between stop": ... }]`.
   */
  routeStops?: Array<Record<string, { name?: string }>>;
  fares?: Fare[];
  distance?: number | null;
  companyName?: string | null;
  pickupLocation?: string | null;
  featured?: boolean;
  isActive?: boolean;
  /** The formatted route response calls availability `active`. */
  active?: boolean;
};

export type Vehicle = {
  id: number;
  plateNumber: string;
  vehicleType: string;
  capacity: number;
  description?: string | null;
  driverId?: number | null;
  isActive?: boolean;
};

export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type Schedule = {
  id: number;
  routeId: number;
  vehicleId?: number;
  departureStopId?: number;
  departureTime?: string;
  /** Search results use a full ISO date-time instead of departureTime. */
  departureAt?: string;
  arrivalAt?: string | null;
  fare?: number | string | null;
  daysOfWeek?: Weekday[];
  route?: Route;
  vehicle?: Vehicle;
  departureStop?: Stop | string | null;
  /** Search results name the destination as a plain string. */
  destination?: string | null;
  routeName?: string | null;
  transportMode?: string | null;
  capacity?: number;
  availableSeats?: number;
  travelDate?: string | null;
  seatsAvailable?: number;
};

export type BookingStatus =
  | "draft"
  | "reviewed"
  | "paid"
  | "confirmed"
  | "cancelled"
  | "expired";

export type Booking = {
  reference: string;
  status: BookingStatus;
  scheduleId: number;
  travelDate: string;
  seatNumbers: number[];
  originStopId?: number;
  destinationStopId?: number;
  amount?: number;
  currency?: string;
  passengerName?: string;
  passengerEmail?: string;
  phoneNumber?: string;
  identificationNumber?: string;
  createdAt?: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  provider: string;
  description?: string;
};

export type Payment = {
  id: string;
  bookingReference?: string;
  amount?: number;
  currency?: string;
  method?: string;
  provider?: string;
  status?: string;
  transactionReference?: string;
  createdAt?: string;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
};

export type PassengerProfile = {
  name: string;
  email: string;
  phone?: string;
  identificationNumber?: string;
};

export type SeatAvailability = {
  seatNumber: number;
  available: boolean;
};

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
};
