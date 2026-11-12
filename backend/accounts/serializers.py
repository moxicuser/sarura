"""API serializers for registration, login, profile and account recovery."""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from accounts.models import BuyerProfile, FarmerProfile, User, normalize_phone, phone_validator
from core.models import District, Province, Sector


def clean_phone(value: str) -> str:
    """Normalize a phone number and validate it as a Rwandan mobile number."""
    normalized = normalize_phone(value)
    try:
        phone_validator(normalized)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages)
    return normalized


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerProfile
        fields = ["farm_name", "cooperative_name", "about"]


class BuyerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuyerProfile
        fields = ["business_name", "buyer_type"]


class UserSerializer(serializers.ModelSerializer):
    """A user's own profile. Email and roles are read-only here."""

    farmer_profile = FarmerProfileSerializer(required=False)
    buyer_profile = BuyerProfileSerializer(required=False)
    phone = serializers.CharField(max_length=24)
    province_name = serializers.CharField(source="province.name", read_only=True, default=None)
    district_name = serializers.CharField(source="district.name", read_only=True, default=None)
    sector_name = serializers.CharField(source="sector.name", read_only=True, default=None)
    verification_label = serializers.CharField(read_only=True)
    location_label = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "is_buyer",
            "is_farmer",
            "is_staff",
            "verification_level",
            "verification_label",
            "email_verified_at",
            "identity_reviewed_at",
            "cooperative_verified_at",
            "language",
            "province",
            "province_name",
            "district",
            "district_name",
            "sector",
            "sector_name",
            "cell",
            "location_label",
            "date_joined",
            "farmer_profile",
            "buyer_profile",
        ]
        read_only_fields = [
            "id",
            "email",
            "is_farmer",
            "is_buyer",
            "is_staff",
            "verification_level",
            "email_verified_at",
            "identity_reviewed_at",
            "cooperative_verified_at",
            "date_joined",
        ]

    def validate_phone(self, value):
        normalized = clean_phone(value)
        queryset = User.objects.filter(phone=normalized)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return normalized

    def validate(self, attrs):
        instance = self.instance
        province = attrs.get("province", getattr(instance, "province", None))
        district = attrs.get("district", getattr(instance, "district", None))
        sector = attrs.get("sector", getattr(instance, "sector", None))

        if district and not province:
            raise serializers.ValidationError({"province": "Choose a province for this district."})
        if district and province and district.province_id != province.id:
            raise serializers.ValidationError(
                {"district": "This district does not belong to the selected province."}
            )
        if sector and not district:
            raise serializers.ValidationError({"district": "Choose a district for this sector."})
        if sector and district and sector.district_id != district.id:
            raise serializers.ValidationError(
                {"sector": "This sector does not belong to the selected district."}
            )
        return attrs

    def update(self, instance, validated_data):
        farmer_data = validated_data.pop("farmer_profile", None)
        buyer_data = validated_data.pop("buyer_profile", None)

        instance = super().update(instance, validated_data)

        if farmer_data is not None and instance.is_farmer:
            FarmerProfile.objects.update_or_create(user=instance, defaults=farmer_data)
        if buyer_data is not None and instance.is_buyer:
            BuyerProfile.objects.update_or_create(user=instance, defaults=buyer_data)

        return instance


class RegisterSerializer(serializers.Serializer):
    """Create an account that can buy, sell, or do both.

    Location is required (province + district); the sector is optional but must
    match the district when supplied. The cell is free text.
    """

    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=24)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    is_buyer = serializers.BooleanField(default=False)
    is_farmer = serializers.BooleanField(default=False)

    province = serializers.PrimaryKeyRelatedField(queryset=Province.objects.all())
    district = serializers.PrimaryKeyRelatedField(queryset=District.objects.all())
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(), required=False, allow_null=True
    )
    cell = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(
        choices=User.Language.choices, required=False, default=User.Language.KINYARWANDA
    )

    # Optional profile details; kept only when the matching role is chosen.
    farm_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    cooperative_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    business_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    buyer_type = serializers.ChoiceField(
        choices=BuyerProfile.BuyerType.choices,
        required=False,
        default=BuyerProfile.BuyerType.INDIVIDUAL,
    )

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_phone(self, value):
        normalized = clean_phone(value)
        if User.objects.filter(phone=normalized).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return normalized

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "The passwords do not match."})

        if not attrs.get("is_buyer") and not attrs.get("is_farmer"):
            raise serializers.ValidationError(
                {"roles": "Choose at least one role: buy, sell, or both."}
            )

        province = attrs["province"]
        district = attrs["district"]
        sector = attrs.get("sector")

        if district.province_id != province.id:
            raise serializers.ValidationError(
                {"district": "This district does not belong to the selected province."}
            )
        if sector and sector.district_id != district.id:
            raise serializers.ValidationError(
                {"sector": "This sector does not belong to the selected district."}
            )

        return attrs

    def create(self, validated_data):
        profile_fields = {
            "farm_name": validated_data.pop("farm_name", ""),
            "cooperative_name": validated_data.pop("cooperative_name", ""),
            "business_name": validated_data.pop("business_name", ""),
            "buyer_type": validated_data.pop("buyer_type", BuyerProfile.BuyerType.INDIVIDUAL),
        }
        validated_data.pop("password_confirm")

        user = User.objects.create_user(**validated_data)

        if user.is_farmer:
            FarmerProfile.objects.create(
                user=user,
                farm_name=profile_fields["farm_name"],
                cooperative_name=profile_fields["cooperative_name"],
            )
        if user.is_buyer:
            BuyerProfile.objects.create(
                user=user,
                business_name=profile_fields["business_name"],
                buyer_type=profile_fields["buyer_type"],
            )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(
            request=request,
            email=attrs["email"].lower().strip(),
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError({"detail": "Email or password is incorrect."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is disabled."})
        attrs["user"] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "The passwords do not match."}
            )
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
