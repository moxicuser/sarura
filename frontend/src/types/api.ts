/** Shapes returned by the public marketplace API. */

export type VerificationLevel = "unverified" | "account" | "identity" | "cooperative";

export type Category = {
  id: number;
  name: string;
  name_rw: string;
};

export type Province = {
  id: number;
  name: string;
  name_rw: string;
};

export type District = {
  id: number;
  name: string;
  province_id: number;
};

export type Sector = {
  id: number;
  name: string;
  district_id: number;
};

export type FarmerSummary = {
  id: number;
  display_name: string;
  district_name: string | null;
  verification_level: VerificationLevel;
  verification_label: string;
  is_verified_farmer: boolean;
};

export type ProductImage = {
  id: number;
  image: string;
  alt_text: string;
  position: number;
  created_at: string;
};

export type ProductListItem = {
  id: number;
  crop_name: string;
  category: Category;
  quantity: number;
  unit: string;
  price_per_unit: string;
  price_basis: "fixed" | "negotiable";
  district_name: string;
  sector_name: string | null;
  status: "active" | "sold" | "hidden";
  primary_image: string | null;
  farmer: FarmerSummary;
  created_at: string;
};

export type ProductDetail = ProductListItem & {
  description: string;
  available_from: string | null;
  images: ProductImage[];
  location_label: string;
  updated_at: string;
};

export type PublicFarmer = FarmerSummary & {
  active_listings_count: number;
  member_since: string;
  products: ProductListItem[];
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ContactMessagePayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
};
