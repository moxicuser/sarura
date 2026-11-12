import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { AuthProvider } from "../lib/auth";
import type { AuthUser } from "../types/api";
import { jsonResponse } from "./apiMock";

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 12,
    email: "aline@example.com",
    full_name: "Aline Uwase",
    phone: "+250788123456",
    is_buyer: true,
    is_farmer: false,
    is_staff: false,
    verification_level: "account",
    verification_label: "Account verified",
    email_verified_at: "2026-10-01T09:00:00Z",
    identity_reviewed_at: null,
    cooperative_verified_at: null,
    language: "rw",
    province: 1,
    province_name: "Umujyi wa Kigali",
    district: 10,
    district_name: "Gasabo",
    sector: 100,
    sector_name: "Kimironko",
    cell: "",
    location_label: "Kimironko, Gasabo",
    date_joined: "2026-10-01T09:00:00Z",
    buyer_profile: { business_name: "", buyer_type: "individual" },
    ...overrides,
  };
}

/** Render a component inside the auth provider used by the real app. */
export function renderWithAuth(ui: ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

/** Answer the two requests AuthProvider makes on mount. */
export function authResponse(url: string, user: AuthUser | null = null): Response | null {
  if (url === "/api/auth/csrf/") {
    return jsonResponse({ csrfToken: "test-token" });
  }
  if (url === "/api/auth/me/") {
    return user
      ? jsonResponse(user)
      : jsonResponse({ detail: "Authentication credentials were not provided." }, 403);
  }
  return null;
}
