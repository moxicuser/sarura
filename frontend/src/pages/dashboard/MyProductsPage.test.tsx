import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { jsonResponse, makeProduct, mockFetch, paginated } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import { MyProductsPage } from "./MyProductsPage";

describe("MyProductsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the farmer's listings and marks one as sold", async () => {
    const user = makeAuthUser({ is_farmer: true, is_buyer: false });
    const product = makeProduct({ id: 4, crop_name: "Ibishyimbo" });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/products/mine/") {
        return jsonResponse(paginated([product]));
      }
      if (url === "/api/products/4/" && init?.method === "PATCH") {
        return jsonResponse(product);
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter>
        <MyProductsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ibishyimbo")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Erekana ko byacurujwe" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/products/4/" && init?.method === "PATCH",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ status: "sold", quantity: 0 });
    });
  });

  it("shows the role notice for a buyer-only account", async () => {
    const user = makeAuthUser({ is_farmer: false, is_buyer: true });
    mockFetch((url) => authResponse(url, user) ?? jsonResponse(paginated([])));

    renderWithAuth(
      <MemoryRouter>
        <MyProductsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Iki gice kiri muri konti yawe"),
    ).toBeInTheDocument();
  });
});
