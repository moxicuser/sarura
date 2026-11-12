# SARURA frontend

React + TypeScript + Vite + Tailwind CSS. Kinyarwanda is the default language;
English is a toggle in the header.

## Local setup

```powershell
cd frontend
npm install
npm run dev
```

Run the Django backend separately on <http://127.0.0.1:8000>. The dev server
proxies `/api` and `/media` to it (see `vite.config.ts`), so the browser uses a
single origin, session cookies work, and uploaded photos load without CORS
settings.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) then build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite once (jsdom) |
| `npm run test:watch` | Re-run tests while files change |

## Layout

```
frontend/
  src/
    components/auth/     # auth shell, protected route, login gate, form alert
    components/layout/   # Header, mobile menu, language toggle, footer, page intro
    components/marketplace/  # ProductCard, ProductGrid
    components/ui/       # Button, Card, fields, feedback states, status/badge
    i18n/                # react-i18next setup and rw/en translation files
    lib/                 # API client, auth context, CSRF, formatters, helpers
    pages/               # Public, auth and account pages
    test/                # Vitest setup, API mocks and auth fixtures
    types/               # API response types
```

## Public and account pages

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Hero, search, popular categories, latest listings, how it works, calls to action |
| `/marketplace` | Marketplace | Filters live in the URL: search, category, province/district/sector, price, quantity, verified, sort, page |
| `/products/:id` | Product detail | Photos, price, quantity, location, farmer summary, login gate for first contact |
| `/farmers/:id` | Farmer profile | Name, district, verification badge, active listings; no phone or email |
| `/how-it-works` | How It Works | Three steps for farmers and three for buyers |
| `/about` | About Us | Problem, mission, how it works, story and team |
| `/contact` | Contact Us | Validated form, hidden spam trap, rate-limit and error states |
| `/privacy` | Privacy Policy | Collection, visibility, retention, choices and security |
| `/policies` | Platform Policies | Listing rules, reports, cancellations, enforcement |
| `/login` | Log in | Email + password; returns to the listing in `?next=` |
| `/register` | Register | Buyer, farmer or both, with location cascade and profile details |
| `/forgot-password` | Forgot password | Always shows the same confirmation, no account enumeration |
| `/reset-password` | Reset password | Reads `uid` + `token` from the email link |
| `/verify-email` | Verify email | Confirms the address and refreshes the signed-in profile |
| `/sell` | Sell on SARURA | Explains selling; invites a farmer account or opens the dashboard |
| `/dashboard` | Dashboard | Protected placeholder for the Step 9 buyer/farmer dashboards |
| `*` | Not found | Browse or go home |

The contact details shown on `/contact` and `/privacy` are placeholders that
need founder confirmation. See `docs/step7-public-content.md` for the `[review]`
list.

## API access

- `src/lib/api.ts` wraps `fetch`, builds query strings, parses JSON and throws a
  typed `ApiError` with the HTTP status. Writes send `X-CSRFToken`.
- `src/lib/csrf.ts` fetches `/api/auth/csrf/` and keeps the token; it is
  re-fetched after login, registration and logout because Django rotates it.
- `src/lib/useApi.ts` handles loading/error state and aborts stale requests.
- `VITE_API_BASE_URL` can override the default `/api` base.
- Image URLs come from the backend as absolute URLs, which the `/media` dev
  proxy forwards to Django.

## Accounts and authentication

- `AuthProvider` (`src/lib/auth.tsx`) asks `/api/auth/me/` once on load. Its
  status is `loading`, `authenticated` or `anonymous`, so the header and
  protected pages never flash the wrong state. A `403` from `/me/` means signed
  out (DRF uses `403` for an unauthenticated session).
- `<ProtectedRoute>` sends visitors to `/login?next=…` and keeps the path and
  query string. Only internal paths are accepted (`src/lib/redirect.ts`), so a
  crafted link cannot redirect to another site.
- On a product page, "contact the farmer" opens the login gate from guide
  section 4. After login or registration the visitor returns to the same
  listing. Signed-in visitors see a "messaging is coming" panel until the deals
  step ships.
- One account can be a buyer, a farmer or both. The register form offers the
  three choices and shows farm or business fields as needed.
- Form errors from DRF are mapped to the matching field by
  `src/lib/apiErrors.ts`; `429` responses get a dedicated rate-limit message.

## Step 8 review notes

The rates, session length and remaining copy that need a founder decision are
listed in `docs/step8-auth.md`.

## Colour palette

The palette lives in `tailwind.config.js` so every screen uses the same values
(from the Step 1 wireframes):

| Token | Value | Use |
|---|---|---|
| `sarura-green` | `#247A45` | Primary actions, links, brand |
| `sarura-green-dark` | `#185C35` | Hover states, footer background |
| `sarura-green-light` | `#E8F5E9` | Hero bands, selected navigation, badges |
| `sarura-page` | `#F4F6F4` | Page background |
| `sarura-border` | `#DCE3DD` | Card and input borders |
| `sarura-gray` | `#5F6B63` | Secondary text |
| `sarura-ink` | `#24332B` | Main text |
| `sarura-amber` | `#B45309` | Pending status |
| `sarura-red` | `#DC2626` | Errors and destructive actions |

Inter is bundled through `@fontsource/inter` (Latin subset only), so the site
does not depend on Google Fonts at runtime. Layouts are mobile-first: the header
collapses to a menu button, and every action stays reachable on a phone.

## Language

- `src/i18n/locales/rw.json` and `en.json` hold the UI wording; the draft comes
  from `docs/step1-translations.md` and still needs native review.
- Kinyarwanda is the default. The choice is stored in `localStorage` under
  `sarura.language`, and `<html lang>` is updated when it changes.
- Components read strings with `useTranslation()`; never hard-code UI text in a
  component.
- Dates, prices and counts use `Intl` formatters in `src/lib/format.ts` with a
  `rw-RW` / `en-RW` locale.

Django's `LANGUAGE_CODE` stays `en-us` because Django ships no Kinyarwanda
translations; the React app owns the interface language.

## Design rules

From `docs/step1-marketplace-rules.md`:

- **No decorative icons or emoji.** Navigation and actions use text labels. The
  only allowed symbols are the check mark inside a named verification badge and
  the `☰` menu button. SARURA should read as a serious agricultural technology
  platform.
- Statuses are always written as words, never colour alone; each tone still has
  a matching colour (green = confirmed/completed, amber = pending, red =
  cancelled/errors).
- Verification badges name the level: Account verified, Identity reviewed,
  Cooperative verified. A check mark never appears without its label.
- Forms put labels above inputs and show hints and errors next to the field,
  linked with `aria-describedby` and `aria-invalid`.
- Missing photos show the words "No photo" instead of an icon.

## Tests

`npm test` covers the header and language toggle, shared UI, the product card,
the home page, marketplace filters and pagination state, the contact form
(validation, payload, rate limit and server errors), the not-found page, and the
Step 8 auth flows: login/return path, registration (single and dual role),
forgot/reset password, email verification, protected routes, redirect safety and
the signed-in header menu. API calls are mocked with a small fetch double in
`src/test/apiMock.ts`; `src/test/auth.tsx` adds a signed-in user fixture and
wraps components in `AuthProvider`.
