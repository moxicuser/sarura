"""Django admin for Rwanda location reference data and contact messages."""

from django.contrib import admin

from core.models import ContactMessage, District, Province, Sector


class DistrictInline(admin.TabularInline):
    model = District
    extra = 0
    fields = ("name",)


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ("name", "name_rw")
    search_fields = ("name", "name_rw")
    inlines = (DistrictInline,)


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "province")
    list_filter = ("province",)
    search_fields = ("name",)
    list_select_related = ("province",)


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ("name", "district", "province_name")
    list_filter = ("district__province", "district")
    search_fields = ("name", "district__name")
    list_select_related = ("district__province",)

    @admin.display(description="Province", ordering="district__province__name")
    def province_name(self, obj):
        return obj.district.province.name


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "created_at", "handled")
    list_filter = ("handled", "created_at")
    search_fields = ("name", "email", "subject", "message")
    list_editable = ("handled",)
    readonly_fields = ("name", "email", "subject", "message", "created_at")
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        # Messages only arrive through the public form; admins reply by email.
        return False
