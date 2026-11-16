export type StopKind = "pickup" | "dropoff" | "both";

export type RouteItem = {
  id: string;
  origin: string;
  destination: string;
  service: string; 
  isActive?: boolean;
  featured?: boolean;
  intermediateStopIds?: number[];
  distance?: number | null;
  pickupLocation?: string | null;
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
  type: "Route" | "Fare" | "Stop" | "Other";
  itemName: string;
  description: string;
  location: string;
  reporterName?: string;
  reporterEmail?: string;
  status: ReportStatus;
  adminNote: string;
  createdAt: string;
};

export type Trip = {
  id: string;
  routeId?: string;
  vehicleId?: string;
  route: string;
  pickup: string[];
  dropoff: string[];
  date: string;
  departure: string;
  arrival: string;
  capacity: number;
  fare: number;
  /** Live seat count returned by the passenger schedule search. */
  availableSeats?: number;
  daysOfWeek?: ("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[];
};

export type Booking = {
  reference: string;
  tripId: string;
  route: string;
  travelDate: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  seats?: number[];
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
  paymentStatus?: "paid" | "pending";
  paymentMethod?: "card" | "tnm" | "airtel" | "bank";
  paymentProvider?: string;
  paymentReference?: string;
  paymentCode?: string;
  amountPaid?: number;
  payerPhone?: string;
  payerAccountLast4?: string;
  paidAt?: string;
};
