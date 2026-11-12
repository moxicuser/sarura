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

## Notes

- Secrets live only in `.env` (git-ignored). `.env.example` documents every key.
- Django's built-in admin is on a non-obvious path (`DJANGO_ADMIN_URL`,
  default `/sarura-admin/`). The React admin dashboard comes in a later step.
- The API defaults to `IsAuthenticatedOrReadOnly` and 24-item pages; individual
  views override as needed.
- The user-facing UI is Kinyarwanda-first via the React i18n files; Django's own
  messages are English-first (admin/staff tools).
