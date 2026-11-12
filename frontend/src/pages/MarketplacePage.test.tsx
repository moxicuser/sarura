import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, makeProduct, mockFetch, paginated } from "../test/apiMock";
import { MarketplacePage } from "./MarketplacePage";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderMarketplace() {
  return render(
    <MemoryRouter initialEntries={["/marketplace"]}>
      <MarketplacePage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("MarketplacePage", () => {
  let fetchMock: ReturnType<typeof mockFetch>;

  beforeEach(async () => {
    await i18n.changeLanguage("rw");
    fetchMock = mockFetch((url) => {
      if (url.startsWith("/api/categories/")) {
        return jsonResponse([
          { id: 1, name: "Vegetables", name_rw: "Imboga" },
          { id: 2, name: "Fruits", name_rw: "Imbuto" },
        ]);
      }
      if (url.startsWith("/api/locations/provinces/")) {
        return jsonResponse([
          { id: 1, name: "City of Kigali", name_rw: "Umujyi wa Kigali" },
        ]);
      }
      if (url.startsWith("/api/locations/districts/")) {
        return jsonResponse([{ id: 10, name: "Gasabo", province_id: 1 }]);
      }
      if (url.startsWith("/api/locations/sectors/")) {
        return jsonResponse([{ id: 100, name: "Kimironko", district_id: 10 }]);
      }
      if (url.startsWith("/api/products/")) {
        return jsonResponse(paginated([makeProduct()]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the filter options and the first page of listings", async () => {
    renderMarketplace();

    expect(await screen.findByRole("heading", { name: "Ibishyimbo" })).toBeInTheDocument();
    expect(screen.getByText("Habonetse ibicuruzwa 1")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Imboga" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Umujyi wa Kigali" })).toBeInTheDocument();
  });

  it("applies a category filter to the address", async () => {
    const user = userEvent.setup();
    renderMarketplace();

    await screen.findByRole("heading", { name: "Ibishyimbo" });
    await user.selectOptions(screen.getByLabelText("Icyiciro"), "2");
    await user.click(screen.getByRole("button", { name: "Shyiraho amashunguruzi" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/marketplace?category=2",
      );
    });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products/?category=2",
        expect.anything(),
      );
    });
  });

  it("loads districts for the chosen province and clears district/sector", async () => {
    const user = userEvent.setup();
    renderMarketplace();

    await screen.findByRole("heading", { name: "Ibishyimbo" });
    await user.selectOptions(screen.getByLabelText("Intara"), "1");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/locations/districts/?province=1",
        expect.anything(),
      );
    });

    const districtSelect = screen.getByLabelText("Akarere");
    await screen.findByRole("option", { name: "Gasabo" });
    await user.selectOptions(districtSelect, "10");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/locations/sectors/?district=10",
        expect.anything(),
      );
    });
  });

  it("shows the empty state and can clear the filters", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.startsWith("/api/products/")) {
        return jsonResponse(paginated([]));
      }
      return jsonResponse([]);
    });

    render(
      <MemoryRouter initialEntries={["/marketplace?search=maize"]}>
        <MarketplacePage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Nta bicuruzwa bihuye n'aya mashunguruzi"),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Kuraho amashunguruzi" })[0]);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/marketplace");
    });
  });
});
