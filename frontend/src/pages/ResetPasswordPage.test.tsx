import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, mockFetch } from "../test/apiMock";
import { authResponse, renderWithAuth } from "../test/auth";
import { ResetPasswordPage } from "./ResetPasswordPage";

function renderReset(entry = "/reset-password?uid=abc&token=def") {
  return renderWithAuth(
    <MemoryRouter initialEntries={[entry]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

async function fillPasswords(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Ijambo ry'ibanga rishya/), "NewStrong123!");
  await user.type(screen.getByLabelText(/^Emeza ijambo ry'ibanga/), "NewStrong123!");
}

describe("ResetPasswordPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the uid, token and new password", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      if (url === "/api/auth/password-reset/confirm/") {
        return jsonResponse({ detail: "Password updated." });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderReset();
    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: "Bika ijambo ry'ibanga" }));

    expect(
      await screen.findByText("Ijambo ry'ibanga ryahinduwe. Ubu ushobora kwinjira."),
    ).toBeInTheDocument();

    const confirmCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/auth/password-reset/confirm/",
    );
    expect(JSON.parse(String(confirmCall?.[1]?.body))).toEqual({
      uid: "abc",
      token: "def",
      new_password: "NewStrong123!",
      new_password_confirm: "NewStrong123!",
    });
  });

  it("reports an invalid or expired link", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      const auth = authResponse(url);
      if (auth) {
        return auth;
      }
      return jsonResponse({ detail: "This reset link is invalid or has expired." }, 400);
    });

    renderReset();
    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: "Bika ijambo ry'ibanga" }));

    expect(
      await screen.findByText(
        "Umurongo wo guhindura ijambo ry'ibanga ntukora cyangwa warangiye. Saba undi.",
      ),
    ).toBeInTheDocument();
  });

  it("does not submit without a uid and token", async () => {
    const fetchMock = mockFetch((url) => authResponse(url) ?? jsonResponse({}));
    renderReset("/reset-password");

    expect(
      screen.getByText(
        "Umurongo wo guhindura ijambo ry'ibanga ntukora cyangwa warangiye. Saba undi.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bika ijambo ry'ibanga" }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/auth/password-reset/confirm/"),
    ).toBe(false);
  });
});
