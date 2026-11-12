"""
Django settings for SARURA.

Reads secrets and environment-specific values from backend/.env (see
.env.example for the full list). Never commit the real .env file.
"""

from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env once, before any os.getenv() calls.
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core security settings
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError(
        "DJANGO_SECRET_KEY is not set. Copy backend/.env.example to backend/.env "
        "and fill in a secret key."
    )

DEBUG = env_bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "")

# URL path for Django's built-in admin. Deliberately non-obvious (guide §4);
# the React admin dashboard is the everyday staff tool.
ADMIN_URL = os.getenv("DJANGO_ADMIN_URL", "sarura-admin/")


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    # SARURA apps (guide §6 folder structure)
    "core",  # contact messages, static page content, health
    "accounts",  # users, roles, profiles, verification
    "marketplace",  # categories, products, images, search
    "deals",  # purchase requests, negotiation, orders
    "messaging",  # conversations and messages
    "notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ---------------------------------------------------------------------------
# Database — PostgreSQL (guide §7)
# ---------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "sarura"),
        "USER": os.getenv("POSTGRES_USER", "sarura"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", "127.0.0.1"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "OPTIONS": {
            "connect_timeout": 5,
        },
    }
}


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

# The custom user model (email login, dual buyer/farmer roles) must be set
# before the first app migration (guide Step 3).
AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Argon2 first, Django's default PBKDF2 as fallback (guide §7: "use Argon2 if possible").
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]


# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
# The SARURA user-facing UI is Kinyarwanda-first, but that is owned by the
# React i18n layer (frontend/src/i18n/rw.json + en.json). Django itself does
# not ship Kinyarwanda translation files, so the backend defaults to English
# (admin is English-first per docs/step1-translations.md) and `rw` stays
# selectable for when we add translated email/SMS templates.

LANGUAGE_CODE = "en-us"
LANGUAGES = [
    ("rw", "Kinyarwanda"),
    ("en-us", "English"),
]
TIME_ZONE = "Africa/Kigali"
USE_I18N = True
USE_TZ = True
LOCALE_PATHS = [BASE_DIR / "locale"]


# ---------------------------------------------------------------------------
# Sessions, CSRF and email
# ---------------------------------------------------------------------------
# The React app runs on FRONTEND_URL during development. Session cookies are
# SameSite=Lax so they work for same-site requests; production on separate
# domains will use HTTPS + SameSite=None (set through the environment later).

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# The React app reads the CSRF token from /api/auth/csrf/ and sends it back in
# the X-CSRFToken header, so the cookie itself stays script-readable.
CSRF_COOKIE_HTTPONLY = False

EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "SARURA <no-reply@sarura.rw>")

# Public Contact Us form: where enquiries are sent and how many an IP may send.
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "hello@sarura.rw")
CONTACT_RATE_LIMIT = os.getenv("CONTACT_RATE_LIMIT", "5/hour")

# Authentication limits (guide section 7: stop bots and password guessing).
# Login is generous enough for a person who mistypes a password, while repeated
# attempts are still blocked. Registration and reset links are rarer actions.
LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT", "10/min")
REGISTER_RATE_LIMIT = os.getenv("REGISTER_RATE_LIMIT", "5/hour")
PASSWORD_RESET_RATE_LIMIT = os.getenv("PASSWORD_RESET_RATE_LIMIT", "10/hour")

# Sessions expire after two weeks by default (guide: sessions that expire).
SESSION_COOKIE_AGE = int(os.getenv("SESSION_COOKIE_AGE", str(60 * 60 * 24 * 14)))


# ---------------------------------------------------------------------------
# Static and media files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"


# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    # Anything writable requires login; public pages can read (guide: visitors
    # browse freely, private actions are blocked).
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_THROTTLE_RATES": {
        "contact": CONTACT_RATE_LIMIT,
        "login": LOGIN_RATE_LIMIT,
        "register": REGISTER_RATE_LIMIT,
        "password_reset": PASSWORD_RESET_RATE_LIMIT,
    },
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
