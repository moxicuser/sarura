# SARURA Marketplace Rules — Version 1

Source: SARURA Development Guide (sections 3, 4, 7, 9, 11). This document records the
marketplace rules decided in Step 1. Every rule here is enforced **on the server**
(Django validation), never only in the browser.

Status: draft for founder review. Items marked `[review]` need a human decision
before implementation.

---

## 1. What can be listed

- **Fresh, unprocessed farm produce only.** Version 1 covers food that a farmer grows
  and sells in bulk or small quantities.
- **Categories (fixed list, from the guide):**

  | Category | Examples |
  |---|---|
  | Vegetables (Imboga) | Irish potato, tomato, onion, cabbage, carrot, green bean, eggplant, amaranth |
  | Fruits (Imbuto) | banana, avocado, mango, passion fruit, pineapple, papaya, orange |
  | Grains (cereals & pulses) | maize, beans, rice, wheat, sorghum, soybean, groundnut, peas |
  | Tubers (staple roots) | cassava, sweet potato, Irish potato, taro |
  | Other | honey, eggs, milk — unprocessed farm produce that does not fit above |

- **Not allowed in v1** `[review: confirm]`: livestock, meat, fish, seeds and
  fertilizers, processed or packaged food, used equipment, anything illegal.
  These can be added in a later phase with their own rules.
- **Crop name**: free text, max 60 characters, with an autocomplete list of ~40
  common Rwandan crops to keep spelling consistent (e.g. "Ibirayi / Irish potato").
  No contact details allowed in the crop name, description or photos.

## 2. Units, quantity and price

- **Unit: kg only** in v1 (the data model keeps a `unit` column so bunch, crate or
  litre can be added later without a rewrite).
- **Quantity**: 1 – 1,000,000 kg per listing. Must be a whole number.
- **Price**: in **RWF per kg**, from 50 to 100,000 RWF/kg. Always shown with the
  unit, e.g. `600 RWF/kg`. Never show a number without its unit.
- **Price basis**: `fixed` or `negotiable` (chosen by the farmer).
- No payment is handled by SARURA in v1. Buyers and farmers agree on cash or
  mobile money outside the platform; the product page says this clearly and shows
  safety tips near the Negotiate button.

## 3. Listing lifecycle

- Statuses: `active`, `sold`, `hidden`. Farmers archive (never hard-delete) their
  listings, so old orders keep their meaning.
- A farmer can create, edit, mark as sold, or hide **only their own** listings —
  checked on the server on every request.
- Optional `available_from` date (harvest-ready date).
- Each listing has: category, crop name, description (max 1,000 characters),
  quantity, price per kg, price basis, district, sector.
- Farmers can reduce quantity as produce sells. When quantity reaches 0, the
  farmer marks the listing `sold`.

## 4. Photos

- 0–5 photos per listing.
- JPG, PNG, WebP only; each image compressed to about 1 MB or less on upload.
- Files are renamed by the server; image headers are checked; uploads are never
  executed.
- Alt text is requested for every photo (accessibility rule); if empty, the crop
  name is used automatically.
- No contact details or watermarks in photos.

## 5. Location

- **District**: fixed list of Rwanda's 30 districts (dropdown):
  Bugesera, Burera, Gakenke, Gasabo, Gatsibo, Gicumbi, Gisagara, Huye, Kamonyi,
  Karongi, Kayonza, Kicukiro, Kirehe, Muhanga, Musanze, Ngoma, Ngororero, Nyabihu,
  Nyagatare, Nyamagabe, Nyamasheke, Nyanza, Nyarugenge, Nyaruguru, Rubavu, Ruhango,
  Rusizi, Rutsiro, Rwamagana.
- **Sector**: free text in v1 (a full sector dropdown can come later).
- Location is required on every listing.

## 6. Accounts and contact

- One account per person. Role chosen at registration: **buyer** or **farmer**
  (admin accounts are created separately, never through public registration).
- Registration requires: full name, email, phone, password (min 8 characters,
  common passwords blocked). Email is needed for password reset; phone is needed
  for Phase 2 SMS notifications.
- **Phone numbers and emails are never shown publicly.** All first contact happens
  through SARURA chat. Public farmer profiles show only: display/farm name,
  district, verification badge, active listings.
- Verification levels in v1: **Unverified** (no badge) and **Account verified**
  (email confirmed). Identity-reviewed and cooperative-verified come later.

## 7. Requests, offers and orders

- A buyer sends a purchase request: quantity (kg) and offered price (RWF/kg),
  plus an optional message.
- Request quantity cannot exceed the listing's available quantity.
- One **active** request per buyer per product (a new one can be sent after the
  old one is rejected, cancelled or expired).
- Farmer responds: **accept**, **reject**, or **counter** (new quantity and/or
  price). Every counter-offer is stored as a new row in `offers`, giving a full
  negotiation history. Counter-offers may have an optional expiry.
- An order is created only when both sides accept the same terms.
- Order statuses: `pending`, `negotiating`, `confirmed`, `completed`, `cancelled`.
  Every change stores **who** made it and **when**. Completed requires both sides
  to mark the deal done. Cancellations record who cancelled and why.
- The order page states clearly that SARURA does not handle payment or delivery,
  and offers a report/dispute button.

## 8. Chat

- One conversation per buyer + farmer + product.
- Only the two participants can read or write; checked on every request.
- Message body is plain text only (never rendered as HTML).
- Report and Block buttons in every conversation.
- A user can delete a conversation from their own view; conversations with no
  activity for **12 months** are removed (stated in the Privacy Policy). `[review: confirm 12 months]`

## 9. Language and display

- Kinyarwanda is the default language; English is a header toggle; French later.
- Prices always `RWF`, quantities always `kg`, dates as `10 Nov 2026`.
- Statuses are always shown as a **word** (and icon), never color alone.
- Lists are paginated (24 per page on the marketplace) and show loading and
  empty states, e.g. "No potatoes available in this district yet."

## 10. Trust and safety

- Report buttons on products, profiles and conversations; blocking hides a user's
  messages from view.
- Safe-trading tips near every negotiate box: meet in public places, inspect
  produce before paying, never send money to strangers.
- Admin actions (verification, hiding listings, banning users) are written to
  `audit_logs` with actor, action, target and time.
- Admins may read a conversation only after a report or security issue, and each
  access is logged.

## 11. Open questions for the founder `[review]`

1. Max listing quantity — is 1,000,000 kg too high/low for cooperatives?
2. Minimum price 50 RWF/kg — some leafy vegetables may sell for less; keep 50?
3. Should "Other" allow milk and eggs in v1, or only honey?
4. Conversation retention period — 12 months proposed.
5. Do we allow the same farmer to list the same crop twice (two lots)?
