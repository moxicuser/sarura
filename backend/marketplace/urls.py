"""Marketplace URLs, mounted under /api/ by config.urls."""

from django.urls import path

from marketplace import views

app_name = "marketplace"

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="categories"),
    path("products/", views.ProductListView.as_view(), name="product-list"),
    path("products/mine/", views.ProductMineView.as_view(), name="product-mine"),
    path("products/<int:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
    path(
        "products/<int:pk>/images/",
        views.ProductImageCreateView.as_view(),
        name="product-image-create",
    ),
    path(
        "products/<int:pk>/images/<int:image_pk>/",
        views.ProductImageDetailView.as_view(),
        name="product-image-detail",
    ),
    path("farmers/<int:pk>/", views.PublicFarmerView.as_view(), name="farmer-public"),
]
