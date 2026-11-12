import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n, { LANGUAGE_STORAGE_KEY } from "../../i18n";
import { jsonResponse, mockFetch } from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import { Header } from "./Header";

function renderHeader() {
  return renderWithAuth(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe("Header", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Kinyarwanda navigation by default", async () => {
    mockFetch((url) => authResponse(url) ?? jsonResponse({}, 404));
    renderHeader();

    expect(await screen.findByRole("link", { name: "Kwinjira" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Isoko" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Icyongereza" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("switches to English and remembers the choice", async () => {
    const user = userEvent.setup();
    mockFetch((url) => authResponse(url) ?? jsonResponse({}, 404));
    renderHeader();

    await screen.findByRole("link", { name: "Kwinjira" });
    await user.click(screen.getByRole("button", { name: "Icyongereza" }));

    expect(await screen.findByRole("link", { name: "Marketplace" })).toBeInTheDocument();
    expect(i18n.language).toBe("en");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens and closes the mobile menu", async () => {
    const user = userEvent.setup();
    mockFetch((url) => authResponse(url) ?? jsonResponse({}, 404));
    renderHeader();

    await screen.findByRole("link", { name: "Kwinjira" });
    await user.click(screen.getByRole("button", { name: "Fungura menu" }));

    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Ahabanza" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Kwiyandikisha" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Funga menu" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the mobile menu when a navigation link is used", async () => {
    const user = userEvent.setup();
    mockFetch((url) => authResponse(url) ?? jsonResponse({}, 404));
    renderHeader();

    await screen.findByRole("link", { name: "Kwinjira" });
    await user.click(screen.getByRole("button", { name: "Fungura menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    await user.click(within(dialog).getByRole("link", { name: "Twandikire" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the dashboard and logs out a signed-in user", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, makeAuthUser());
      if (auth) {
        return auth;
      }
      if (url === "/api/auth/logout/" && init?.method === "POST") {
        return jsonResponse(null, 204);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    renderHeader();

    expect(await screen.findByRole("link", { name: "Ikibaho" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sohoka" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Kwinjira" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sohoka" }));

    expect(await screen.findByRole("link", { name: "Kwinjira" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
