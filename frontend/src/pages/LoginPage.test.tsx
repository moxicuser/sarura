import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, mockFetch } from "../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../test/auth";
import { LoginPage } from "./LoginPage";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderLogin(entry = "/login?next=%2Fproducts%2F42") {
  return renderWithAuth(
    <MemoryRouter initialEntries={[entry]}>
      <LoginPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Imeri/), "aline@example.com");
  await user.type(screen.getByLabelText(/^Ijambo ry'ibanga/), "StrongPass123!");
}

describe("LoginPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs in and returns to the requested listing", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      if (url === "/api/auth/login/") {
        return jsonResponse(makeAuthUser());
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Injira" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/products/42"),
    );

    const loginCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/login/");
    expect(loginCall).toBeDefined();
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      email: "aline@example.com",
      password: "StrongPass123!",
    });
  });

  it("shows the invalid credentials message", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      return jsonResponse({ detail: ["Email or password is incorrect."] }, 400);
    });

    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Injira" }));

    expect(
      await screen.findByText("Imeri cyangwa ijambo ry'ibanga ntibyemewe."),
    ).toBeInTheDocument();
  });

  it("explains the rate limit", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      return jsonResponse({ detail: "Request was throttled." }, 429);
    });

    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Injira" }));

    expect(
      await screen.findByText(
        "Wakoze ibigeragezo byinshi mu gihe gito. Ongera ugerageze nyuma.",
      ),
    ).toBeInTheDocument();
  });

  it("validates the email before calling the API", async () => {
    const fetchMock = mockFetch((url) => authResponse(url) ?? jsonResponse({}));
    const user = userEvent.setup();

    renderLogin();
    await user.type(screen.getByLabelText(/^Imeri/), "not-an-email");
    await user.type(screen.getByLabelText(/^Ijambo ry'ibanga/), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: "Injira" }));

    expect(screen.getByText("Andika imeri yemewe.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/auth/login/")).toBe(false);
  });
});
