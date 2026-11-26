# SARURA backend

Django + Django REST Framework + PostgreSQL, following section 6 of the
development guide.

## Layout

```
backend/
  config/          # Django settings and root URLs
  core/            # contact messages, static page content, health check
  accounts/        # users, roles, profiles, verification
  marketplace/     # categories, products, images, search, saved products
  deals/           # purchase requests, negotiation, orders
  messaging/       # conversations and messages
  notifications/
  manage.py
  requirements.txt
```

## Local setup (Windows PowerShell)

```powershell
# 1. Virtual environment and dependencies
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 2. Environment variables
Copy-Item .env.example .env
# then edit .env: set DJANGO_SECRET_KEY and the PostgreSQL password

# 3. Database (PostgreSQL must be running; role/database named `sarura`)
#    The dev role also needs CREATEDB so Django can build its test database
#    (run once as the postgres superuser):
#      psql -U postgres -c "ALTER ROLE sarura CREATEDB;"
.\.venv\Scripts\python.exe manage.py migrate

# 4. Development server
.\.venv\Scripts\python.exe manage.py runserver
```

Run the tests with `.\.venv\Scripts\python.exe manage.py test`.

Check it works: <http://127.0.0.1:8000/api/health/> should return
`{"status": "ok", "database": "ok"}`.

## Locations

Rwanda's official province → district → sector data lives in
`docs/data/rwanda-sectors.json` (5 provinces, 30 districts, 415 sectors). Load
or refresh it with:

```powershell
.\.venv\Scripts\python.exe manage.py seed_locations
```

The command is idempotent, so it is safe to run after every deploy. Cells are
free text because the sector is the marketplace's working area.

## Accounts API (`/api/auth/`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `csrf/` | public | Get a CSRF token for the React app |
| POST | `register/` | public | Create account (buyer, farmer, or both), log in, send verification email |
| POST | `login/` | public | Email + password login (session cookie) |
| POST | `logout/` | logged in | End the session |
| GET/PATCH | `me/` | logged in | Read or update profile, location and farm/business details |
| PATCH | `roles/` | logged in | Add a buyer or farmer role; existing roles cannot be removed |
| POST | `password-reset/` | public | Send a reset link (same response for unknown emails) |
| POST | `password-reset/confirm/` | public | Set a new password with uid + token |
| GET/POST | `verify-email/` | public | Confirm an email address with uid + token |
| POST | `verify-email/resend/` | logged in | Send a fresh verification email |

Verification is a named ladder: **Unverified → Account verified** (email
confirmed) **→ Identity reviewed → Cooperative verified** (staff-set in Django
admin). One account can be both a buyer and a farmer. `PATCH /api/auth/roles/`
adds a role and creates the matching profile row; it rejects attempts to remove
an existing role. The React profile page uses it for the "add role" buttons.

In development, emails (verification and password reset) print to the console
(`DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`). Links
point at `FRONTEND_URL` (default `http://localhost:5173`).

Session-authenticated writes (PATCH/POST/DELETE) need the `X-CSRFToken` header.
Fetch `GET /api/auth/csrf/` first, and re-fetch it after login/logout because
Django rotates the token then. Registration and login do not need a token for
anonymous visitors; DRF still checks it when an existing session is signed in,
and the React client always sends it.

### Rate limits and sessions

Authentication endpoints are limited per client IP. The defaults, all
configurable through `.env`, are:

| Setting | Default | Applies to |
|---|---|---|
| `LOGIN_RATE_LIMIT` | `10/min` | `login/` |
| `REGISTER_RATE_LIMIT` | `5/hour` | `register/` |
| `PASSWORD_RESET_RATE_LIMIT` | `10/hour` | `password-reset/` and its confirm endpoint |
| `SESSION_COOKIE_AGE` | 14 days (1209600 s) | All sessions |

Going over a limit returns `429` with a DRF `detail` message. The throttle
counts both anonymous and signed-in requests for these endpoints.

Verification emails are sent after the new user is logged in. The verification
token hashes `last_login`, so sending it first (before `login()`) would produce
a link that is already invalid when the welcome email arrives; a regression test
covers this.

In development, a verification or reset link can be copied from the console
output. Tokens expire after Django's `PASSWORD_RESET_TIMEOUT` (3 days by
default).

## Locations API (`/api/locations/`)

Public, unpaginated reference data for the province → district → sector
cascade:

| Method | Path | Purpose |
|---|---|---|
| GET | `provinces/` | All 5 provinces |
| GET | `districts/?province={id}` | Districts, optionally narrowed to one province |
| GET | `sectors/?district={id}` | Sectors for one district (a district is required; names repeat) |

Invalid ids or a missing `district` return `400`. Cell is free text on the user
profile because the sector is the marketplace's working area.

## Contact API (`/api/contact/`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `contact/` | public | Send a message from the Contact Us page |

The body is JSON with `name`, `email`, `subject` and `message`. Every field is
validated on the server, and a successful send returns `201` with a plain
thank-you message. Messages are stored in `ContactMessage` and listed in Django
admin (`Contact messages`), where staff can mark them handled.

- `CONTACT_EMAIL` (default `hello@sarura.rw`) receives the notification email.
- `CONTACT_RATE_LIMIT` (default `5/hour`) limits submissions per IP address.
  Going over the limit returns `429`.
- The form includes a hidden `website` field. When it is filled, the view
  returns the same `201` message but stores and sends nothing, so bots get no
  signal that they were caught.
- If the notification email fails, the message is still stored and the error is
  logged, so no enquiry is lost.

## Marketplace API (`/api/`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `categories/` | public | Fixed category list (Vegetables, Fruits, Grains, Tubers, Other) |
| GET | `products/` | public | Active listings, 24 per page, searchable/filterable (see below) |
| POST | `products/` | farmer | Create a listing (owner is set from the session) |
| GET | `products/{id}/` | public | Listing detail; owners can preview their sold/hidden ones |
| PATCH | `products/{id}/` | owner | Edit listing, mark sold or hidden |
| DELETE | `products/{id}/` | owner | Archive the listing (sets status `hidden`, never deletes rows) |
| GET | `products/mine/` | farmer | All of your listings, including sold and hidden |
| POST | `products/{id}/images/` | owner | Upload a photo (multipart: `image`, optional `alt_text`, `position`) |
| PATCH/DELETE | `products/{id}/images/{image_id}/` | owner | Change alt text/position, or remove a photo |
| GET | `farmers/{id}/` | public | Public farmer profile: name, district, badge, active listings |
| GET/POST | `buyer/saved-products/` | buyer | List bookmarks or save an active listing (`{"product": id}`) |
| DELETE | `buyer/saved-products/{id}/` | buyer | Remove your own bookmark |

`GET /api/products/` accepts these optional query parameters:

| Parameter | Meaning |
|---|---|
| `search` or `q` | Partial, case-insensitive crop name search |
| `category`, `province`, `district`, `sector` | Ids from the reference data |
| `min_price`, `max_price` | RWF/kg range |
| `min_quantity` | Minimum available kg |
| `verified` | `true` = identity-reviewed or cooperative-verified farmers only |
| `sort` | `newest` (default), `price` (lowest first), `nearest` |
| `near` | District id for `sort=nearest`; defaults to the logged-in user's district |

Invalid values return `400`. Results always contain active listings only.
Nearest sorting currently approximates distance with tiers — same district,
same province, then everywhere else — because listings have no coordinates yet
`[review]`; without a location it falls back to newest.

Product list and detail responses include `province_id`, `is_saved` and
`saved_product_id`. The last two are `false`/`null` for anonymous users and
non-buyers; for a signed-in buyer they reflect that buyer's private bookmark.
Saving the same product twice is idempotent (the second call returns `200`).
Sold listings stay in a buyer's saved list with their status; hidden (archived)
listings are excluded until restored.

Listing rules (from `docs/step1-marketplace-rules.md`):

- Active listings hold 1 – 1,000,000 kg; price is 50 – 100,000 RWF/kg.
  A listing at 0 kg must be marked `sold`.
- Phone numbers and email addresses in the crop name or description are
  rejected; first contact happens through SARURA chat.
- 0 – 5 photos per listing. JPG, PNG and WebP only, 1 MB maximum each. The server
  checks the file header (not just the extension), renames every file and stores
  it under `media/products/`. Alt text falls back to the crop name.
- Public farmer profiles never expose email, phone, sector or cell.

## Deals API (`/api/deals/`)

Purchase requests, negotiation and confirmed orders from Step 10. All endpoints
need a session; signed-in writes use `X-CSRFToken` from `/api/auth/csrf/`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET/POST | `requests/` | buyer/farmer / buyer | List private requests, or open one with `product`, `quantity`, `offered_price`, optional `message` |
| GET | `requests/{id}/` | participant | Full request with terms, permission flags and offer history |
| POST | `requests/{id}/accept/` | participant | Farmer accepts opening terms, or buyer accepts the latest counter |
| POST | `requests/{id}/counter/` | farmer | Store a counter with `quantity`, `offered_price`, optional `message` and future `expires_at` |
| POST | `requests/{id}/reject/` | participant | Close the request; farmer rejects it or buyer rejects the outstanding counter |
| POST | `requests/{id}/cancel/` | participant | Either party closes the request without an order |
| GET | `orders/` | buyer/farmer | List orders involving the signed-in user |
| GET | `orders/{id}/` | participant | Order detail with change history |

Request lists accept `product`, `status` and `side=buying|selling` filters;
order lists accept `status`. Only the buyer and the listing's farmer can read a
deal. Request POST is buyer-only; counter POST is farmer-only. Others receive
`403`.

Rules implemented from `docs/step1-marketplace-rules.md` §7:

- One active (`pending` or `negotiating`) request per buyer per listing; a
  closed request frees the buyer to send a new one.
- Request quantity cannot exceed listing stock; only active listings and
  somebody else's listing can be requested.
- Every counter is a new `Offer` row. A farmer can revise an unanswered counter;
  the previous pending offer becomes `superseded` so only the newest is
  actionable. The full history is retained.
- An expired pending counter closes the request as `expired`. Expiry runs when
  deal pages are read or written, outside `transaction.atomic()`, so a later
  validation error cannot roll it back. No background worker is needed.
- Acceptance creates one `Order` in a locked transaction, reduces listing stock
  and marks it `sold` at zero. An `OrderEvent` records actor, time and status.
  Orders start `confirmed` because Step 10 only creates them after both sides
  accept; Step 12 adds the remaining status flow and notifications.

The founder review decisions for this step are in
`docs/step10-purchase-requests.md`.

## Notes

- Secrets live only in `.env` (git-ignored). `.env.example` documents every key.
- Django's built-in admin is on a non-obvious path (`DJANGO_ADMIN_URL`,
  default `/sarura-admin/`). The React admin dashboard comes in a later step.
- The API defaults to `IsAuthenticatedOrReadOnly` and 24-item pages; individual
  views override as needed.
- The user-facing UI is Kinyarwanda-first via the React i18n files; Django's own
  messages are English-first (admin/staff tools).
