"""Core app: cross-cutting helpers, contact messages and a health endpoint."""

from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """Small JSON endpoint used by uptime monitoring and deploy checks.

    Returns 200 only when the database answers a trivial query.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:  # pragma: no cover - only on a broken database
        return JsonResponse(
            {"status": "error", "database": "unreachable"},
            status=503,
        )

    return JsonResponse({"status": "ok", "database": "ok"})
