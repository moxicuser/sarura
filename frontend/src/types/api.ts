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
  province_id: number;
  sector_name: string | null;
  status: "active" | "sold" | "hidden";
  primary_image: string | null;
  farmer: FarmerSummary;
  is_saved: boolean;
  saved_product_id: number | null;
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

/** Fields accepted by POST /products/ and PATCH /products/{id}/. */
export type ProductWritePayload = {
  category: number;
  crop_name: string;
  description?: string;
  quantity: number;
  unit: "kg";
  price_per_unit: string;
  price_basis: "fixed" | "negotiable";
  district: number;
  sector?: number | null;
  available_from?: string | null;
  status: "active" | "sold" | "hidden";
};

export type SavedProduct = {
  id: number;
  product_id: number;
  product: ProductListItem;
  created_at: string;
};

export type RoleUpdatePayload = {
  is_buyer?: boolean;
  is_farmer?: boolean;
  farm_name?: string;
  cooperative_name?: string;
  business_name?: string;
  buyer_type?: BuyerType;
};

export type ProfileUpdatePayload = {
  full_name?: string;
  phone?: string;
  province?: number | null;
  district?: number | null;
  sector?: number | null;
  cell?: string;
  language?: "rw" | "en";
  farmer_profile?: Partial<FarmerProfileDetails>;
  buyer_profile?: Partial<BuyerProfileDetails>;
};

/** Step 10: purchase requests, offers and confirmed orders. */

export type DealParty = {
  id: number;
  display_name: string;
};

export type DealProduct = {
  id: number;
  crop_name: string;
  quantity: number;
  price_per_unit: string;
  district_name: string;
  status: ProductListItem["status"];
};

export type RequestStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "superseded"
  | "cancelled"
  | "expired";

export type CurrentTerms = {
  source: "request" | "offer";
  offer_id: number | null;
  quantity: number;
  offered_price: string;
  expires_at: string | null;
};

export type CounterOffer = {
  id: number;
  quantity: number;
  offered_price: string;
  message: string;
  expires_at: string | null;
  status: OfferStatus;
  created_by: DealParty;
  created_at: string;
  decided_at: string | null;
  is_expired: boolean;
};

export type PurchaseRequest = {
  id: number;
  buyer: DealParty;
  product: DealProduct;
  quantity: number;
  offered_price: string;
  message: string;
  status: RequestStatus;
  status_changed_at: string;
  status_changed_by: DealParty | null;
  status_note: string;
  accepted_by: DealParty | null;
  order_id: number | null;
  current_terms: CurrentTerms;
  viewer_side: "buying" | "selling" | null;
  can_accept: boolean;
  can_counter: boolean;
  can_reject: boolean;
  can_cancel: boolean;
  offers: CounterOffer[];
  created_at: string;
  updated_at: string;
};

export type PurchaseRequestPayload = {
  product: number;
  quantity: number;
  offered_price: string;
  message?: string;
};

export type CounterOfferPayload = {
  quantity: number;
  offered_price: string;
  message?: string;
  expires_at?: string | null;
};

export type ActionReasonPayload = {
  message?: string;
};

export type OrderEvent = {
  id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor: DealParty | null;
  note: string;
  created_at: string;
};

export type OrderStatus =
  | "pending"
  | "negotiating"
  | "confirmed"
  | "completed"
  | "cancelled";

export type Order = {
  id: number;
  purchase_request_id: number;
  buyer: DealParty;
  farmer: DealParty;
  product: DealProduct;
  quantity: number;
  unit_price: string;
  total_price: string;
  status: OrderStatus;
  events: OrderEvent[];
  created_at: string;
  updated_at: string;
};
