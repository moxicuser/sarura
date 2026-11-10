# SARURA Marketplace Rules — Version 1

Source: SARURA Development Guide (sections 3, 4, 7, 9, 11). This document records the
marketplace rules decided in Step 1. Every rule here is enforced **on the server**
(Django validation), never only in the browser.

Status: **rev. 2 after founder review (approved direction)**. Items marked `[review]`
still need a human decision before implementation.

## 0. Changes from the founder review (2026-11-10)

1. **Languages**: Kinyarwanda is the default site language; English is a header
   toggle. French later.
2. **Mobile navigation**: dashboard sections must all be reachable on small
   screens — 5 bottom tabs plus a "More" sheet holding the remaining sections
   (see §9 for the exact tab lists per role).
3. **Admin**: SARURA gets its own admin dashboard UI (verification queue, reports,
   moderation, audit log) built in React, in addition to Django's built-in admin
   which stays for deep/back-office tasks on a non-obvious URL. Admin screens are
   wireframed in `docs/step1-wireframes.html` §4.
4. **Farmer verification**: levels are shown as distinct, named states —
   *Unverified* (no badge), *Account verified* (email confirmed),
   *Identity reviewed* (admin checked an ID; reviewer recorded),
   *Cooperative verified* (a cooperative confirmed the farmer, shown with
   permission). v1 ships the first two; the data model carries all levels from
   day one. Badges always use the level name, never just an icon.
5. **Product locations**: full Rwanda structure — province → district → sector,
   chosen from cascading dropdowns seeded from `docs/data/rwanda-sectors.json`
   (5 provinces, 30 districts, 415 sectors); cell (akagali) is optional free
   text in v1.
6. **Registration**: one account may act as **both farmer and buyer**
   (role flags `is_buyer` / `is_farmer` on the user, not a single-choice role
   column). At registration the person picks buyer, farmer, or both; the
   dashboard shows a "selling / buying" switcher for dual accounts. This is
   decided now because it shapes the Step 3 user model.

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

- Location follows Rwanda's real administrative structure, stored as
  **province + district + sector (+ optional cell)** and chosen with cascading
  dropdowns: pick province → district list filters → sector list filters.
- The dropdown data comes from `docs/data/rwanda-sectors.json`
  (5 provinces, 30 districts, 415 sectors, cross-checked Wikipedia/MINALOC and
  Wikidata). The backend stores districts and sectors as reference tables
  (not free text) and the seed management command loads this file in Step 4.
- **Province** (intara): Eastern, City of Kigali, Northern, Southern, Western.
- **District** (akarere): the 30 districts.
- **Sector** (umurenge): 415 sectors. Because sector names repeat across
  districts (e.g. Karama, Ngoma, Remera), a sector is always stored/joined with
  its district — never a bare sector name.
- **Cell** (akagali): optional free text in v1 (2,148 cells exist — too many for
  dropdowns).
- Location (district at minimum) is required on every listing.

## 6. Accounts and contact

- One account per person. An account can be **buyer**, **farmer**, or **both**
  (role flags `is_buyer` / `is_farmer`; the register page offers "I am a buyer",
  "I am a farmer", "I am both"). Dual accounts get a selling/buying view
  switcher in the dashboard. Admin accounts are created separately, never
  through public registration.
- Registration requires: full name, email, phone, password (min 8 characters,
  common passwords blocked). Email is needed for password reset; phone is needed
  for Phase 2 SMS notifications.
- **Phone numbers and emails are never shown publicly.** All first contact happens
  through SARURA chat. Public farmer profiles show only: display/farm name,
  district, verification badge, active listings.
- Verification levels (distinct named states, never a single vague badge):
  **Unverified** (no badge), **Account verified** (email confirmed — v1),
  **Identity reviewed** (admin checked an ID, reviewer recorded — later),
  **Cooperative verified** (a cooperative confirmed the farmer, shown only with
  permission — later). The user model carries the level from day one; admin UI
  (Step 13) provides the review queue. SMS codes come later (they cost money).

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

- **Kinyarwanda is the default language**; English is available from the header
  toggle; French later. Language preference is stored on the user profile.
- Prices always `RWF`, quantities always `kg`, dates as `10 Nov 2026`.
- Statuses are always shown as a **word** (and icon), never color alone.
- Lists are paginated (24 per page on the marketplace) and show loading and
  empty states, e.g. "No potatoes available in this district yet."
- Mobile navigation pattern: dashboards use a bottom tab bar with **5 tabs**
  plus a "More" sheet, so all dashboard sections are reachable on a small
  screen:
  - **Buyer tabs**: Home, Requests, Orders, Messages, More. More sheet holds
    Saved products, Profile, Language, Help & Contact, Log out.
  - **Farmer tabs**: Home, My products, Requests, Orders, More. More sheet
    holds Messages (unread badge — also linked from Home's unread stat),
    Add product, Saved products, Profile, Language, Log out.
- Public pages use a hamburger menu on phones.

## 10. Trust and safety

- Report buttons on products, profiles and conversations; blocking hides a user's
  messages from view.
- Safe-trading tips near every negotiate box: meet in public places, inspect
  produce before paying, never send money to strangers.
- Admin actions (verification, hiding listings, banning users) are written to
  `audit_logs` with actor, action, target and time.
- Admins may read a conversation only after a report or security issue, and each
  access is logged.

## 10b. Admin tools (Step 13, per founder review)

- SARURA ships its own **admin dashboard UI** (React, staff-only route) with:
  overview statistics, farmer verification queue, listing moderation
  (hide/restore), user management (ban/suspend), reports handling, contact
  messages inbox, and an audit-log viewer.
- Django's built-in admin (customized, non-obvious URL) remains for deep
  back-office work (data fixes, bulk imports). Both are protected by staff
  status + 2FA and every sensitive action is logged.

## 11. Open questions for the founder `[review]`

1. Max listing quantity — is 1,000,000 kg too high/low for cooperatives?
2. Minimum price 50 RWF/kg — some leafy vegetables may sell for less; keep 50?
3. Should "Other" allow milk and eggs in v1, or only honey?
4. Conversation retention period — 12 months proposed.
5. Do we allow the same farmer to list the same crop twice (two lots)?
6. Confirm the 415 vs official 416 sector count with the NISR list before launch
   (one sector may be missing or newly created; admins can add it).
7. For dual-role accounts (farmer + buyer): default landing view after login —
   selling view for farmers, buying view for buyers, sellers' choice for both?
