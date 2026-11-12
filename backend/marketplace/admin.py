"""Django admin for categories, listings and photos."""

from django.contrib import admin

from marketplace.models import Category, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "name_rw", "product_count")
    search_fields = ("name", "name_rw")

    @admin.display(description="Listings")
    def product_count(self, obj):
        return obj.products.count()


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("image", "alt_text", "position")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "crop_name",
        "farmer",
        "category",
        "quantity",
        "unit",
        "price_per_unit",
        "district",
        "status",
        "created_at",
    )
    list_filter = ("status", "category", "district", "price_basis")
    search_fields = ("crop_name", "description", "farmer__email", "farmer__full_name")
    autocomplete_fields = ("farmer",)
    list_select_related = ("farmer", "category", "district")
    date_hierarchy = "created_at"
    inlines = (ProductImageInline,)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("product", "position", "alt_text", "created_at")
    search_fields = ("product__crop_name", "alt_text")
    list_select_related = ("product",)
