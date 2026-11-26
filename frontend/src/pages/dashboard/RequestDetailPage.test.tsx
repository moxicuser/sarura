import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import {
  jsonResponse,
  makeOffer,
  makeOrder,
  makePurchaseRequest,
  mockFetch,
} from "../../test/apiMock";
import { authResponse, makeAuthUser, renderWithAuth } from "../../test/auth";
import type { PurchaseRequest } from "../../types/api";
import { RequestDetailPage } from "./RequestDetailPage";

function renderDetail() {
  return renderWithAuth(
    <MemoryRouter initialEntries={["/dashboard/requests/20"]}>
      <Routes>
        <Route path="/dashboard/requests/:id" element={<RequestDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequestDetailPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets the farmer record a new counter-offer in the history", async () => {
    const user = makeAuthUser({ is_farmer: true, is_buyer: false });
    let detail: PurchaseRequest = makePurchaseRequest({
      viewer_side: "selling",
      can_counter: true,
      can_reject: true,
    });
    const offer = makeOffer();
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/deals/requests/20/") {
        return jsonResponse(detail);
      }
      if (url === "/api/deals/requests/20/counter/" && init?.method === "POST") {
        detail = {
          ...detail,
          status: "negotiating",
          can_counter: false,
          can_accept: false,
          offers: [offer],
          current_terms: {
            source: "offer",
            offer_id: offer.id,
            quantity: offer.quantity,
            offered_price: offer.offered_price,
            expires_at: null,
          },
        };
        return jsonResponse(offer, 201);
      }
      return jsonResponse({}, 404);
    });

    renderDetail();

    const quantity = await screen.findByLabelText(/New quantity/);
    const price = screen.getByLabelText(/New price/);
    const message = screen.getByLabelText("Message (optional)");
    // The form is hydrated from the fetched request in an effect. Wait for
    // that first hydration so field edits are not overwritten by it.
    await waitFor(() => expect(quantity).toHaveValue(100));
    expect(price).toHaveValue(400);
    const actions = userEvent.setup();
    fireEvent.change(quantity, { target: { value: "130" } });
    fireEvent.change(price, { target: { value: "470.00" } });
    await actions.type(message, "Harvest is ready.");
    await actions.click(screen.getByRole("button", { name: "Send counter-offer" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === "/api/deals/requests/20/counter/" && init?.method === "POST",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        quantity: 130,
        offered_price: "470.00",
        message: "Harvest is ready.",
      });
    });

    expect(await screen.findByText(/Proposed by.*Umuryango Farm/)).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });

  it("lets the buyer accept the latest counter and shows the created order", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    const offer = makeOffer();
    let detail: PurchaseRequest = makePurchaseRequest({
      status: "negotiating",
      can_accept: true,
      can_reject: true,
      offers: [offer],
      current_terms: {
        source: "offer",
        offer_id: offer.id,
        quantity: offer.quantity,
        offered_price: offer.offered_price,
        expires_at: null,
      },
    });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/deals/requests/20/") {
        return jsonResponse(detail);
      }
      if (url === "/api/deals/requests/20/accept/" && init?.method === "POST") {
        detail = { ...detail, status: "accepted", can_accept: false, order_id: 50 };
        return jsonResponse(makeOrder(), 201);
      }
      return jsonResponse({}, 404);
    });

    renderDetail();

    await userEvent.setup().click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/deals/requests/20/accept/" && init?.method === "POST",
        ),
      ).toBe(true);
    });
    expect(await screen.findByText("The order has been created.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View order" })).toHaveAttribute(
      "href",
      "/dashboard/orders",
    );
  });

  it("records a reason when a party rejects a request", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    const offer = makeOffer();
    let detail: PurchaseRequest = makePurchaseRequest({
      status: "negotiating",
      can_reject: true,
      can_cancel: true,
      offers: [offer],
      current_terms: {
        source: "offer",
        offer_id: offer.id,
        quantity: offer.quantity,
        offered_price: offer.offered_price,
        expires_at: null,
      },
    });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/deals/requests/20/") {
        return jsonResponse(detail);
      }
      if (url === "/api/deals/requests/20/reject/" && init?.method === "POST") {
        detail = {
          ...detail,
          status: "rejected",
          status_note: "Price is too high.",
          can_reject: false,
          can_cancel: false,
        };
        return jsonResponse(detail);
      }
      return jsonResponse({}, 404);
    });

    renderDetail();

    const reason = await screen.findByLabelText("Why? (optional)");
    const actions = userEvent.setup();
    await actions.type(reason, "Price is too high.");
    await actions.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === "/api/deals/requests/20/reject/" && init?.method === "POST",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        message: "Price is too high.",
      });
    });
    expect(
      await screen.findByText("This request is closed; no more actions are available."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("records a reason when a party cancels a request", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    let detail: PurchaseRequest = makePurchaseRequest({ can_cancel: true });
    const fetchMock = mockFetch((url, init) => {
      const auth = authResponse(url, user);
      if (auth) {
        return auth;
      }
      if (url === "/api/deals/requests/20/") {
        return jsonResponse(detail);
      }
      if (url === "/api/deals/requests/20/cancel/" && init?.method === "POST") {
        detail = {
          ...detail,
          status: "cancelled",
          status_note: "Found another supplier.",
          can_cancel: false,
        };
        return jsonResponse(detail);
      }
      return jsonResponse({}, 404);
    });

    renderDetail();

    const reason = await screen.findByLabelText("Why? (optional)");
    const actions = userEvent.setup();
    await actions.type(reason, "Found another supplier.");
    await actions.click(screen.getByRole("button", { name: "Cancel request" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === "/api/deals/requests/20/cancel/" && init?.method === "POST",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        message: "Found another supplier.",
      });
    });
    expect(await screen.findByText("Found another supplier.")).toBeInTheDocument();
  });

  it("renders request and offer messages as plain text, never as HTML", async () => {
    const user = makeAuthUser({ is_buyer: true, is_farmer: false });
    const script = '<script>window.__saruraXss = true</script>';
    mockFetch(
      (url) =>
        authResponse(url, user) ??
        (url === "/api/deals/requests/20/"
          ? jsonResponse(
              makePurchaseRequest({
                message: script,
                offers: [makeOffer({ message: script })],
              }),
            )
          : jsonResponse({}, 404)),
    );

    const { container } = renderDetail();

    expect((await screen.findAllByText(script)).length).toBe(2);
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __saruraXss?: boolean }).__saruraXss).toBeUndefined();
  });
});
