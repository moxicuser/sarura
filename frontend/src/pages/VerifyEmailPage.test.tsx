import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, mockFetch } from "../test/apiMock";
import { authResponse, renderWithAuth } from "../test/auth";
import { VerifyEmailPage } from "./VerifyEmailPage";

function renderVerify(entry = "/verify-email?uid=abc&token=def") {
  return renderWithAuth(
    <MemoryRouter initialEntries={[entry]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("confirms the email with the link values", async () => {
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      if (url === "/api/auth/verify-email/") {
        return jsonResponse({ detail: "Email verified." });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderVerify();

    expect(
      await screen.findByText("Imeri yawe yemejwe. Konti yawe ubu igaragara nk'iyemejwe."),
    ).toBeInTheDocument();

    const verifyCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/auth/verify-email/",
    );
    expect(JSON.parse(String(verifyCall?.[1]?.body))).toEqual({
      uid: "abc",
      token: "def",
    });
  });

  it("explains a failed link", async () => {
    mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      return jsonResponse({ detail: "This verification link is invalid." }, 400);
    });

    renderVerify();

    expect(
      await screen.findByText("Umurongo wo kwemeza ntukora cyangwa warangiye."),
    ).toBeInTheDocument();
  });

  it("does not call the API without a uid and token", async () => {
    const fetchMock = mockFetch((url) => authResponse(url) ?? jsonResponse({}));
    renderVerify("/verify-email");

    expect(
      screen.getByText(
        "Umurongo wo kwemeza ntuzuye. Fungura umurongo nk'uko waguriye mu imeri yawe.",
      ),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/auth/verify-email/"),
    ).toBe(false);
  });
});
