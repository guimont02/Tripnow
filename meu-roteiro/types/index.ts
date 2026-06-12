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
