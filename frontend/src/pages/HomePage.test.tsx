import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, makeProduct, mockFetch, paginated } from "../test/apiMock";
import { HomePage } from "./HomePage";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <HomePage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
    mockFetch((url) => {
      if (url === "/api/categories/") {
        return jsonResponse([{ id: 1, name: "Vegetables", name_rw: "Imboga" }]);
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

  it("shows the hero, categories and latest listings", async () => {
    renderHome();

    expect(
      await screen.findByRole("heading", {
        name: "Imboga n'imbuto nshya ziva ku bahinzi b'u Rwanda",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Imboga" })).toHaveAttribute(
      "href",
      "/marketplace?category=1",
    );
    expect(await screen.findByRole("heading", { name: "Ibishyimbo" })).toBeInTheDocument();
    expect(screen.getAllByText(/Imboga/).length).toBeGreaterThan(0);
  });

  it("sends a search to the marketplace", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.type(
      screen.getByLabelText("Shakisha ibikomoka ku buhinzi"),
      "ibishyimbo",
    );
    await user.click(screen.getByRole("button", { name: "Shakisha" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/marketplace?search=ibishyimbo",
    );
  });

  it("shows an error when the latest listings cannot be loaded", async () => {
    mockFetch((url) => {
      if (url === "/api/categories/") {
        return jsonResponse([]);
      }
      return jsonResponse({ detail: "Server error" }, 500);
    });

    renderHome();

    expect(
      await screen.findByText("Ntitwabashije kubona ibicuruzwa bishya. Ongera ugerageze."),
    ).toBeInTheDocument();
  });
});
