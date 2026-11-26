import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { jsonResponse, mockFetch } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import { ProfilePage } from "./ProfilePage";

function locationResponse(url: string) {
  if (url === "/api/locations/provinces/") {
    return jsonResponse([{ id: 1, name: "Kigali City", name_rw: "Umujyi wa Kigali" }]);
  }
  if (url.startsWith("/api/locations/districts/")) {
    return jsonResponse([{ id: 10, name: "Gasabo", province_id: 1 }]);
  }
  if (url.startsWith("/api/locations/sectors/")) {
    return jsonResponse([{ id: 100, name: "Kimironko", district_id: 10 }]);
  }
  return null;
}

describe("ProfilePage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves profile details and separates verification levels", async () => {
    const user = makeAuthUser({
      is_farmer: true,
      is_buyer: false,
      email_verified_at: null,
      verification_level: "unverified",
      identity_reviewed_at: "2026-10-10T09:00:00Z",
    });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      const locations = locationResponse(url);
      if (locations) {
        return locations;
      }
      if (url === "/api/auth/me/" && init?.method === "PATCH") {
        return jsonResponse(user);
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Kugenzura umwirondoro")).toBeInTheDocument();
    expect(screen.getByText("Kwemezwa n'ikoperative")).toBeInTheDocument();
    expect(screen.getByText("Imeri ntiyemejwe")).toBeInTheDocument();

    const userEventSetup = userEvent.setup();
    const nameField = await screen.findByDisplayValue("Aline Uwase");
    await userEventSetup.clear(nameField);
    await userEventSetup.type(nameField, "Aline Uwase Mutesi");
    await userEventSetup.click(screen.getByRole("button", { name: "Bika impinduka" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/auth/me/" && init?.method === "PATCH",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
        full_name: "Aline Uwase Mutesi",
        farmer_profile: expect.any(Object),
      });
    });
  });

  it("adds the buyer role to a farmer-only account", async () => {
    const user = makeAuthUser({ is_farmer: true, is_buyer: false });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      const locations = locationResponse(url);
      if (locations) {
        return locations;
      }
      if (url === "/api/auth/roles/" && init?.method === "PATCH") {
        return jsonResponse(user);
      }
      return jsonResponse({}, 404);
    });

    renderWithAuth(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const userEventSetup = userEvent.setup();
    await userEventSetup.click(
      await screen.findByRole("button", { name: "Ongeraho uruhare rw'umuguzi" }),
    );
    await userEventSetup.type(
      screen.getByLabelText(/Izina ry'ubucuruzi/),
      "Kigali Produce Buyers",
    );
    await userEventSetup.selectOptions(screen.getByLabelText(/Ubwoko bw'umuguzi/), "company");
    await userEventSetup.click(screen.getByRole("button", { name: "Ongeraho uruhare" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/auth/roles/" && init?.method === "PATCH",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        is_buyer: true,
        is_farmer: false,
        business_name: "Kigali Produce Buyers",
        buyer_type: "company",
      });
    });
  });
});
