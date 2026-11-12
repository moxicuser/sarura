import { vi } from "vitest";

import type { FarmerSummary, Paginated, ProductListItem } from "../types/api";

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
    sector_name: "Kimironko",
    status: "active",
    primary_image: null,
    farmer,
    created_at: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

export function paginated<T>(results: T[], count = results.length): Paginated<T> {
  return { count, next: null, previous: null, results };
}
