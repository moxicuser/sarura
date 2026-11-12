import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, mockFetch } from "../test/apiMock";
import { authResponse, renderWithAuth } from "../test/auth";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

function renderForgot() {
  return renderWithAuth(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("always shows the same confirmation, whether or not the email exists", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      if (url === "/api/auth/password-reset/") {
        return jsonResponse({ detail: "If an account exists..." });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderForgot();
    await user.type(screen.getByLabelText(/^Imeri/), "nobody@example.com");
    await user.click(screen.getByRole("button", { name: "Ohereza umurongo" }));

    expect(
      await screen.findByText(/Niba imeri yawe ifitwe na konti ya SARURA/),
    ).toBeInTheDocument();

    const resetCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/auth/password-reset/",
    );
    expect(JSON.parse(String(resetCall?.[1]?.body))).toEqual({
      email: "nobody@example.com",
    });
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

    renderForgot();
    await user.type(screen.getByLabelText(/^Imeri/), "aline@example.com");
    await user.click(screen.getByRole("button", { name: "Ohereza umurongo" }));

    expect(
      await screen.findByText(
        "Wakoze ibigeragezo byinshi mu gihe gito. Ongera ugerageze nyuma.",
      ),
    ).toBeInTheDocument();
  });
});
