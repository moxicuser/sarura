import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { jsonResponse, makeProduct, mockFetch, paginated } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import type { SavedProduct } from "../../types/api";
import { SavedProductsPage } from "./SavedProductsPage";

describe("SavedProductsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists saved listings and removes one", async () => {
    const user = makeAuthUser({ is_buyer: true });
    const saved: SavedProduct = {
      id: 8,
      product_id: 5,
      product: makeProduct({ id: 5, crop_name: "Imiti" }),
      created_at: "2026-10-05T09:00:00Z",
    };
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/buyer/saved-products/") {
        return jsonResponse(paginated([saved]));
      }
      if (url === "/api/buyer/saved-products/8/" && init?.method === "DELETE") {
        return jsonResponse(null, 204);
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter>
        <SavedProductsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Imiti")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Kuraho" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/buyer/saved-products/8/" && init?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });

  it("shows the role notice for a farmer-only account", async () => {
    const user = makeAuthUser({ is_farmer: true, is_buyer: false });
    mockFetch((url) => authResponse(url, user) ?? jsonResponse(paginated([])));

    renderWithAuth(
      <MemoryRouter>
        <SavedProductsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Iki gice kiri muri konti yawe"),
    ).toBeInTheDocument();
  });
});
