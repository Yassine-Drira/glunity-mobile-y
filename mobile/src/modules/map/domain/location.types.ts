export type LocationCategory =
  | 'restaurant'
  | 'bakery'
  | 'grocery'
  | 'pharmacy'
  | 'cafe'
  | 'other';

export interface LocationImage {
  url: string | null;
  publicId: string | null;
}

export interface LocationRating {
  average: number;
  count: number;
}

export interface MapLocation {
  id: string;
  name: string;
  description: string;
  category: LocationCategory;
  glutenFree: boolean;
  certified: boolean;
  contaminationWarning: boolean;
  address: string;
  city: string;
  country: string;
  phone: string;
  priceRange: '' | '$' | '$$' | '$$$' | '$$$$';
  lng: number;
  lat: number;
  images: LocationImage[];
  rating: LocationRating;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationFilters {
  category?: LocationCategory | 'all';
  glutenFree?: boolean;
  certified?: boolean;
  search?: string;
}
