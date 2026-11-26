import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import {
  jsonResponse,
  makeProduct,
  makePurchaseRequest,
  mockFetch,
  paginated,
} from "../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../test/auth";
import type { ProductDetail, PurchaseRequest, SavedProduct } from "../types/api";
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

  it("lets a buyer send a purchase request with the chosen terms", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    const product: ProductDetail = {
      ...makeProduct({ id: 5, crop_name: "Imiti" }),
      description: "Ibiti bishya.",
      available_from: null,
      images: [],
      location_label: "Gasabo",
      updated_at: "2026-10-01T09:00:00Z",
    };
    const created: PurchaseRequest = makePurchaseRequest({ id: 21, buyer: { id: user.id, display_name: user.full_name } });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/products/5/") {
        return jsonResponse(product);
      }
      if (url === "/api/deals/requests/?product=5") {
        return jsonResponse(paginated([]));
      }
      if (url === "/api/deals/requests/" && init?.method === "POST") {
        return jsonResponse(created, 201);
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

    const quantity = await screen.findByLabelText(/Ingano ushaka/);
    const price = screen.getByLabelText(/Igiciro utanga/);
    const message = screen.getByLabelText("Ubutumwa (bidakenewe)");
    await userEvent.setup().clear(quantity);
    await userEvent.type(quantity, "120");
    await userEvent.clear(price);
    await userEvent.type(price, "500.00");
    await userEvent.type(message, "Ndabona ibicuruzwa.");
    await userEvent.click(
      screen.getByRole("button", { name: "Ohereza ikibazo cy'ugucuruza" }),
    );

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/deals/requests/" && init?.method === "POST",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        product: 5,
        quantity: 120,
        offered_price: "500.00",
        message: "Ndabona ibicuruzwa.",
      });
    });

    expect(
      await screen.findByText("Icyifuzo cyoherejwe. Gikurikirane muri 'Ibisaba byanjye'."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reba icyifuzo cyanjye" })).toHaveAttribute(
      "href",
      "/dashboard/requests/21",
    );
  });
});
