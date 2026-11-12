import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { ProtectedRoute } from "./ProtectedRoute";
import { mockFetch } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderProtected() {
  return renderWithAuth(
    <MemoryRouter initialEntries={["/dashboard?tab=account"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<p>Account page</p>} />
        </Route>
        <Route path="/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends visitors to login and keeps the return path", async () => {
    mockFetch((url) => authResponse(url) ?? Promise.reject(new Error(url)));

    renderProtected();

    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/login?next=%2Fdashboard%3Ftab%3Daccount",
    );
  });

  it("renders the protected page for a signed-in user", async () => {
    mockFetch((url) => authResponse(url, makeAuthUser()) ?? Promise.reject(new Error(url)));

    renderProtected();

    expect(await screen.findByText("Account page")).toBeInTheDocument();
  });
});
