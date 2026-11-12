"""Django admin for Rwanda location reference data."""

from django.contrib import admin

from core.models import District, Province, Sector


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
