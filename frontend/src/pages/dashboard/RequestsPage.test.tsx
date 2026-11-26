import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import {
  jsonResponse,
  makePurchaseRequest,
  mockFetch,
  paginated,
} from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import { RequestsPage } from "./RequestsPage";

describe("RequestsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups requests by side for a dual-role account", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: true });
    const buying = makePurchaseRequest({
      id: 20,
      viewer_side: "buying",
      product: { ...makePurchaseRequest().product, crop_name: "Beans" },
    });
    const selling = makePurchaseRequest({
      id: 21,
      viewer_side: "selling",
      can_accept: true,
      can_counter: true,
      product: { ...makePurchaseRequest().product, crop_name: "Maize" },
    });
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/deals/requests/") {
        return jsonResponse(paginated([buying, selling]));
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Beans")).toBeInTheDocument();
    expect(screen.getByText("Maize")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "As buyer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "As farmer" })).toBeInTheDocument();

    const requestCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/deals/requests/",
    );
    expect(requestCall).toBeDefined();
  });

  it("shows an empty state when there are no requests", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    mockFetch(
      (url) =>
        authResponse(url, user) ??
        (url === "/api/deals/requests/"
          ? jsonResponse(paginated([]))
          : jsonResponse({}, 404)),
    );

    renderWithAuth(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No purchase requests yet")).toBeInTheDocument();
  });
});
