# Step 8: accounts, sessions and the login gate

This file records the Step 8 choices that still need a founder decision. Every
item is implemented and tested; the values below are sensible pilot defaults.

## Rate limits

| Endpoint | Default | Env key |
|---|---|---|
| Log in | 10 attempts per minute per IP | `LOGIN_RATE_LIMIT` |
| Register | 5 accounts per hour per IP | `REGISTER_RATE_LIMIT` |
| Password reset (request + confirm) | 10 per hour per IP | `PASSWORD_RESET_RATE_LIMIT` |

`[review]` Confirm these suit the pilot. Ten logins per minute allows for typos
but still stops password guessing; five registrations per hour is deliberately
tight to deter bots. Shared connections (a co-working space, a cybercafé) share
one IP, so a lower limit could block real farmers.

The response is a plain `429` with DRF's `detail` message. The React forms show
the translated "too many attempts" message.

## Sessions

- Sessions last 14 days (`SESSION_COOKIE_AGE`, 1209600 seconds). `[review]`
  Confirm this, and whether v1 should offer a "remember me" choice.
- Cookies are `HttpOnly` (session) and `SameSite=Lax`. The CSRF cookie is
  script-readable because the React app sends it in `X-CSRFToken`.
- Production on separate domains will need HTTPS plus `SameSite=None` for the
  session and CSRF cookies; the settings comment marks where.

## Email links

- Verification and reset links point at `FRONTEND_URL` and carry `uid` +
  `token`, so the React page calls the API.
- Tokens use Django's default generator and expire after
  `PASSWORD_RESET_TIMEOUT` (3 days), not the shorter "short time" wording on the
  pages. `[review]` Decide the real expiry and adjust the copy if it differs.
- Registration sends the verification email **after** logging the new user in.
  The token hashes `last_login`, so generating it first would make the welcome
  link invalid immediately. A regression test covers this ordering.
- The "resend verification email" API exists (`POST /api/auth/verify-email/resend/`)
  but no screen uses it yet. `[review]` Decide whether it belongs on the
  dashboard in Step 9 or immediately.

## Sign-in and return paths

- A visitor who opens a product and chooses "contact the farmer" sees a dialog
  explaining why an account is needed, with log in / register / cancel. Both
  buttons carry `?next=` so the visitor returns to that listing.
- Only internal paths starting with a single `/` are accepted; `//host` and
  external URLs fall back to `/dashboard` (`frontend/src/lib/redirect.ts`).
- Logged-in visitors on a product page see a short "messaging is coming" panel
  instead of the gate until negotiation ships in a later step.
- The header shows Dashboard and Log out when signed in, and Log in / Register
  otherwise. On phones, both appear in the ☰ menu.

## Registration

- One account can be buyer, farmer or both. The backend stores `is_buyer` and
  `is_farmer`; the extra fields are a farm name (selling) and business name plus
  buyer type (buying).
- Province and district are required; sector is optional but must belong to the
  district. Cell stays free text.
- Phone accepts `0788123456` or `+250788123456` and is stored in E.164 form.
- Registration signs the user in immediately, so the dashboard is reachable
  without a second login.

## Dashboard placeholder

`/dashboard` is intentionally a starting point: account details, verification
level, role badge and links back to the marketplace and selling page. The full
farmer and buyer dashboards (listings, requests, orders, messages) are the next
guide step. `[review]` Confirm the landing view for a dual-role account when the
real dashboards arrive — the guide leaves this open.

## Language

All Step 8 strings exist in both `frontend/src/i18n/locales/en.json` and
`rw.json`. The Kinyarwanda wording is still a draft and needs native review,
following `docs/step1-translations.md`.
