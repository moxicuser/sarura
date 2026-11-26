"""Deals URLs, mounted under /api/ by config.urls."""

from django.urls import path

from deals import views

app_name = "deals"

urlpatterns = [
    path("deals/requests/", views.PurchaseRequestListView.as_view(), name="request-list"),
    path(
        "deals/requests/<int:pk>/",
        views.PurchaseRequestDetailView.as_view(),
        name="request-detail",
    ),
    path(
        "deals/requests/<int:pk>/accept/",
        views.PurchaseRequestAcceptView.as_view(),
        name="request-accept",
    ),
    path(
        "deals/requests/<int:pk>/counter/",
        views.PurchaseRequestCounterView.as_view(),
        name="request-counter",
    ),
    path(
        "deals/requests/<int:pk>/reject/",
        views.PurchaseRequestRejectView.as_view(),
        name="request-reject",
    ),
    path(
        "deals/requests/<int:pk>/cancel/",
        views.PurchaseRequestCancelView.as_view(),
        name="request-cancel",
    ),
    path("deals/orders/", views.OrderListView.as_view(), name="order-list"),
    path("deals/orders/<int:pk>/", views.OrderDetailView.as_view(), name="order-detail"),
]
