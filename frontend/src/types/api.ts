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

export type BuyerType = "individual" | "restaurant" | "trader" | "company";

export type FarmerProfileDetails = {
  farm_name: string;
  cooperative_name: string;
  about: string;
};

export type BuyerProfileDetails = {
  business_name: string;
  buyer_type: BuyerType;
};

/** The signed-in user's own profile (`/api/auth/me/`). Email and roles are
 * read-only in the API; profile details are nested and may be omitted when the
 * matching role is absent. */
export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  is_buyer: boolean;
  is_farmer: boolean;
  is_staff: boolean;
  verification_level: VerificationLevel;
  verification_label: string;
  email_verified_at: string | null;
  identity_reviewed_at: string | null;
  cooperative_verified_at: string | null;
  language: "rw" | "en";
  province: number | null;
  province_name: string | null;
  district: number | null;
  district_name: string | null;
  sector: number | null;
  sector_name: string | null;
  cell: string;
  location_label: string;
  date_joined: string;
  farmer_profile?: FarmerProfileDetails | null;
  buyer_profile?: BuyerProfileDetails | null;
};

export type RegisterPayload = {
  email: string;
  full_name: string;
  phone: string;
  password: string;
  password_confirm: string;
  is_buyer: boolean;
  is_farmer: boolean;
  province: number;
  district: number;
  sector?: number | null;
  cell?: string;
  language: "rw" | "en";
  farm_name?: string;
  cooperative_name?: string;
  business_name?: string;
  buyer_type?: BuyerType;
};

export type LoginPayload = {
  email: string;
  password: string;
};
