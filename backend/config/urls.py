"""
URL configuration for SARURA.

Django's built-in admin lives on the non-obvious path configured in
DJANGO_ADMIN_URL (guide §4). The REST API is mounted under /api/.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path

from core.views import health_check

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/health/", health_check, name="health-check"),
]
