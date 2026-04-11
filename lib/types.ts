export type ProfileRole = 'admin' | 'staff' | 'readonly';

export interface Profile {
  id: string;
  role: ProfileRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  dealership_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  about_text: string | null;
  hours_json: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface Car {
  id: string;
  slug: string;
  title: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  price: number;
  body_type: string | null;
  transmission: string | null;
  fuel_type: string | null;
  status: 'draft' | 'published' | 'sold';
  hero_image_url: string | null;
  gallery: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  car_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  type: 'request_info' | 'test_drive' | 'general';
  message: string | null;
  preferred_datetime: string | null;
  status: 'new' | 'in_progress' | 'closed';
  source_page: string | null;
  created_at: string;
  updated_at: string;
}

