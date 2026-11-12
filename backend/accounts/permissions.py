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

    Works with objects that expose the owner as ``user`` (profiles, products)
    or ``owner``. Override ``owner_field`` on the view/serializer if a model
    names its owner differently.
    """

    owner_field = "user"

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, self.owner_field, None) or getattr(obj, "owner", None)
        return owner == request.user
