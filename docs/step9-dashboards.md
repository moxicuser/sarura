# Step 9: dashboards

This step adds the signed-in dashboard routes, farmer listing tools, buyer
bookmarks, profile/role management and verification display. Every route is
reachable from the dashboard navigation on a phone.

## Routes

All routes are children of `/dashboard` and protected by `<ProtectedRoute>`.
`DashboardLayout` renders the role-aware section tabs and the matching page:

| Route | Section | Behaviour |
|---|---|---|
| `/dashboard` | Overview | Account summary, separate verification levels, shortcuts |
| `/dashboard/products` | My products | Farmer-only list with status words, edit, mark sold, hide |
| `/dashboard/products/new` | Add product | Farmer-only create form with photo upload |
| `/dashboard/products/:id/edit` | Edit product | Farmer-only edit form, owner checked against the API |
| `/dashboard/requests` | Requests | Placeholder until Step 10 |
| `/dashboard/orders` | Orders | Placeholder until Step 11 |
| `/dashboard/saved` | Saved | Buyer-only bookmark list with remove |
| `/dashboard/messages` | Messages | Placeholder until Step 12 |
| `/dashboard/profile` | Profile | Edit account/farm/business details, add a role, verification detail |

A section that needs a role the account does not have shows a role notice with
an explanation instead of calling the wrong endpoint. The overview and the
navigation show all sections for a dual-role account.

## Mobile navigation choice

The Step 1 draft calls for a bottom tab bar with five tabs plus a "More" sheet
(`docs/step1-marketplace-rules.md`, §9). Step 9 instead uses a horizontally
scrollable row of text tabs beneath the dashboard header. This was chosen so
**every** section is visible and reachable on a small screen without a hidden
sheet or an extra tap, and so dual-role accounts can see buyer and farmer
sections in one place. Tabs change with the account roles, and the active tab
uses the SARURA green with a text label only.

`[review]` Confirm this deviation from the drafted bottom-tab + More pattern
before the pilot. If the founder prefers the original pattern, the routes and
pages can be kept; only `DashboardLayout` needs to change. The unread-message
badge from the draft is deliberately absent because chat arrives in Step 12.

## Dual-role landing

A buyer + farmer account lands on `/dashboard` (the overview) and sees both
sets of sections in the tab row and shortcuts. `[review]` Confirm that this is
preferred over a role picker or redirect to one role's home page.

## Placeholder sections

Requests, orders and messages are reachable now but contain a clearly labelled
"Arrives in a later step" status and an explanatory empty state. No fake data or
unimplemented action buttons are shown. These become functional in Steps 10–12.

## Verification

The overview and profile list three separate states:

1. Email address confirmation (`email_verified_at`, Account verified).
2. Identity review (`identity_reviewed_at`, staff-set).
3. Cooperative verification (`cooperative_verified_at`, staff-set).

Each row shows a named status pill and, when present, the confirmation date.
The overview still shows the single `VerifiedBadge` for the highest verification
level, but the separate rows make it clear that email confirmation is **not**
the same as identity or cooperative verification. A signed-in user whose email
is unconfirmed can resend the verification email from both the overview and the
profile; the response is intentionally non-committal.

`[review]` Confirm the Kinyarwanda wording for the three verification states and
whether farmers should be told explicitly which level unlocks which features.

## Role upgrades

`PATCH /api/auth/roles/` is additions-only. A signed-in buyer can add the farmer
role (with optional farm/cooperative name) and a signed-in farmer can add the
buyer role (with optional business name and buyer type). The endpoint creates
the matching profile row with `get_or_create`, so an existing profile is never
overwritten. It rejects `false` values for roles already on the account and
rejects requests that do not add a new role. After success the React auth
context refreshes `/api/auth/me/` so the new tabs and profile fields appear
without a logout. `[review]` Confirm that roles should not be removable by the
user; staff can still change them in Django admin if needed.

## Saved products

- `POST /api/buyer/saved-products/` accepts `{"product": id}` and is idempotent:
  the first save returns `201`, a repeat returns `200` and no duplicate row is
  created. Only active listings can be saved.
- `DELETE /api/buyer/saved-products/{id}/` removes only the buyer's own
  bookmark; another buyer's id returns `404`.
- A buyer's saved list is private. Sold listings remain visible with their
  status so the buyer can see why the listing changed. Hidden (archived)
  listings are excluded until the farmer restores them.
- Product list/detail responses include `is_saved` and `saved_product_id` for
  signed-in buyers; anonymous users and non-buyers get `false`/`null`. The
  product detail page uses these flags for Save/Saved.

`[review]` Confirm the sold/hidden behaviour: sold should stay as a visible
record, hidden should disappear from a buyer's list until restored.

## Listing tools and photos

Farmers can create and edit listings with crop, category, description, quantity
(kg), price per kg, price type, province/district/sector, optional available
date and status. Marking a listing sold sets quantity to `0`; hiding a listing
keeps the row but removes it from public results and from buyers' saved lists.
The owner is checked server-side and also checked in the edit form before it is
shown.

Photos are optional, up to five per listing, JPG/PNG/WebP only, 1 MB maximum
each. Uploads use `FormData` (`apiUpload`) with no JSON content type header; the
server checks the file header, not just the extension, and renames files before
storing them under `media/products/`. `[review]` Confirm the 1 MB per-photo
limit is realistic for phone cameras on the pilot network; the backend setting
is single-source and can be changed without a UI rewrite.

## Language and tests

All Step 9 strings are in both `frontend/src/i18n/locales/en.json` and `rw.json`
(514 keys in each, no missing keys). The Kinyarwanda copy remains a draft for
native review, as noted in `docs/step1-translations.md`.

Backend tests cover role upgrades, profile creation and idempotent/private
saved products. Frontend tests cover the role-aware tab bar, listing list and
form, saved list and removal, profile editing/role upgrade/verification rows,
and product save/unsave. The front-end timeout was raised to 15 seconds because
the larger full-suite run created enough jsdom environments to make older form
tests flaky on slower machines; this does not hide assertion failures.
