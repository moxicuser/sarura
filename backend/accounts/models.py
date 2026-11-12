"""Accounts: custom user (email login), roles, profiles and verification.

Design decisions from Step 1 (docs/step1-marketplace-rules.md):

- One account can be a buyer and a farmer at the same time.
- Login is by email; phone is a required, unique contact field.
- Verification is a named ladder, never an unexplained tick:
    1. Unverified            (new account)
    2. Account verified      (email confirmed)
    3. Identity reviewed     (SARURA staff checked the person)
    4. Cooperative verified  (cooperative membership confirmed)
- Location uses the real Rwanda province → district → sector structure; the
  cell is free text because the sector is the marketplace's working area.
"""

import re

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone

from core.models import District, Province, Sector

# Accepts local (0788123456) and international (+250788123456) Rwandan mobile
# numbers. Stored values are normalized to +2507XXXXXXXX by normalize_phone().
phone_validator = RegexValidator(
    regex=r"^(?:\+250|0)7[2389]\d{7}$",
    message="Enter a Rwandan mobile number, for example 0788123456 or +250788123456.",
)


def normalize_phone(value: str) -> str:
    """Return a phone number in E.164 form (+2507XXXXXXXX)."""
    if not value:
        return value
    cleaned = re.sub(r"[\s\-()]", "", value.strip())
    if cleaned.startswith("+"):
        cleaned = "+" + cleaned[1:].lstrip("0")
    if cleaned.startswith("00250"):
        cleaned = "+" + cleaned[2:]
    if cleaned.startswith("250"):
        cleaned = "+" + cleaned
    if cleaned.startswith("0"):
        cleaned = "+250" + cleaned[1:]
    return cleaned


class UserManager(BaseUserManager):
    """Manager for a user model whose login identifier is the email address."""

    use_in_migrations = True

    def _prepare(self, email: str, **extra):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email).lower()
        if extra.get("phone"):
            extra["phone"] = normalize_phone(extra["phone"])
        return email, extra

    def create_user(self, email, password=None, **extra_fields):
        email, extra_fields = self._prepare(email, **extra_fields)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Language(models.TextChoices):
        KINYARWANDA = "rw", "Kinyarwanda"
        ENGLISH = "en", "English"

    class VerificationLevel(models.TextChoices):
        UNVERIFIED = "unverified", "Unverified"
        ACCOUNT = "account", "Account verified"
        IDENTITY = "identity", "Identity reviewed"
        COOPERATIVE = "cooperative", "Cooperative verified"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=16, unique=True, validators=[phone_validator])

    # Roles. Both may be true: one account can sell and buy.
    is_buyer = models.BooleanField(default=False)
    is_farmer = models.BooleanField(default=False)

    verification_level = models.CharField(
        max_length=16,
        choices=VerificationLevel.choices,
        default=VerificationLevel.UNVERIFIED,
    )
    email_verified_at = models.DateTimeField(null=True, blank=True)
    identity_reviewed_at = models.DateTimeField(null=True, blank=True)
    cooperative_verified_at = models.DateTimeField(null=True, blank=True)

    # Location (Rwanda's official structure; cell is free text).
    province = models.ForeignKey(
        Province, on_delete=models.PROTECT, null=True, blank=True, related_name="users"
    )
    district = models.ForeignKey(
        District, on_delete=models.PROTECT, null=True, blank=True, related_name="users"
    )
    sector = models.ForeignKey(
        Sector, on_delete=models.PROTECT, null=True, blank=True, related_name="users"
    )
    cell = models.CharField(max_length=100, blank=True)

    language = models.CharField(
        max_length=2, choices=Language.choices, default=Language.KINYARWANDA
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "phone"]

    class Meta:
        ordering = ["-date_joined"]
        constraints = [
            models.UniqueConstraint(Lower("email"), name="uniq_user_email_case_insensitive"),
            models.CheckConstraint(
                condition=Q(is_buyer=True) | Q(is_farmer=True) | Q(is_staff=True),
                name="user_has_a_role_or_is_staff",
            ),
        ]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    def save(self, *args, **kwargs):
        self.email = self.email.lower().strip() if self.email else self.email
        self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.sector_id and not self.district_id:
            raise ValidationError("Choose a district before a sector.")
        if self.district_id and not self.province_id:
            raise ValidationError("Choose a province before a district.")
        if self.district_id and self.province_id and self.district.province_id != self.province_id:
            raise ValidationError("The district does not belong to the selected province.")
        if self.sector_id and self.district_id and self.sector.district_id != self.district_id:
            raise ValidationError("The sector does not belong to the selected district.")

    @property
    def display_name(self) -> str:
        return self.full_name or self.email

    @property
    def has_role(self) -> bool:
        return self.is_buyer or self.is_farmer

    @property
    def is_verified_farmer(self) -> bool:
        """True once a farmer passed identity review or cooperative verification."""
        return self.is_farmer and self.verification_level in {
            self.VerificationLevel.IDENTITY,
            self.VerificationLevel.COOPERATIVE,
        }

    @property
    def verification_label(self) -> str:
        return self.get_verification_level_display()

    @property
    def location_label(self) -> str:
        parts = [
            self.cell,
            self.sector.name if self.sector else "",
            self.district.name if self.district else "",
            self.province.name if self.province else "",
        ]
        return ", ".join(part for part in parts if part)


class FarmerProfile(models.Model):
    """Extra details a user gets when they choose to sell."""

    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="farmer_profile"
    )
    farm_name = models.CharField(max_length=150, blank=True)
    cooperative_name = models.CharField(max_length=150, blank=True)
    about = models.TextField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__full_name"]

    def __str__(self):
        return f"Farmer profile: {self.user.display_name}"


class BuyerProfile(models.Model):
    """Extra details a user gets when they choose to buy."""

    class BuyerType(models.TextChoices):
        INDIVIDUAL = "individual", "Individual"
        RESTAURANT = "restaurant", "Restaurant"
        TRADER = "trader", "Trader"
        COMPANY = "company", "Company"

    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="buyer_profile"
    )
    business_name = models.CharField(max_length=150, blank=True)
    buyer_type = models.CharField(
        max_length=16, choices=BuyerType.choices, default=BuyerType.INDIVIDUAL
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__full_name"]

    def __str__(self):
        return f"Buyer profile: {self.user.display_name}"
