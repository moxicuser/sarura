"""Core app: health check and public Rwanda location endpoints."""

from django.db import connection
from django.http import JsonResponse
from rest_framework import generics

from core.models import District, Province, Sector
from core.serializers import (
    DistrictQuerySerializer,
    DistrictSerializer,
    ProvinceSerializer,
    SectorQuerySerializer,
    SectorSerializer,
)


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
