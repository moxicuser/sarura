import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { jsonResponse, makeProduct, mockFetch } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import type { ProductDetail } from "../../types/api";
import { ProductFormPage } from "./ProductFormPage";

describe("ProductFormPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a listing with the selected crop, price and location", async () => {
    const user = makeAuthUser({ is_farmer: true, is_buyer: false });
    const created: ProductDetail = {
      ...makeProduct({ id: 9, crop_name: "Ibishyimbo" }),
      description: "",
      available_from: null,
      images: [],
      location_label: "Kimironko, Gasabo",
      updated_at: "2026-10-01T09:00:00Z",
    };

    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/categories/") {
        return jsonResponse([{ id: 1, name: "Vegetables", name_rw: "Imboga" }]);
      }
      if (url === "/api/locations/provinces/") {
        return jsonResponse([{ id: 1, name: "Kigali City", name_rw: "Umujyi wa Kigali" }]);
      }
      if (url.startsWith("/api/locations/districts/")) {
        return jsonResponse([{ id: 10, name: "Gasabo", province_id: 1 }]);
      }
      if (url.startsWith("/api/locations/sectors/")) {
        return jsonResponse([{ id: 100, name: "Kimironko", district_id: 10 }]);
      }
      if (url === "/api/products/" && init?.method === "POST") {
        return jsonResponse(created, 201);
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter initialEntries={["/dashboard/products/new"]}>
        <Routes>
          <Route path="/dashboard/products/new" element={<ProductFormPage />} />
          <Route path="/dashboard/products" element={<p>Listings</p>} />
        </Routes>
      </MemoryRouter>,
    );

    const userEventSetup = userEvent.setup();
    await userEventSetup.type(
      await screen.findByLabelText(/Izina ry'igihingwa/),
      "Ibishyimbo",
    );
    await userEventSetup.selectOptions(await screen.findByLabelText(/Icyiciro/), "1");
    await userEventSetup.type(screen.getByLabelText(/Ingano \(kg\)/), "500");
    await userEventSetup.type(screen.getByLabelText(/Igiciro kuri kg/), "650");
    await userEventSetup.selectOptions(await screen.findByLabelText(/Intara/), "1");
    await userEventSetup.selectOptions(
      await screen.findByLabelText(/^Akarere/),
      "10",
    );

    await userEventSetup.click(
      screen.getByRole("button", { name: "Bika igicuruzwa" }),
    );

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/products/" && init?.method === "POST",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
        crop_name: "Ibishyimbo",
        category: 1,
        quantity: 500,
        price_per_unit: "650",
        district: 10,
        status: "active",
      });
    });

    expect(await screen.findByText("Listings")).toBeInTheDocument();
  });
});
