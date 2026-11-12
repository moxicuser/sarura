"""Serializers for public reference data and the Contact Us form."""

from rest_framework import serializers

from core.models import ContactMessage, District, Province, Sector


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


class ContactMessageSerializer(serializers.ModelSerializer):
    """Validate the Contact Us form.

    The `website` field is a hidden spam trap: real people never see or fill it,
    so the view silently accepts and drops any submission that includes it.
    """

    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactMessage
        fields = ["name", "email", "subject", "message", "website"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Please enter your name.")
        return value

    def validate_subject(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Please enter a subject.")
        return value

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Please write your message.")
        return value
