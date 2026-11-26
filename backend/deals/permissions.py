"""Permissions for purchase requests and orders.

Only the two parties to a deal can read it, and only the party named by the
action can change it. Staff moderation arrives with the Step 13 admin tools.
"""

from rest_framework.permissions import BasePermission

from accounts.models import User


class HasDealRole(BasePermission):
    """A deal list is available to buyer and farmer accounts."""

    message = "Only buyer or farmer accounts can view deals."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and isinstance(user, User)
            and (user.is_buyer or user.is_farmer)
        )


class IsPurchaseRequestParticipant(BasePermission):
    message = "Only the buyer or farmer on this request can view it."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.id in {obj.buyer_id, obj.product.farmer_id}


class IsOrderParticipant(BasePermission):
    message = "Only the buyer or farmer on this order can view it."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.id in {obj.buyer_id, obj.farmer_id}
