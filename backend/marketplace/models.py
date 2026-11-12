"""Marketplace: categories, listings and listing photos.

Rules come from docs/step1-marketplace-rules.md:

- Fixed categories (Vegetables, Fruits, Grains, Tubers, Other).
- Fresh, unprocessed farm produce only. kg is the only unit in v1, but the
  column exists so other units can be added later.
- Active listings hold 1 – 1,000,000 kg; price is 50 – 100,000 RWF/kg.
- Listings are archived (status hidden/sold), never hard-deleted, so old deals
  keep their meaning.
- 0 – 5 photos per listing, JPG/PNG/WebP, about 1 MB or less per photo.
"""

import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from core.models import District, Sector

MIN_PRICE = 50
MAX_PRICE = 100_000
MAX_QUANTITY = 1_000_000
MAX_PHOTOS = 5


def product_image_upload_to(instance, filename: str) -> str:
    """Rename uploads to an unguessable name; never trust the original name."""
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension == "jpeg":
        extension = "jpg"
    return f"products/{instance.product_id}/{uuid.uuid4().hex}.{extension or 'jpg'}"


class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    name_rw = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    class Unit(models.TextChoices):
        KG = "kg", "kg"

    class PriceBasis(models.TextChoices):
        FIXED = "fixed", "Fixed price"
        NEGOTIABLE = "negotiable", "Negotiable"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SOLD = "sold", "Sold"
        HIDDEN = "hidden", "Hidden"

    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
        limit_choices_to={"is_farmer": True},
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")

    crop_name = models.CharField(max_length=60, db_index=True)
    description = models.TextField(max_length=1000, blank=True)
    quantity = models.PositiveIntegerField(validators=[MaxValueValidator(MAX_QUANTITY)])
    unit = models.CharField(max_length=8, choices=Unit.choices, default=Unit.KG)
    price_per_unit = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(MIN_PRICE), MaxValueValidator(MAX_PRICE)],
        db_index=True,
    )
    price_basis = models.CharField(
        max_length=16, choices=PriceBasis.choices, default=PriceBasis.NEGOTIABLE
    )

    district = models.ForeignKey(District, on_delete=models.PROTECT, related_name="products")
    sector = models.ForeignKey(
        Sector, on_delete=models.PROTECT, null=True, blank=True, related_name="products"
    )

    available_from = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=8, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="product_status_created_idx"),
            models.Index(fields=["district", "status"], name="product_district_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__lte=MAX_QUANTITY), name="product_quantity_max"
            ),
            models.CheckConstraint(
                condition=Q(price_per_unit__gte=MIN_PRICE)
                & Q(price_per_unit__lte=MAX_PRICE),
                name="product_price_range",
            ),
        ]

    def __str__(self):
        return f"{self.crop_name} ({self.quantity} {self.unit}) — {self.farmer.display_name}"

    def clean(self):
        super().clean()
        if self.status == self.Status.ACTIVE and (self.quantity is None or self.quantity < 1):
            raise ValidationError(
                {"quantity": "An active listing needs at least 1 kg. Mark it sold when it runs out."}
            )
        if self.sector_id and self.district_id and self.sector.district_id != self.district_id:
            raise ValidationError({"sector": "The sector does not belong to the selected district."})

    @property
    def primary_image(self):
        """First photo by position, or None. Prefetch images to avoid queries."""
        images = list(self.images.all())
        return images[0] if images else None

    @property
    def location_label(self) -> str:
        parts = [
            self.sector.name if self.sector else "",
            self.district.name if self.district else "",
        ]
        return ", ".join(part for part in parts if part)

    @property
    def is_publicly_visible(self) -> bool:
        return self.status == self.Status.ACTIVE


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=product_image_upload_to)
    alt_text = models.CharField(max_length=150, blank=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(position__lte=MAX_PHOTOS - 1), name="product_image_position_max"
            ),
            models.UniqueConstraint(
                fields=["product", "position"], name="uniq_photo_position_per_product"
            ),
        ]

    def __str__(self):
        return f"Photo {self.position + 1} of {self.product.crop_name}"
