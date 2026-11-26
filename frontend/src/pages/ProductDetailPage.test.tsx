import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, makeProduct, mockFetch } from "../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../test/auth";
import type { ProductDetail, SavedProduct } from "../types/api";
import { ProductDetailPage } from "./ProductDetailPage";

describe("ProductDetailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets a buyer save and unsave a listing", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    const product: ProductDetail = {
      ...makeProduct({ id: 5, crop_name: "Imiti" }),
      description: "Ibiti bishya.",
      available_from: null,
      images: [],
      location_label: "Gasabo",
      updated_at: "2026-10-01T09:00:00Z",
    };
    const saved: SavedProduct = {
      id: 3,
      product_id: 5,
      product,
      created_at: "2026-10-05T09:00:00Z",
    };

    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/products/5/") {
        return jsonResponse({
          ...product,
          is_saved: init?.method === "DELETE" ? false : product.is_saved,
        });
      }
      if (url === "/api/buyer/saved-products/" && init?.method === "POST") {
        return jsonResponse(saved, 201);
      }
      if (url === "/api/buyer/saved-products/3/" && init?.method === "DELETE") {
        return jsonResponse(null, 204);
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter initialEntries={["/products/5"]}>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const saveButton = await screen.findByRole("button", { name: "Bika igicuruzwa" });
    await userEvent.setup().click(saveButton);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/buyer/saved-products/" && init?.method === "POST",
        ),
      ).toBe(true);
    });

    expect(await screen.findByRole("button", { name: "Wabitswe" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Wabitswe" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/buyer/saved-products/3/" && init?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });
});
