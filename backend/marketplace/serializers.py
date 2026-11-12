"""Serializers for categories, listings, photos and public farmer profiles."""

import re

from django.core.validators import FileExtensionValidator
from rest_framework import serializers

from accounts.models import User
from core.models import District, Sector
from marketplace.models import (
    MAX_PHOTOS,
    MAX_PRICE,
    MAX_QUANTITY,
    MIN_PRICE,
    Category,
    Product,
    ProductImage,
)
from marketplace.validators import validate_image_format, validate_image_size

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?250|0)7[2389]\d{7}")


def contains_contact_details(text: str) -> bool:
    """Rules §1: no phone numbers or emails in crop names or descriptions."""
    if not text:
        return False
    if EMAIL_RE.search(text):
        return True
    compact = re.sub(r"[\s\-().]", "", text)
    return bool(PHONE_RE.search(compact))


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "name_rw"]


class PublicFarmerSummarySerializer(serializers.ModelSerializer):
    """Safe public fields only: never email, phone, sector or cell."""

    display_name = serializers.SerializerMethodField()
    district_name = serializers.CharField(source="district.name", read_only=True, default=None)
    verification_label = serializers.CharField(read_only=True)
    is_verified_farmer = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "display_name",
            "district_name",
            "verification_level",
            "verification_label",
            "is_verified_farmer",
        ]

    def get_display_name(self, obj) -> str:
        profile = getattr(obj, "farmer_profile", None)
        if profile and profile.farm_name:
            return profile.farm_name
        return obj.full_name


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
            validate_image_size,
            validate_image_format,
        ]
    )
    position = serializers.IntegerField(min_value=0, max_value=MAX_PHOTOS - 1, required=False)

    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    farmer = PublicFarmerSummarySerializer(read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)
    sector_name = serializers.CharField(source="sector.name", read_only=True, default=None)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "crop_name",
            "category",
            "quantity",
            "unit",
            "price_per_unit",
            "price_basis",
            "district_name",
            "sector_name",
            "status",
            "primary_image",
            "farmer",
            "created_at",
        ]

    def get_primary_image(self, obj):
        image = obj.primary_image
        if image is None:
            return None
        request = self.context.get("request")
        url = image.image.url
        return request.build_absolute_uri(url) if request else url


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    location_label = serializers.CharField(read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description",
            "available_from",
            "images",
            "location_label",
            "updated_at",
        ]


class ProductWriteSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    district = serializers.PrimaryKeyRelatedField(queryset=District.objects.all())
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.all(), required=False, allow_null=True
    )
    quantity = serializers.IntegerField(min_value=0, max_value=MAX_QUANTITY)
    price_per_unit = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=MIN_PRICE, max_value=MAX_PRICE
    )

    class Meta:
        model = Product
        fields = [
            "category",
            "crop_name",
            "description",
            "quantity",
            "unit",
            "price_per_unit",
            "price_basis",
            "district",
            "sector",
            "available_from",
            "status",
        ]

    def validate(self, attrs):
        instance = self.instance
        status = attrs.get("status", getattr(instance, "status", Product.Status.ACTIVE))
        quantity = attrs.get("quantity", getattr(instance, "quantity", None))

        if status == Product.Status.ACTIVE and (quantity is None or quantity < 1):
            raise serializers.ValidationError(
                {"quantity": "An active listing needs at least 1 kg. Mark it sold when it runs out."}
            )

        district = attrs.get("district", getattr(instance, "district", None))
        sector = attrs.get("sector", getattr(instance, "sector", None))
        if sector and not district:
            raise serializers.ValidationError({"district": "Choose a district for this sector."})
        if sector and district and sector.district_id != district.id:
            raise serializers.ValidationError(
                {"sector": "This sector does not belong to the selected district."}
            )

        text = " ".join(
            filter(
                None,
                [
                    attrs.get("crop_name", getattr(instance, "crop_name", "")),
                    attrs.get("description", getattr(instance, "description", "")),
                ],
            )
        )
        if contains_contact_details(text):
            raise serializers.ValidationError(
                {
                    "description": (
                        "Do not put phone numbers or email addresses in the listing. "
                        "Buyers contact you through SARURA chat."
                    )
                }
            )

        return attrs


class PublicFarmerSerializer(PublicFarmerSummarySerializer):
    active_listings_count = serializers.IntegerField(read_only=True)
    member_since = serializers.DateTimeField(source="date_joined", read_only=True)
    products = serializers.SerializerMethodField()

    class Meta(PublicFarmerSummarySerializer.Meta):
        fields = PublicFarmerSummarySerializer.Meta.fields + [
            "active_listings_count",
            "member_since",
            "products",
        ]

    def get_products(self, obj):
        products = (
            obj.products.filter(status=Product.Status.ACTIVE)
            .select_related("category", "farmer__farmer_profile", "district", "sector")
            .prefetch_related("images")
        )
        return ProductListSerializer(products, many=True, context=self.context).data
