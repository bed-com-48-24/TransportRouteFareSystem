export type Coordinates = { lat: number; lng: number };

export const DISTRICT_COORDINATES: Record<string, Coordinates> = {
  Balaka: { lat: -14.9833, lng: 34.9500 },
  Blantyre: { lat: -15.7861, lng: 35.0058 },
  Chikwawa: { lat: -16.0333, lng: 34.8000 },
  Chiradzulu: { lat: -15.7000, lng: 35.1500 },
  Chitipa: { lat: -9.7000, lng: 33.2700 },
  Dedza: { lat: -14.3779, lng: 34.3332 },
  Dowa: { lat: -13.6500, lng: 33.9333 },
  Karonga: { lat: -9.9333, lng: 33.9333 },
  Kasungu: { lat: -13.0333, lng: 33.4833 },
  Likoma: { lat: -12.0667, lng: 34.7333 },
  Lilongwe: { lat: -13.9626, lng: 33.7741 },
  Machinga: { lat: -14.9667, lng: 35.5167 },
  Mangochi: { lat: -14.4781, lng: 35.2645 },
  Mchinji: { lat: -13.8000, lng: 32.9000 },
  Mulanje: { lat: -16.0333, lng: 35.5000 },
  Mwanza: { lat: -15.6000, lng: 34.5167 },
  Mzimba: { lat: -11.9000, lng: 33.6000 },
  "Nkhata Bay": { lat: -11.6000, lng: 34.3000 },
  Nkhotakota: { lat: -12.9167, lng: 34.3000 },
  Nsanje: { lat: -16.9167, lng: 35.2667 },
  Ntcheu: { lat: -14.8167, lng: 34.6333 },
  Ntchisi: { lat: -13.3667, lng: 33.9167 },
  Phalombe: { lat: -15.8000, lng: 35.6500 },
  Rumphi: { lat: -11.0167, lng: 33.8667 },
  Salima: { lat: -13.7804, lng: 34.4587 },
  Thyolo: { lat: -16.0667, lng: 35.1333 },
  Zomba: { lat: -15.3833, lng: 35.3188 },
  Neno: { lat: -15.4000, lng: 34.6500 },
};

export const MALAWI_DISTRICTS = Object.keys(DISTRICT_COORDINATES);
export const MALAWI_LOCATIONS = [...MALAWI_DISTRICTS, "Limbe", "Mzuzu"];
