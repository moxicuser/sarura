import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, mockFetch } from "../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../test/auth";
import { RegisterPage } from "./RegisterPage";

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderRegister(entry = "/register?role=farmer") {
  return renderWithAuth(
    <MemoryRouter initialEntries={[entry]}>
      <RegisterPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function locationHandler(url: string): Response | null {
  if (url === "/api/locations/provinces/") {
    return jsonResponse([{ id: 1, name: "City of Kigali", name_rw: "Umujyi wa Kigali" }]);
  }
  if (url.startsWith("/api/locations/districts/")) {
    return jsonResponse([{ id: 10, name: "Gasabo", province_id: 1 }]);
  }
  if (url.startsWith("/api/locations/sectors/")) {
    return jsonResponse([{ id: 100, name: "Kimironko", district_id: 10 }]);
  }
  return null;
}

async function fillAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Amazina yombi/), "Aline Uwase");
  await user.type(screen.getByLabelText(/^Imeri/), "aline@example.com");
  await user.type(screen.getByLabelText(/^Numero ya telefoni/), "0788123456");
  await user.type(screen.getByLabelText(/^Ijambo ry'ibanga/), "StrongPass123!");
  await user.type(screen.getByLabelText(/^Emeza ijambo ry'ibanga/), "StrongPass123!");
}

async function chooseLocation(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("option", { name: "Umujyi wa Kigali" });
  await user.selectOptions(screen.getByLabelText(/^Intara/), "1");

  await screen.findByRole("option", { name: "Gasabo" });
  await user.selectOptions(screen.getByLabelText(/^Akarere/), "10");

  await screen.findByRole("option", { name: "Kimironko" });
  await user.selectOptions(screen.getByLabelText(/^Umurenge/), "100");
}

describe("RegisterPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers a farmer and opens the dashboard", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      const locations = locationHandler(url);
      if (locations) {
        return locations;
      }
      if (url === "/api/auth/register/") {
        return jsonResponse(
          makeAuthUser({ is_buyer: false, is_farmer: true }),
          201,
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderRegister();

    expect(screen.getByRole("radio", { name: /Kugurisha/ })).toBeChecked();
    await fillAccount(user);
    await user.type(screen.getByLabelText(/^Izina ry'umurima/), "Uwase Farm");
    await chooseLocation(user);
    await user.click(screen.getByRole("button", { name: "Fungura konti" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard"),
    );

    const registerCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/auth/register/",
    );
    expect(registerCall).toBeDefined();
    expect(JSON.parse(String(registerCall?.[1]?.body))).toEqual({
      email: "aline@example.com",
      full_name: "Aline Uwase",
      phone: "0788123456",
      password: "StrongPass123!",
      password_confirm: "StrongPass123!",
      is_buyer: false,
      is_farmer: true,
      province: 1,
      district: 10,
      sector: 100,
      language: "rw",
      farm_name: "Uwase Farm",
      business_name: "",
    });
  });

  it("can create a dual role account", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      const locations = locationHandler(url);
      if (locations) {
        return locations;
      }
      return jsonResponse(makeAuthUser({ is_buyer: true, is_farmer: true }), 201);
    });

    renderRegister("/register");
    await user.click(screen.getByRole("radio", { name: /Byombi/ }));
    await fillAccount(user);
    await chooseLocation(user);
    await user.click(screen.getByRole("button", { name: "Fungura konti" }));

    const registerCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/auth/register/",
    );
    const payload = JSON.parse(String(registerCall?.[1]?.body));
    expect(payload.is_buyer).toBe(true);
    expect(payload.is_farmer).toBe(true);
    expect(payload.buyer_type).toBe("individual");
  });

  it("stops when the passwords do not match", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      return locationHandler(url) ?? jsonResponse({});
    });

    renderRegister();
    await fillAccount(user);
    await user.clear(screen.getByLabelText(/^Emeza ijambo ry'ibanga/));
    await user.type(screen.getByLabelText(/^Emeza ijambo ry'ibanga/), "Different123!");
    await chooseLocation(user);
    await user.click(screen.getByRole("button", { name: "Fungura konti" }));

    expect(screen.getByText("Amagambo y'ibanga ntabwo ahura.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/auth/register/")).toBe(false);
  });
});
