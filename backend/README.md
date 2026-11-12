# SARURA backend

Django + Django REST Framework + PostgreSQL, following section 6 of the
development guide.

## Layout

```
backend/
  config/          # Django settings and root URLs
  core/            # contact messages, static page content, health check
  accounts/        # users, roles, profiles, verification
  marketplace/     # categories, products, images, search
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
| POST | `password-reset/` | public | Send a reset link (same response for unknown emails) |
| POST | `password-reset/confirm/` | public | Set a new password with uid + token |
| GET/POST | `verify-email/` | public | Confirm an email address with uid + token |
| POST | `verify-email/resend/` | logged in | Send a fresh verification email |

Verification is a named ladder: **Unverified → Account verified** (email
confirmed) **→ Identity reviewed → Cooperative verified** (staff-set in Django
admin). One account can be both a buyer and a farmer.

In development, emails (verification and password reset) print to the console
(`DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`). Links
point at `FRONTEND_URL` (default `http://localhost:5173`).

Session-authenticated writes (PATCH/POST/DELETE) need the `X-CSRFToken` header.
Fetch `GET /api/auth/csrf/` first, and re-fetch it after login/logout because
Django rotates the token then. Registration and login are public POSTs and do
not need a token.

## Notes

- Secrets live only in `.env` (git-ignored). `.env.example` documents every key.
- Django's built-in admin is on a non-obvious path (`DJANGO_ADMIN_URL`,
  default `/sarura-admin/`). The React admin dashboard comes in a later step.
- The API defaults to `IsAuthenticatedOrReadOnly` and 24-item pages; individual
  views override as needed.
- The user-facing UI is Kinyarwanda-first via the React i18n files; Django's own
  messages are English-first (admin/staff tools).
