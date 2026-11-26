"""Django admin registration for Step 10 deal records."""

from django.contrib import admin

from deals.models import Offer, Order, OrderEvent, PurchaseRequest


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "buyer", "product", "status", "quantity", "offered_price", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["buyer__full_name", "buyer__email", "product__crop_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ["id", "purchase_request", "status", "quantity", "offered_price", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["purchase_request__id", "purchase_request__product__crop_name"]
    readonly_fields = ["created_at", "decided_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "buyer", "farmer", "product", "status", "quantity", "unit_price", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["buyer__full_name", "farmer__full_name", "product__crop_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(OrderEvent)
class OrderEventAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "from_status", "to_status", "actor", "created_at"]
    list_filter = ["to_status", "created_at"]
    search_fields = ["order__id", "actor__full_name"]
    readonly_fields = ["created_at"]
