"""Reusable DRF permission classes for role-gated endpoints."""

from rest_framework.permissions import BasePermission


class IsFarmer(BasePermission):
    message = "Only farmer accounts can do this."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_farmer)


class IsBuyer(BasePermission):
    message = "Only buyer accounts can do this."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_buyer)


class IsOwner(BasePermission):
    """Allow access only to the user who owns the object.

    Works with objects that expose the owner as ``user`` (profiles) or a custom
    field set on the view (``owner_field = "farmer"`` for products). It also
    falls back to ``owner``.
    """

    owner_field = "user"

    def has_object_permission(self, request, view, obj):
        field = getattr(view, "owner_field", self.owner_field) if view is not None else self.owner_field
        owner = getattr(obj, field, None)
        if owner is None:
            owner = getattr(obj, "owner", None)
        return owner == request.user
