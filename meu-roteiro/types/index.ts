export interface Itinerary {
  id: string;
  name: string;
  country?: string;
  cities?: string[];
  duration?: number;
  start_date?: string;
  created_at: string;
}

export type ActivityType = 'restaurant' | 'place' | 'attraction';

export interface Activity {
  id: string;
  itinerary_id: string;
  title: string;
  type: ActivityType;
  day: number;
  time?: string;
  notes?: string;
  location?: string;
  culinary_type?: string;
  estimated_price?: string;
  pdf_url?: string;
  created_at: string;
}

export interface Flight {
  id: string;
  itinerary_id: string;
  airline: string;
  flight_number?: string;
  origin: string;
  destination: string;
  departure_datetime: string;
  arrival_datetime?: string;
  locator?: string;
  created_at: string;
}

export interface TripDocument {
  id: string;
  itinerary_id: string;
  name: string;
  file_url: string;
  created_at: string;
}
