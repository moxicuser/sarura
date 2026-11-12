"""
URL configuration for SARURA.

Django's built-in admin lives on the non-obvious path configured in
DJANGO_ADMIN_URL (guide §4). The REST API is mounted under /api/.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.views import health_check

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("marketplace.urls")),
]

if settings.DEBUG:
    # Serve uploaded listing photos during development only.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
