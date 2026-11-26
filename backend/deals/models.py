"""Deals: purchase requests, negotiation offers and confirmed orders.

Rules come from docs/step1-marketplace-rules.md §7 and the Step 10 guide:

- A buyer opens a request with quantity (kg), offered price (RWF/kg) and an
  optional plain-text message.
- One active request is allowed per buyer per listing.
- The farmer accepts, rejects or counters. Every counter is a separate,
  immutable ``Offer`` row so the negotiation history survives.
- An order exists only after both sides have accepted the same terms. Every
  order change is recorded with the actor and time in ``OrderEvent``.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from marketplace.models import MAX_PRICE, MAX_QUANTITY, MIN_PRICE, Product


class PurchaseRequest(models.Model):
    """A buyer's opening proposal for one listing."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        NEGOTIATING = "negotiating", "Negotiating"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    ACTIVE_STATUSES = (Status.PENDING, Status.NEGOTIATING)

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="purchase_requests",
        limit_choices_to={"is_buyer": True},
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="purchase_requests"
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(MAX_QUANTITY)]
    )
    offered_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(MIN_PRICE), MaxValueValidator(MAX_PRICE)],
    )
    message = models.TextField(max_length=1000, blank=True)

    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    status_changed_at = models.DateTimeField(default=timezone.now)
    status_changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="request_status_changes",
    )
    status_note = models.CharField(max_length=500, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_requests",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["buyer", "-created_at"], name="request_buyer_created_idx"),
            models.Index(fields=["product", "status"], name="request_product_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gte=1) & Q(quantity__lte=MAX_QUANTITY),
                name="request_quantity_range",
            ),
            models.CheckConstraint(
                condition=Q(offered_price__gte=MIN_PRICE)
                & Q(offered_price__lte=MAX_PRICE),
                name="request_price_range",
            ),
        ]

    def __str__(self):
        return f"{self.buyer.full_name} → {self.product.crop_name} ({self.quantity} kg)"

    @property
    def is_active(self) -> bool:
        return self.status in self.ACTIVE_STATUSES

    @property
    def latest_pending_offer(self):
        """The only counter the buyer can act on; older ones are superseded."""

        return self.offers.filter(status=Offer.Status.PENDING).order_by("-id").first()

    def clean(self):
        super().clean()
        if self.quantity and self.product_id and self.quantity > self.product.quantity:
            raise ValidationError(
                {"quantity": "The request cannot exceed the listing's available quantity."}
            )
        if self.product_id and self.buyer_id == self.product.farmer_id:
            raise ValidationError({"product": "You cannot request your own listing."})

    @classmethod
    def expire_stale(cls) -> int:
        """Close requests whose outstanding counter has passed its expiry.

        This runs when deal pages are read or changed, so no background worker
        is needed for the small v1 dataset. Expiry is a system action and leaves
        ``status_changed_by`` empty.
        """

        now = timezone.now()
        stale_ids = list(
            cls.objects.filter(
                status__in=cls.ACTIVE_STATUSES,
                offers__status=Offer.Status.PENDING,
                offers__expires_at__lt=now,
            )
            .values_list("id", flat=True)
            .distinct()
        )
        for request_id in stale_ids:
            Offer.objects.filter(
                purchase_request_id=request_id,
                status=Offer.Status.PENDING,
                expires_at__lt=now,
            ).update(status=Offer.Status.EXPIRED, decided_at=now)
            cls.objects.filter(id=request_id).update(
                status=cls.Status.EXPIRED,
                status_changed_at=now,
                status_changed_by=None,
                status_note="A counter-offer expired.",
            )
        return len(stale_ids)


class Offer(models.Model):
    """One counter terms proposal. Rows are never edited after a decision."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        SUPERSEDED = "superseded", "Superseded"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    purchase_request = models.ForeignKey(
        PurchaseRequest, on_delete=models.CASCADE, related_name="offers"
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(MAX_QUANTITY)]
    )
    offered_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(MIN_PRICE), MaxValueValidator(MAX_PRICE)],
    )
    message = models.TextField(max_length=1000, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="counter_offers",
        limit_choices_to={"is_farmer": True},
    )
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gte=1) & Q(quantity__lte=MAX_QUANTITY),
                name="offer_quantity_range",
            ),
            models.CheckConstraint(
                condition=Q(offered_price__gte=MIN_PRICE)
                & Q(offered_price__lte=MAX_PRICE),
                name="offer_price_range",
            ),
        ]

    def __str__(self):
        return (
            f"Counter {self.id}: {self.quantity} kg at {self.offered_price} RWF/kg "
            f"({self.status})"
        )

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and self.expires_at < timezone.now())


class Order(models.Model):
    """A deal created only when buyer and farmer accepted the same terms."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        NEGOTIATING = "negotiating", "Negotiating"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    purchase_request = models.OneToOneField(
        PurchaseRequest, on_delete=models.CASCADE, related_name="order"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="buyer_orders"
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="farmer_orders"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="orders")
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(MAX_QUANTITY)]
    )
    unit_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(MIN_PRICE), MaxValueValidator(MAX_PRICE)],
    )
    # Step 10 creates an order only after mutual acceptance, so it starts
    # confirmed. Step 12 adds the remaining status transitions and notifications.
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.CONFIRMED, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.id}: {self.quantity} kg of {self.product.crop_name}"

    @property
    def total_price(self):
        return self.quantity * self.unit_price


class OrderEvent(models.Model):
    """Who changed an order, when, and from which status to which."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    from_status = models.CharField(max_length=16, choices=Order.Status.choices, blank=True, null=True)
    to_status = models.CharField(max_length=16, choices=Order.Status.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_events",
    )
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Order {self.order_id}: {self.from_status or 'created'} → {self.to_status}"
