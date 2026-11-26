"""Serializers for purchase requests, counter-offers and confirmed orders."""

from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from deals.models import Offer, Order, OrderEvent, PurchaseRequest
from marketplace.models import MAX_PRICE, MAX_QUANTITY, MIN_PRICE, Product


def party_display_name(user: User) -> str:
    """A safe label for the other party: never email or phone."""

    buyer_profile = getattr(user, "buyer_profile", None)
    if buyer_profile and buyer_profile.business_name:
        return buyer_profile.business_name
    farmer_profile = getattr(user, "farmer_profile", None)
    if farmer_profile and farmer_profile.farm_name:
        return farmer_profile.farm_name
    return user.full_name


class DealPartySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "display_name"]

    def get_display_name(self, obj):
        return party_display_name(obj)


class DealProductSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source="district.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "crop_name",
            "quantity",
            "price_per_unit",
            "district_name",
            "status",
        ]


class OfferSerializer(serializers.ModelSerializer):
    created_by = DealPartySerializer(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Offer
        fields = [
            "id",
            "quantity",
            "offered_price",
            "message",
            "expires_at",
            "status",
            "created_by",
            "created_at",
            "decided_at",
            "is_expired",
        ]
        read_only_fields = fields


class PurchaseRequestSerializer(serializers.ModelSerializer):
    """Full negotiation view, including what the signed-in user can do next."""

    buyer = DealPartySerializer(read_only=True)
    product = DealProductSerializer(read_only=True)
    offers = OfferSerializer(many=True, read_only=True)
    status_changed_by = DealPartySerializer(read_only=True)
    accepted_by = DealPartySerializer(read_only=True)
    order_id = serializers.SerializerMethodField()
    current_terms = serializers.SerializerMethodField()
    viewer_side = serializers.SerializerMethodField()
    can_accept = serializers.SerializerMethodField()
    can_counter = serializers.SerializerMethodField()
    can_reject = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = [
            "id",
            "buyer",
            "product",
            "quantity",
            "offered_price",
            "message",
            "status",
            "status_changed_at",
            "status_changed_by",
            "status_note",
            "accepted_by",
            "order_id",
            "current_terms",
            "viewer_side",
            "can_accept",
            "can_counter",
            "can_reject",
            "can_cancel",
            "offers",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def _viewer(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return None
        return user

    def _is_buyer(self, obj) -> bool:
        user = self._viewer()
        return user is not None and user.id == obj.buyer_id

    def _is_farmer(self, obj) -> bool:
        user = self._viewer()
        return user is not None and user.id == obj.product.farmer_id

    def get_order_id(self, obj):
        order = getattr(obj, "order", None)
        return order.id if order else None

    def get_current_terms(self, obj):
        offer = obj.latest_pending_offer
        if offer:
            return {
                "source": "offer",
                "offer_id": offer.id,
                "quantity": offer.quantity,
                "offered_price": str(offer.offered_price),
                "expires_at": offer.expires_at,
            }
        return {
            "source": "request",
            "offer_id": None,
            "quantity": obj.quantity,
            "offered_price": str(obj.offered_price),
            "expires_at": None,
        }

    def get_viewer_side(self, obj):
        if self._is_buyer(obj):
            return "buying"
        if self._is_farmer(obj):
            return "selling"
        return None

    def get_can_accept(self, obj) -> bool:
        if not obj.is_active:
            return False
        if self._is_buyer(obj):
            return obj.latest_pending_offer is not None
        if self._is_farmer(obj):
            return obj.latest_pending_offer is None
        return False

    def get_can_counter(self, obj) -> bool:
        # A farmer may revise a counter before the buyer responds; the previous
        # pending offer is marked superseded so only the newest one is actionable.
        return obj.is_active and self._is_farmer(obj)

    def get_can_reject(self, obj) -> bool:
        if not obj.is_active:
            return False
        if self._is_farmer(obj):
            return True
        return self._is_buyer(obj) and obj.latest_pending_offer is not None

    def get_can_cancel(self, obj) -> bool:
        return obj.is_active and (self._is_buyer(obj) or self._is_farmer(obj))


class PurchaseRequestCreateSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_QUANTITY)
    offered_price = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=MIN_PRICE, max_value=MAX_PRICE
    )
    message = serializers.CharField(
        max_length=1000, required=False, allow_blank=True, default=""
    )

    class Meta:
        model = PurchaseRequest
        fields = ["product", "quantity", "offered_price", "message"]

    def validate_product(self, value):
        if value.status != Product.Status.ACTIVE:
            raise serializers.ValidationError("Only active listings can receive requests.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        product = attrs["product"]

        if product.farmer_id == user.id:
            raise serializers.ValidationError(
                {"product": "You cannot send a request for your own listing."}
            )
        if attrs["quantity"] > product.quantity:
            raise serializers.ValidationError(
                {"quantity": "The request cannot exceed the listing's available quantity."}
            )
        if PurchaseRequest.objects.filter(
            buyer=user,
            product=product,
            status__in=PurchaseRequest.ACTIVE_STATUSES,
        ).exists():
            raise serializers.ValidationError(
                {"detail": "You already have an active request for this listing."}
            )
        return attrs


class CounterOfferSerializer(serializers.ModelSerializer):
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_QUANTITY)
    offered_price = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=MIN_PRICE, max_value=MAX_PRICE
    )
    message = serializers.CharField(
        max_length=1000, required=False, allow_blank=True, default=""
    )

    class Meta:
        model = Offer
        fields = ["quantity", "offered_price", "message", "expires_at"]

    def validate_expires_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Choose an expiry time in the future.")
        return value

    def validate(self, attrs):
        purchase_request = self.context["purchase_request"]
        if attrs["quantity"] > purchase_request.product.quantity:
            raise serializers.ValidationError(
                {"quantity": "The counter cannot exceed the listing's available quantity."}
            )

        current = purchase_request.latest_pending_offer or purchase_request
        if (
            attrs["quantity"] == current.quantity
            and attrs["offered_price"] == Decimal(str(current.offered_price))
        ):
            raise serializers.ValidationError(
                {"detail": "A counter must change the quantity or the price."}
            )
        return attrs


class ActionReasonSerializer(serializers.Serializer):
    message = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default=""
    )


class OrderEventSerializer(serializers.ModelSerializer):
    actor = DealPartySerializer(read_only=True)

    class Meta:
        model = OrderEvent
        fields = ["id", "from_status", "to_status", "actor", "note", "created_at"]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    buyer = DealPartySerializer(read_only=True)
    farmer = DealPartySerializer(read_only=True)
    product = DealProductSerializer(read_only=True)
    purchase_request_id = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    events = OrderEventSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "purchase_request_id",
            "buyer",
            "farmer",
            "product",
            "quantity",
            "unit_price",
            "total_price",
            "status",
            "events",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
