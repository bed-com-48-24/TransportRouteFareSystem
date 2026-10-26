export type StopKind = "pickup" | "dropoff";

export type RouteItem = {
  id: string;
  origin: string;
  destination: string;
  service: string; 
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
};

export type Booking = {
  reference: string;
  tripId: string;
  route: string;
  travelDate: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
};
