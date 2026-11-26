import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { jsonResponse, mockFetch } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import { DashboardLayout } from "./DashboardLayout";

describe("DashboardLayout", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderDashboard(user: ReturnType<typeof makeAuthUser>) {
    mockFetch((url) => authResponse(url, user) ?? jsonResponse({}, 404));
    return renderWithAuth(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<p>Overview screen</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows every section for a dual-role account", async () => {
    renderDashboard(
      makeAuthUser({ is_farmer: true, is_buyer: true }),
    );

    expect(await screen.findByText("Overview screen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ibicuruzwa byanjye" })).toHaveAttribute(
      "href",
      "/dashboard/products",
    );
    expect(screen.getByRole("link", { name: "Byabitse" })).toHaveAttribute(
      "href",
      "/dashboard/saved",
    );
    expect(screen.getByRole("link", { name: "Ibisabwa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ibyaguzwe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ubutumwa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Umwirondoro" })).toBeInTheDocument();
    expect(screen.queryByText(/Umuhinzi n'umuguzi/)).toBeInTheDocument();
  });

  it("hides farmer and buyer sections the account does not have", async () => {
    renderDashboard(makeAuthUser({ is_farmer: false, is_buyer: true }));

    expect(await screen.findByText("Overview screen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Byabitse" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ibicuruzwa byanjye" })).toBeNull();
  });
});
