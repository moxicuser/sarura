"""Transactional email helpers (verification and password reset).

Links point at the React app (FRONTEND_URL), which then calls our API with the
uid/token. In development Django prints emails to the console; production
configures a real EMAIL_BACKEND through environment variables.
"""

from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _frontend_url(path: str, **params) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    query = urlencode(params)
    return f"{base}{path}?{query}" if query else f"{base}{path}"


def _uid_and_token(user) -> tuple[str, str]:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return uid, token


def send_verification_email(user) -> None:
    uid, token = _uid_and_token(user)
    link = _frontend_url("/verify-email", uid=uid, token=token)
    send_mail(
        subject="Verify your SARURA email address",
        message=(
            f"Muraho {user.display_name},\n\n"
            "Confirm your email address to finish setting up your SARURA account:\n\n"
            f"{link}\n\n"
            "The link expires after a while. If it has expired, request a new one "
            "from your profile page.\n\n"
            "SARURA — the Rwandan farmer-to-buyer marketplace"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user) -> None:
    uid, token = _uid_and_token(user)
    link = _frontend_url("/reset-password", uid=uid, token=token)
    send_mail(
        subject="Reset your SARURA password",
        message=(
            f"Muraho {user.display_name},\n\n"
            "Someone asked to reset the password for this SARURA account. "
            "If it was you, open this link:\n\n"
            f"{link}\n\n"
            "If you did not ask for this, ignore this email — your password stays "
            "unchanged.\n\n"
            "SARURA — the Rwandan farmer-to-buyer marketplace"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
