"""Serializers for public reference data (Rwanda locations)."""

from rest_framework import serializers

from core.models import District, Province, Sector


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ["id", "name", "name_rw"]


class DistrictSerializer(serializers.ModelSerializer):
    province_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = District
        fields = ["id", "name", "province_id"]


class SectorSerializer(serializers.ModelSerializer):
    district_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sector
        fields = ["id", "name", "district_id"]


class DistrictQuerySerializer(serializers.Serializer):
    """Optional province for the district cascade."""

    province = serializers.PrimaryKeyRelatedField(
        queryset=Province.objects.all(), required=False
    )


class SectorQuerySerializer(serializers.Serializer):
    """Sector names repeat across districts, so a district is required."""

    district = serializers.PrimaryKeyRelatedField(queryset=District.objects.all())
