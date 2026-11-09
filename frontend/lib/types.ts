export type StopKind = "pickup" | "dropoff" | "both";

export type RouteItem = {
  id: string;
  origin: string;
  destination: string;
  service: string; 
  companyName?: string;
  name?: string;
  pickupLocation?: string;
  stops?: string[];
  duration?: number | null;
  mapDistance?: number | null;
  transfers?: number;
  departureTimes?: string[];
  fareIsEstimate?: boolean;
  active?: boolean;
  featured?: boolean;
  updatedAt?: string;
};

export type FareItem = {
  id: string;
  routeId: string;
  amount: number; 
};

export type StopItem = {
  id: string;
  name: string;
  kind: StopKind;
  city: string;
  lat: number | null; 
  lng: number | null;
};

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type ReportItem = {
  id: string;
  reporterName?: string;
  reporterEmail?: string;
  type: "Route" | "Fare" | "Stop" | "Other";
  itemName: string;
  description: string;
  location: string;
  status: ReportStatus;
  adminNote: string;
  createdAt: string;
};

export type Trip = {
  id: string;
  route: string;
  pickup: string[];
  dropoff: string[];
  date: string;
  departure: string;
  arrival: string;
  capacity: number;
  fare: number;
  routeId?: string;
  departureTime?: string;
  arrivalTime?: string;
  mapDistanceMeters?: number | null;
  fareIsEstimate?: boolean;
  transportMode?: string;
  operatorName?: string;
  routeName?: string;
};

export type BookingStatus = "draft" | "reviewed" | "paid" | "confirmed" | "cancelled";

export type Booking = {
  id?: string;
  reference: string;
  tripId: string;
  route: string;
  travelDate: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  seatNumbers?: number[];
  name: string;
  email: string;
  phoneNumber?: string;
  identificationNumber?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  total?: number;
  holdExpiresAt?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  category: "booking" | "payment" | "route" | "system";
  createdAt: string;
  readAt: string | null;
  bookingReference?: string;
};
