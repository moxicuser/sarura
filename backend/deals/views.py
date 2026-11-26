"""Deals API: purchase requests, negotiation actions and confirmed orders."""

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsBuyer
from deals.models import Offer, Order, OrderEvent, PurchaseRequest
from deals.permissions import (
    HasDealRole,
    IsOrderParticipant,
    IsPurchaseRequestParticipant,
)
from deals.serializers import (
    ActionReasonSerializer,
    CounterOfferSerializer,
    OfferSerializer,
    OrderSerializer,
    PurchaseRequestCreateSerializer,
    PurchaseRequestSerializer,
)
from marketplace.models import Product


def request_queryset():
    return (
        PurchaseRequest.objects.select_related(
            "buyer",
            "buyer__buyer_profile",
            "buyer__farmer_profile",
            "product",
            "product__district",
            "product__farmer",
            "product__farmer__buyer_profile",
            "product__farmer__farmer_profile",
            "status_changed_by",
        )
        .prefetch_related("offers__created_by")
    )


def order_queryset():
    return Order.objects.select_related(
        "buyer",
        "buyer__buyer_profile",
        "buyer__farmer_profile",
        "farmer",
        "farmer__buyer_profile",
        "farmer__farmer_profile",
        "product",
        "product__district",
    ).prefetch_related("events__actor")


def locked_request(pk: int) -> PurchaseRequest:
    """Lock the request row so an action cannot race with another action."""

    return get_object_or_404(
        PurchaseRequest.objects.select_for_update().select_related(
            "buyer", "product", "product__farmer"
        ),
        pk=pk,
    )


def create_order(purchase_request: PurchaseRequest, quantity: int, unit_price, actor) -> Order:
    """Create the order and reduce the listing stock in one locked transaction."""

    product = Product.objects.select_for_update().get(pk=purchase_request.product_id)
    if product.status != Product.Status.ACTIVE:
        raise ValidationError({"detail": "This listing is no longer available."})
    if product.quantity < quantity:
        raise ValidationError(
            {"quantity": "The listing no longer has enough quantity for this deal."}
        )

    product.quantity -= quantity
    if product.quantity == 0:
        product.status = Product.Status.SOLD
    product.save(update_fields=["quantity", "status", "updated_at"])

    order = Order.objects.create(
        purchase_request=purchase_request,
        buyer=purchase_request.buyer,
        farmer=product.farmer,
        product=product,
        quantity=quantity,
        unit_price=unit_price,
        status=Order.Status.CONFIRMED,
    )
    OrderEvent.objects.create(
        order=order,
        from_status=None,
        to_status=Order.Status.CONFIRMED,
        actor=actor,
        note="Both parties accepted the same terms.",
    )
    return order


def _parse_int(value: str | None, field: str) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({field: "Enter a valid id."})


class PurchaseRequestListView(generics.ListCreateAPIView):
    """Buyer requests and incoming farmer requests, never another user's."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsBuyer()]
        return [IsAuthenticated(), HasDealRole()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PurchaseRequestCreateSerializer
        return PurchaseRequestSerializer

    def get_queryset(self):
        # Expiry is committed before any serializer runs, so a later validation
        # error cannot roll back the state change.
        PurchaseRequest.expire_stale()
        user = self.request.user
        queryset = request_queryset().filter(Q(buyer=user) | Q(product__farmer=user))

        product_id = _parse_int(self.request.query_params.get("product"), "product")
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            if status_filter not in PurchaseRequest.Status.values:
                raise ValidationError({"status": "Unknown request status."})
            queryset = queryset.filter(status=status_filter)

        side = self.request.query_params.get("side")
        if side == "buying":
            queryset = queryset.filter(buyer=user)
        elif side == "selling":
            queryset = queryset.filter(product__farmer=user)
        elif side:
            raise ValidationError({"side": "Choose 'buying' or 'selling'."})

        return queryset

    def create(self, request, *args, **kwargs):
        PurchaseRequest.expire_stale()
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Re-check inside the lock: stock and active-request state can
            # change between validation and save.
            product = Product.objects.select_for_update().get(
                pk=serializer.validated_data["product"].pk
            )
            if serializer.validated_data["quantity"] > product.quantity:
                raise ValidationError(
                    {"quantity": "The request cannot exceed the listing's available quantity."}
                )
            if PurchaseRequest.objects.filter(
                buyer=request.user,
                product=product,
                status__in=PurchaseRequest.ACTIVE_STATUSES,
            ).exists():
                raise ValidationError(
                    {"detail": "You already have an active request for this listing."}
                )

            instance = serializer.save(buyer=request.user)

        detail = PurchaseRequestSerializer(instance, context={"request": request})
        return Response(detail.data, status=status.HTTP_201_CREATED)


class PurchaseRequestDetailView(generics.RetrieveAPIView):
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsAuthenticated, IsPurchaseRequestParticipant]

    def get_queryset(self):
        PurchaseRequest.expire_stale()
        return request_queryset()


class RequestActionView(APIView):
    """Shared helpers for request actions."""

    permission_classes = [IsAuthenticated, IsPurchaseRequestParticipant]

    def detail(self, request, obj):
        return PurchaseRequestSerializer(obj, context={"request": request}).data

    def check_active(self, obj):
        if not obj.is_active:
            raise ValidationError({"detail": "This request is already closed."})


class PurchaseRequestAcceptView(RequestActionView):
    """Farmer accepts the opening terms; buyer accepts the farmer's counter."""

    def post(self, request, pk):
        PurchaseRequest.expire_stale()
        with transaction.atomic():
            obj = locked_request(pk)
            self.check_object_permissions(request, obj)
            self.check_active(obj)

            now = timezone.now()
            offer = None
            if request.user.id == obj.buyer_id:
                offer = obj.latest_pending_offer
                if offer is None:
                    raise ValidationError(
                        {"detail": "There is no counter-offer for you to accept."}
                    )
                quantity, unit_price = offer.quantity, offer.offered_price
                note = "Buyer accepted the farmer's counter-offer."
            elif request.user.id == obj.product.farmer_id:
                if obj.latest_pending_offer is not None:
                    raise ValidationError(
                        {"detail": "Wait for the buyer to respond to your counter-offer."}
                    )
                quantity, unit_price = obj.quantity, obj.offered_price
                note = "Farmer accepted the buyer's request."
            else:  # Defensive: the permission class normally rejects this.
                raise PermissionDenied()

            order = create_order(obj, quantity, unit_price, request.user)
            obj.status = PurchaseRequest.Status.ACCEPTED
            obj.status_changed_at = now
            obj.status_changed_by = request.user
            obj.status_note = note
            obj.accepted_by = request.user
            obj.save(
                update_fields=[
                    "status",
                    "status_changed_at",
                    "status_changed_by",
                    "status_note",
                    "accepted_by",
                    "updated_at",
                ]
            )
            if offer is not None:
                offer.status = Offer.Status.ACCEPTED
                offer.decided_at = now
                offer.save(update_fields=["status", "decided_at"])

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class PurchaseRequestCounterView(RequestActionView):
    """Farmer records a new counter-offer in the offers history."""

    def post(self, request, pk):
        PurchaseRequest.expire_stale()
        with transaction.atomic():
            obj = locked_request(pk)
            self.check_object_permissions(request, obj)
            self.check_active(obj)

            if request.user.id != obj.product.farmer_id:
                raise PermissionDenied("Only the farmer can counter a request.")

            serializer = CounterOfferSerializer(
                data=request.data, context={"purchase_request": obj}
            )
            serializer.is_valid(raise_exception=True)

            product = Product.objects.get(pk=obj.product_id)
            if serializer.validated_data["quantity"] > product.quantity:
                raise ValidationError(
                    {"quantity": "The counter cannot exceed the listing's available quantity."}
                )

            now = timezone.now()
            obj.offers.filter(status=Offer.Status.PENDING).update(
                status=Offer.Status.SUPERSEDED, decided_at=now
            )
            offer = serializer.save(purchase_request=obj, created_by=request.user)
            obj.status = PurchaseRequest.Status.NEGOTIATING
            obj.status_changed_at = now
            obj.status_changed_by = request.user
            obj.status_note = "Farmer sent a counter-offer."
            obj.save(
                update_fields=[
                    "status",
                    "status_changed_at",
                    "status_changed_by",
                    "status_note",
                    "updated_at",
                ]
            )

        return Response(OfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class PurchaseRequestRejectView(RequestActionView):
    """Farmer rejects the request; buyer rejects the outstanding counter."""

    def post(self, request, pk):
        PurchaseRequest.expire_stale()
        with transaction.atomic():
            obj = locked_request(pk)
            self.check_object_permissions(request, obj)
            self.check_active(obj)

            reason = ActionReasonSerializer(data=request.data)
            reason.is_valid(raise_exception=True)
            note = reason.validated_data["message"].strip()

            now = timezone.now()
            if request.user.id == obj.product.farmer_id:
                status_note = note or "Farmer rejected the request."
            elif request.user.id == obj.buyer_id:
                if obj.latest_pending_offer is None:
                    raise ValidationError(
                        {"detail": "There is no counter-offer for you to reject."}
                    )
                status_note = note or "Buyer rejected the counter-offer."
            else:
                raise PermissionDenied()

            obj.offers.filter(status=Offer.Status.PENDING).update(
                status=Offer.Status.REJECTED, decided_at=now
            )
            obj.status = PurchaseRequest.Status.REJECTED
            obj.status_changed_at = now
            obj.status_changed_by = request.user
            obj.status_note = status_note
            obj.save(
                update_fields=[
                    "status",
                    "status_changed_at",
                    "status_changed_by",
                    "status_note",
                    "updated_at",
                ]
            )
            result = self.detail(request, obj)

        return Response(result)


class PurchaseRequestCancelView(RequestActionView):
    """Either party closes an active request without creating an order."""

    def post(self, request, pk):
        PurchaseRequest.expire_stale()
        with transaction.atomic():
            obj = locked_request(pk)
            self.check_object_permissions(request, obj)
            self.check_active(obj)

            reason = ActionReasonSerializer(data=request.data)
            reason.is_valid(raise_exception=True)
            note = reason.validated_data["message"].strip()
            now = timezone.now()

            obj.offers.filter(status=Offer.Status.PENDING).update(
                status=Offer.Status.CANCELLED, decided_at=now
            )
            obj.status = PurchaseRequest.Status.CANCELLED
            obj.status_changed_at = now
            obj.status_changed_by = request.user
            obj.status_note = note or (
                "Buyer cancelled the request."
                if request.user.id == obj.buyer_id
                else "Farmer cancelled the request."
            )
            obj.save(
                update_fields=[
                    "status",
                    "status_changed_at",
                    "status_changed_by",
                    "status_note",
                    "updated_at",
                ]
            )
            result = self.detail(request, obj)

        return Response(result)


class OrderListView(generics.ListAPIView):
    """Minimal order list from Step 10; Step 12 adds the full status flow."""

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, HasDealRole]

    def get_queryset(self):
        user = self.request.user
        queryset = order_queryset().filter(Q(buyer=user) | Q(farmer=user))
        status_filter = self.request.query_params.get("status")
        if status_filter:
            if status_filter not in Order.Status.values:
                raise ValidationError({"status": "Unknown order status."})
            queryset = queryset.filter(status=status_filter)
        return queryset


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsOrderParticipant]

    def get_queryset(self):
        return order_queryset()
