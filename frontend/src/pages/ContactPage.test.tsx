import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { jsonResponse, mockFetch } from "../test/apiMock";
import { ContactPage } from "./ContactPage";

function renderContact() {
  return render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Amazina yombi/), "Aline Uwase");
  await user.type(screen.getByLabelText(/Imeri/), "aline@example.com");
  await user.type(screen.getByLabelText(/Impamvu/), "Ikibazo ku bicuruzwa");
  await user.type(
    screen.getByLabelText(/Ubutumwa/),
    "Mfite ikibazo ku bicuruzwa byanyu.",
  );
}

describe("ContactPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("rw");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates required fields before calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(() => jsonResponse({}, 201));
    renderContact();

    await user.click(screen.getByRole("button", { name: "Ohereza ubutumwa" }));

    expect(screen.getAllByText("Iki cyerekezo nticyuzuye").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the message and shows the success notice", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(() => jsonResponse({ detail: "received" }, 201));
    renderContact();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Ohereza ubutumwa" }));

    expect(
      await screen.findByText(
        "Murakoze. Ubutumwa bwawe bwakiriwe. Tuzagusubiza vuba.",
      ),
    ).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact/");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Aline Uwase",
      email: "aline@example.com",
      subject: "Ikibazo ku bicuruzwa",
      message: "Mfite ikibazo ku bicuruzwa byanyu.",
      website: "",
    });
  });

  it("explains the rate limit when the API answers 429", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse({ detail: "Too many requests" }, 429));
    renderContact();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Ohereza ubutumwa" }));

    expect(
      await screen.findByText(
        "Wakoze ubutumwa bwinshi mu gihe gito. Ongera ugerageze nyuma.",
      ),
    ).toBeInTheDocument();
  });

  it("marks the field the server rejects", async () => {
    const user = userEvent.setup();
    mockFetch(() =>
      jsonResponse({ email: ["Enter a valid email address."] }, 400),
    );
    renderContact();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Ohereza ubutumwa" }));

    expect(await screen.findByText("Reba iki cyerekezo.")).toBeInTheDocument();
  });

  it("includes the hidden spam trap field so bots can be dropped", () => {
    renderContact();

    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
  });
});
