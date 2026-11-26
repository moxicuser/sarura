import { vi } from "vitest";

import type {
  CounterOffer,
  DealParty,
  FarmerSummary,
  Order,
  OrderEvent,
  Paginated,
  ProductListItem,
  PurchaseRequest,
} from "../types/api";

/** Minimal Response-like object for the API client (which only reads these). */
export function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => data,
  } as unknown as Response;
}

/** Install a fetch double and return the mock so tests can inspect calls. */
export function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

export const farmer: FarmerSummary = {
  id: 7,
  display_name: "Aline Uwase",
  district_name: "Gasabo",
  verification_level: "identity",
  verification_label: "Identity reviewed",
  is_verified_farmer: true,
};

export function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    id: 1,
    crop_name: "Ibishyimbo",
    category: { id: 1, name: "Vegetables", name_rw: "Imboga" },
    quantity: 500,
    unit: "kg",
    price_per_unit: "650.00",
    price_basis: "negotiable",
    district_name: "Gasabo",
    province_id: 1,
    sector_name: "Kimironko",
    status: "active",
    primary_image: null,
    farmer,
    is_saved: false,
    saved_product_id: null,
    created_at: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

export function paginated<T>(results: T[], count = results.length): Paginated<T> {
  return { count, next: null, previous: null, results };
}

export const dealParty: DealParty = {
  id: 12,
  display_name: "Aline Uwase",
};

export function makeOffer(overrides: Partial<CounterOffer> = {}): CounterOffer {
  return {
    id: 30,
    quantity: 120,
    offered_price: "450.00",
    message: "",
    expires_at: null,
    status: "pending",
    created_by: { id: 7, display_name: "Umuryango Farm" },
    created_at: "2026-10-05T09:00:00Z",
    decided_at: null,
    is_expired: false,
    ...overrides,
  };
}

export function makePurchaseRequest(
  overrides: Partial<PurchaseRequest> = {},
): PurchaseRequest {
  const quantity = overrides.quantity ?? 100;
  const offered_price = overrides.offered_price ?? "400.00";
  return {
    id: 20,
    buyer: dealParty,
    product: {
      id: 5,
      crop_name: "Ibishyimbo",
      quantity: 500,
      price_per_unit: "650.00",
      district_name: "Gasabo",
      status: "active",
    },
    quantity,
    offered_price,
    message: "",
    status: "pending",
    status_changed_at: "2026-10-05T09:00:00Z",
    status_changed_by: null,
    status_note: "",
    accepted_by: null,
    order_id: null,
    current_terms: {
      source: "request",
      offer_id: null,
      quantity,
      offered_price,
      expires_at: null,
    },
    viewer_side: "buying",
    can_accept: false,
    can_counter: false,
    can_reject: false,
    can_cancel: true,
    offers: [],
    created_at: "2026-10-05T09:00:00Z",
    updated_at: "2026-10-05T09:00:00Z",
    ...overrides,
  };
}

export function makeOrderEvent(overrides: Partial<OrderEvent> = {}): OrderEvent {
  return {
    id: 40,
    from_status: null,
    to_status: "confirmed",
    actor: dealParty,
    note: "Both parties accepted the same terms.",
    created_at: "2026-10-06T09:00:00Z",
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 50,
    purchase_request_id: 20,
    buyer: dealParty,
    farmer: { id: 7, display_name: "Umuryango Farm" },
    product: {
      id: 5,
      crop_name: "Ibishyimbo",
      quantity: 400,
      price_per_unit: "650.00",
      district_name: "Gasabo",
      status: "active",
    },
    quantity: 100,
    unit_price: "400.00",
    total_price: "40000.00",
    status: "confirmed",
    events: [makeOrderEvent()],
    created_at: "2026-10-06T09:00:00Z",
    updated_at: "2026-10-06T09:00:00Z",
    ...overrides,
  };
}
