"""Core app: health check, public Rwanda locations and the contact form."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import connection
from django.http import JsonResponse
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import District, Province, Sector
from core.serializers import (
    ContactMessageSerializer,
    DistrictQuerySerializer,
    DistrictSerializer,
    ProvinceSerializer,
    SectorQuerySerializer,
    SectorSerializer,
)
from core.throttles import ContactRateThrottle

logger = logging.getLogger(__name__)


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


class ProvinceListView(generics.ListAPIView):
    queryset = Province.objects.all()
    serializer_class = ProvinceSerializer
    pagination_class = None


class DistrictListView(generics.ListAPIView):
    """Districts, optionally narrowed to one province."""

    serializer_class = DistrictSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = District.objects.all()
        params = DistrictQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        province = params.validated_data.get("province")
        if province:
            queryset = queryset.filter(province=province)
        return queryset


class SectorListView(generics.ListAPIView):
    """Sectors for one district. A district is required because names repeat."""

    serializer_class = SectorSerializer
    pagination_class = None

    def get_queryset(self):
        params = SectorQuerySerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        return Sector.objects.filter(district=params.validated_data["district"])


class ContactMessageCreateView(APIView):
    """Accept a public Contact Us message (Step 7).

    Protections:
    - hidden `website` trap: any submission with it filled is silently dropped;
    - per-IP rate limit via ContactRateThrottle;
    - server-side validation of every field.

    The message is stored even if the notification email fails, so no enquiry is
    lost. The email goes to CONTACT_EMAIL (the admin inbox).
    """

    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request, *args, **kwargs):
        if request.data.get("website"):
            return Response(
                {"detail": "Thank you. Your message has been received."},
                status=status.HTTP_201_CREATED,
            )

        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()

        try:
            send_mail(
                subject=f"[SARURA contact] {message.subject}",
                message=(
                    f"From: {message.name} <{message.email}>\n\n"
                    f"{message.message}\n\n"
                    f"Received: {message.created_at:%Y-%m-%d %H:%M} (Africa/Kigali)"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.CONTACT_EMAIL],
                fail_silently=False,
            )
        except Exception:  # pragma: no cover - email outages must not lose the message
            logger.exception("Could not send contact notification for message %s", message.pk)

        return Response(
            {"detail": "Thank you. Your message has been received."},
            status=status.HTTP_201_CREATED,
        )
