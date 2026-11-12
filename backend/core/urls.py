"""Public core URLs, mounted under /api/ by config.urls."""

from django.urls import path

from core import views

urlpatterns = [
    path("contact/", views.ContactMessageCreateView.as_view(), name="contact-message"),
    path("locations/provinces/", views.ProvinceListView.as_view(), name="province-list"),
    path("locations/districts/", views.DistrictListView.as_view(), name="district-list"),
    path("locations/sectors/", views.SectorListView.as_view(), name="sector-list"),
]
