# Step 10: purchase requests and negotiation

This step replaces the Step 9 placeholders for Requests and Orders. A buyer
opens a request on an active listing; the farmer accepts, rejects or counters;
an order is created only after both sides accept the same terms. Counters are
stored as immutable `Offer` rows, so the negotiation history survives.

All request and offer text is **plain text**. React renders it as text nodes
with `whitespace-pre-line`; it never injects HTML. This follows
`docs/step1-marketplace-rules.md` §7 and §8.

## API

All endpoints are mounted under `/api/` and require a session cookie. Signed-in
writes require the `X-CSRFToken` header from `GET /api/auth/csrf/`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `deals/requests/` | buyer or farmer | Paginated, private request list; see filters below |
| POST | `deals/requests/` | buyer | Open a request with `product`, `quantity`, `offered_price`, optional `message` |
| GET | `deals/requests/{id}/` | participant | Full request with terms, flags and offer history |
| POST | `deals/requests/{id}/accept/` | participant | Farmer accepts opening terms, or buyer accepts the latest counter |
| POST | `deals/requests/{id}/counter/` | farmer | Record a new counter with `quantity`, `offered_price`, optional `message`, optional future `expires_at` |
| POST | `deals/requests/{id}/reject/` | participant | Close the request; farmer rejects it or buyer rejects the outstanding counter |
| POST | `deals/requests/{id}/cancel/` | participant | Either party closes the request without an order |
| GET | `deals/orders/` | buyer or farmer | Paginated list of orders involving the signed-in user |
| GET | `deals/orders/{id}/` | participant | Order detail with its change history |

`GET /api/deals/requests/` accepts optional `product` (listing id), `status`
(`pending`, `negotiating`, `accepted`, `rejected`, `cancelled`, `expired`) and
`side` (`buying` or `selling`) filters. Invalid ids, statuses or sides return
`400`. A dual-role account sees each request once, with `viewer_side` set to
`buying` or `selling`. `GET /api/deals/orders/` accepts an optional `status`
filter.

Request detail responses include `can_accept`, `can_counter`, `can_reject` and
`can_cancel`, computed for the signed-in user. The React screens render actions
from those flags rather than repeating the rules in the UI. Party labels use a
farm or business name when present, never email or phone.

## Request rules

- A request names one listing, a quantity in kg and an offered price in
  RWF/kg. Quantity is 1 – 1,000,000 kg; price is 50 – 100,000 with two decimal
  places. The optional message is at most 1,000 characters.
- The request quantity cannot exceed the listing's available quantity. Only
  `active` listings can receive requests, and a user cannot request their own
  listing.
- There is **one active request per buyer per listing**. `pending` and
  `negotiating` are active; `accepted`, `rejected`, `cancelled` and `expired`
  are closed and free the buyer to open a new request.
- Buyer, farmer and dual-role accounts are allowed. A farmer-only account
  cannot post requests; a buyer-only account cannot create listings or
  counters. A participant is strictly the request's buyer or the listing's
  farmer; other signed-in users get `403`.

## Negotiation rules

- A new request starts `pending`. The farmer may accept, reject or counter; the
  buyer may cancel while no counter is outstanding.
- A counter creates one new `Offer` row and moves the request to `negotiating`.
  A counter must change the quantity or the price relative to the current
  terms, and its quantity cannot exceed the listing's remaining stock.
- The farmer may revise a counter before the buyer responds. The earlier
  pending offer becomes `superseded`, so only the newest pending offer is
  actionable. The full history remains visible.
- While a counter is pending, the buyer may accept or reject it. The farmer
  cannot accept their own outstanding counter and is told to wait for the
  buyer. The buyer cannot accept the opening terms after a counter exists.
- Rejecting or cancelling closes the request, marks any pending offer
  rejected/cancelled, and records the actor, time and an optional reason
  (`status_note`, at most 500 characters).
- A counter may carry a future `expires_at`. There is no background worker:
  `PurchaseRequest.expire_stale()` runs when deal pages are read or changed,
  before any serializer or `transaction.atomic()` block. A pending counter past
  its expiry is marked `expired`, the request is closed as `expired` with no
  human actor, and a fresh request is allowed. Running expiry outside the
  atomic block means a later validation error cannot roll back the expiry.

`[review]` Confirm that lazy expiry on page access is sufficient for the pilot
and that an expired counter should close the whole request rather than only
the offer.

`[review]` Confirm that the farmer may revise an unanswered counter instead of
having to wait for the buyer to reject it first.

## Order creation

Acceptance runs in one transaction with row locks on the request and the
listing:

1. The server re-checks that the request is active, the listing is still
   `active` and its remaining quantity covers the agreed terms.
2. It reduces `Product.quantity` by the order quantity and sets the listing to
   `sold` when the remainder reaches `0`.
3. It creates one `Order` linked one-to-one to the request, with the agreed
   quantity and unit price, a computed `total_price`, and status `confirmed`.
4. It writes one `OrderEvent` with `from_status = null`, `to_status =
   confirmed`, the accepting user as actor and a note explaining what was
   accepted.

The farmer accepting opening terms uses the buyer's original quantity and
price. The buyer accepting a counter uses that counter's quantity and price and
marks the offer `accepted`. A second accept cannot create a duplicate order or
oversell stock: the request is already closed and the response is `400`.

Step 10 deliberately creates an order only after mutual acceptance, so it does
not pass through order `pending` or `negotiating`. Step 12 will add the rest of
the status flow, notifications, the "SARURA does not handle payment or
delivery" notice and the report/dispute action.

`[review]` Confirm this confirmed-on-creation interpretation. Section 7 of
`docs/step1-marketplace-rules.md` lists all five order statuses without saying
when an order row first exists.

`[review]` Confirm that stock is only deducted when an order is created. An
active request or counter does not currently reserve stock, so two buyers can
have active requests against the same listing while enough stock remains.

## Frontend screens

| Route | Change in Step 10 |
|---|---|
| `/products/:id` | Signed-in buyers see a quantity/price/message request form and a link to their request; an existing active request disables duplicates |
| `/dashboard/requests` | Real list grouped as "As buyer" / "As farmer" for dual-role accounts, with status words and empty state |
| `/dashboard/requests/:id` | Opening and current terms, offer history, accept/counter/reject/cancel actions, optional expiry, reason field and order link |
| `/dashboard/orders` | Real confirmed-order list with parties, terms, total, change history and a link back to the request |

The screens are reachable from the existing role-aware dashboard tabs, so no
section is hidden on a phone. Actions show a busy state and a plain error
message from the API. Status pills always pair a word with colour: amber for
pending/negotiating, green for accepted/confirmed, red for rejected/cancelled,
gray for expired. No decorative icons or emoji were added.

## Tests and language

All Step 10 strings are in both `frontend/src/i18n/locales/en.json` and
`rw.json` (590 leaf keys each, no missing keys). The Kinyarwanda copy remains a
draft for native review.

Backend tests cover request creation and validation, private lists and filters,
role and participant permissions, counter supersession and expiry, accept from
both sides, reject/cancel reasons, order visibility, event history and stock
decrement. Frontend tests cover the product request payload, dual-role request
grouping, farmer counter, buyer acceptance, reject/cancel reasons, order list
and history, empty states, and plain-text rendering of message content.

`[review]` Confirm the Kinyarwanda wording for negotiation actions, expiry and
status notes before the pilot.
