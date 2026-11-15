import type { FareItem, ReportItem, RouteItem, StopItem } from "./types";

export const KEYS = {
  routes: "routewise-routes-v1",
  fares: "routewise-fares-v1",
  stops: "routewise-stops-v1",
  reports: "routewise-reports-v1",
  bookings: "routewise-bookings-v1", 
  trips: "routewise-trips-v1",
  notifications: "routewise-notifications-v1",
  savedRoutes: "routewise-saved-routes-v1",
  session: "routewise-session-v1",
} as const;

const ROUTE_ROWS: [string, string, string, string, number][] = [
  
  ["blantyre-limbe-minibus", "Blantyre", "Limbe", "Minibus", 2500],
  ["blantyre-lilongwe-coach", "Blantyre", "Lilongwe", "Intercity coach", 30000],
  ["blantyre-zomba-minibus", "Blantyre", "Zomba", "Minibus", 8000],
  ["lilongwe-blantyre-coach", "Lilongwe", "Blantyre", "Intercity coach", 30000],
  ["lilongwe-mzuzu-coach", "Lilongwe", "Mzuzu", "Intercity coach", 22000],
  ["lilongwe-salima-minibus", "Lilongwe", "Salima", "Minibus", 7000],
  ["mzuzu-lilongwe-coach", "Mzuzu", "Lilongwe", "Intercity coach", 22000],
  ["lilongwe-dedza-minibus", "Lilongwe", "Dedza", "Minibus", 6500],
  ["lilongwe-mchinji-coach", "Lilongwe", "Mchinji", "Intercity coach", 12000],
  ["lilongwe-kasungu-minibus", "Lilongwe", "Kasungu", "Minibus", 10000],
  ["mzuzu-karonga-coach", "Mzuzu", "Karonga", "Intercity coach", 10000],
  ["blantyre-mangochi-coach", "Blantyre", "Mangochi", "Intercity coach", 18000],
  ["zomba-blantyre-minibus", "Zomba", "Blantyre", "Minibus", 8000],
  ["salima-lilongwe-minibus", "Salima", "Lilongwe", "Minibus", 7000],
];

export const SEED_ROUTES: RouteItem[] = ROUTE_ROWS.map(([id, origin, destination, service]) => ({ id, origin, destination, service }));

export const SEED_FARES: FareItem[] = ROUTE_ROWS.map(([id, , , , amount]) => ({ id: `f-${id}`, routeId: id, amount }));

export const MOCK_REPORTS: ReportItem[] = [
  {
    id: "report-mock-1",
    type: "Fare",
    itemName: "Blantyre to Lilongwe",
    description: "The fare shown on the site is lower than what the conductor charged at the depot this morning.",
    location: "Blantyre Bus Depot",
    status: "open",
    adminNote: "",
    createdAt: "2026-11-07T08:15:00.000Z",
  },
  {
    id: "report-mock-2",
    type: "Stop",
    itemName: "Lilongwe City Centre Stage",
    description: "The pickup point marker is on the wrong side of the road. Passengers are waiting at the opposite stage.",
    location: "Lilongwe",
    status: "reviewing",
    adminNote: "",
    createdAt: "2026-11-06T14:40:00.000Z",
  },
  {
    id: "report-mock-3",
    type: "Route",
    itemName: "Mzuzu to Lilongwe",
    description: "The arrival estimate is too early. The coach usually reaches Lilongwe about an hour later than listed.",
    location: "Mzuzu Bus Terminal",
    status: "resolved",
    adminNote: "",
    createdAt: "2026-11-04T09:05:00.000Z",
  },
];

export const SEED_STOPS: StopItem[] = [
  { id: "s-1", name: "Blantyre Bus Depot", kind: "pickup", city: "Blantyre", lat: -15.7861, lng: 35.0058 },
  { id: "s-2", name: "Chichiri Shopping Centre", kind: "pickup", city: "Blantyre", lat: -15.7945, lng: 35.0233 },
  { id: "s-3", name: "Limbe Bus Station", kind: "both", city: "Limbe", lat: -15.8103, lng: 35.0586 },
  { id: "s-4", name: "Limbe Market", kind: "dropoff", city: "Limbe", lat: -15.8076, lng: 35.0527 },
  { id: "s-5", name: "Zomba Bus Depot", kind: "dropoff", city: "Zomba", lat: -15.3833, lng: 35.3188 },
  { id: "s-6", name: "Zomba Market", kind: "dropoff", city: "Zomba", lat: -15.3869, lng: 35.3262 },
  { id: "s-7", name: "Lilongwe Bus Terminal", kind: "dropoff", city: "Lilongwe", lat: -13.9626, lng: 33.7741 },
  { id: "s-8", name: "Mzuzu Bus Terminal (location pending)", kind: "pickup", city: "Mzuzu", lat: null, lng: null },
  { id: "s-9", name: "Lilongwe City Centre Stage", kind: "pickup", city: "Lilongwe", lat: -13.9833, lng: 33.7833 },
  { id: "s-10", name: "Zomba Town Stage", kind: "pickup", city: "Zomba", lat: -15.3850, lng: 35.3300 },
  { id: "s-11", name: "Blantyre Central Drop-off", kind: "dropoff", city: "Blantyre", lat: -15.7870, lng: 35.0040 },
  { id: "s-12", name: "Salima Bus Stage", kind: "pickup", city: "Salima", lat: -13.7804, lng: 34.4587 },
  { id: "s-13", name: "Salima Drop-off", kind: "dropoff", city: "Salima", lat: -13.7790, lng: 34.4600 },
  { id: "s-14", name: "Mzuzu Drop-off", kind: "dropoff", city: "Mzuzu", lat: -11.4656, lng: 34.0207 },
  { id: "s-15", name: "Dedza Bus Depot", kind: "both", city: "Dedza", lat: -14.3779, lng: 34.3332 },
  { id: "s-16", name: "Mchinji Bus Station", kind: "both", city: "Mchinji", lat: -13.8000, lng: 32.9000 },
  { id: "s-17", name: "Kasungu Bus Depot", kind: "pickup", city: "Kasungu", lat: -13.0333, lng: 33.4833 },
  { id: "s-18", name: "Kasungu Market Drop-off", kind: "dropoff", city: "Kasungu", lat: -13.0210, lng: 33.4800 },
  { id: "s-19", name: "Karonga Bus Station", kind: "both", city: "Karonga", lat: -9.9333, lng: 33.9333 },
  { id: "s-20", name: "Mangochi Bus Depot", kind: "pickup", city: "Mangochi", lat: -14.4781, lng: 35.2645 },
  { id: "s-21", name: "Mangochi Market Drop-off", kind: "dropoff", city: "Mangochi", lat: -14.4810, lng: 35.2660 },
];
