import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import i18n, { LANGUAGE_STORAGE_KEY } from "../../i18n";
import { Header } from "./Header";

function renderHeader() {
  return render(
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

  it("shows Kinyarwanda navigation by default", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Isoko" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kwinjira" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Icyongereza" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("switches to English and remembers the choice", async () => {
    const user = userEvent.setup();
    renderHeader();

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
    renderHeader();

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
    renderHeader();

    await user.click(screen.getByRole("button", { name: "Fungura menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    await user.click(within(dialog).getByRole("link", { name: "Twandikire" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
