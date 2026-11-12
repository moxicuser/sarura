"""Django admin for users, roles, profiles and verification."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.forms import UserChangeForm, UserCreationForm
from accounts.models import BuyerProfile, FarmerProfile, User


class FarmerProfileInline(admin.StackedInline):
    model = FarmerProfile
    fk_name = "user"
    can_delete = False
    extra = 0


class BuyerProfileInline(admin.StackedInline):
    model = BuyerProfile
    fk_name = "user"
    can_delete = False
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    ordering = ("email",)
    list_display = (
        "email",
        "full_name",
        "phone",
        "is_farmer",
        "is_buyer",
        "verification_level",
        "is_staff",
        "is_active",
    )
    list_filter = (
        "is_farmer",
        "is_buyer",
        "verification_level",
        "is_staff",
        "is_active",
    )
    search_fields = ("email", "full_name", "phone")
    readonly_fields = ("date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal information", {"fields": ("full_name", "phone", "language")}),
        ("Roles", {"fields": ("is_buyer", "is_farmer")}),
        (
            "Verification ladder",
            {
                "fields": (
                    "verification_level",
                    "email_verified_at",
                    "identity_reviewed_at",
                    "cooperative_verified_at",
                ),
                "description": (
                    "Set the highest level reached: Account verified (email), "
                    "Identity reviewed, or Cooperative verified. Both dates must "
                    "be filled in when a staff review happens."
                ),
            },
        ),
        ("Location", {"fields": ("province", "district", "sector", "cell")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Dates", {"fields": ("date_joined", "last_login")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "phone",
                    "is_buyer",
                    "is_farmer",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    filter_horizontal = ("groups", "user_permissions")
    inlines = (FarmerProfileInline, BuyerProfileInline)


@admin.register(FarmerProfile)
class FarmerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "farm_name", "cooperative_name", "updated_at")
    search_fields = ("user__email", "user__full_name", "farm_name", "cooperative_name")
    list_select_related = ("user",)


@admin.register(BuyerProfile)
class BuyerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "business_name", "buyer_type", "updated_at")
    list_filter = ("buyer_type",)
    search_fields = ("user__email", "user__full_name", "business_name")
    list_select_related = ("user",)
