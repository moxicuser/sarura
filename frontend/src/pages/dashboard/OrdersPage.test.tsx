import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { jsonResponse, makeOrder, mockFetch, paginated } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import { OrdersPage } from "./OrdersPage";

describe("OrdersPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists a confirmed order with its change history", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    const order = makeOrder();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/deals/orders/") {
        return jsonResponse(paginated([order]));
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ibishyimbo")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    expect(screen.getByText("100 kg")).toBeInTheDocument();
    expect(screen.getByText(/Buyer:\s*Aline Uwase/)).toBeInTheDocument();
    expect(screen.getByText(/Farmer:\s*Umuryango Farm/)).toBeInTheDocument();
    expect(screen.getByText("Change history")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View request" })).toHaveAttribute(
      "href",
      "/dashboard/requests/20",
    );
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/deals/orders/"),
    ).toBe(true);
  });

  it("shows an empty state when there are no orders", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    mockFetch(
      (url) =>
        authResponse(url, user) ??
        (url === "/api/deals/orders/"
          ? jsonResponse(paginated([]))
          : jsonResponse({}, 404)),
    );

    renderWithAuth(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No orders yet")).toBeInTheDocument();
  });
});
