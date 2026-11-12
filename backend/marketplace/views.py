"""Marketplace API: public browsing, farmer listing management and photos."""

from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsFarmer, IsOwner
from marketplace.models import MAX_PHOTOS, Category, Product, ProductImage
from marketplace.serializers import (
    SORT_NEAREST,
    SORT_PRICE,
    CategorySerializer,
    ProductDetailSerializer,
    ProductFilterSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductWriteSerializer,
    PublicFarmerSerializer,
)


def product_queryset():
    """Shared queryset with everything the serializers read (avoids N+1)."""
    return (
        Product.objects.select_related(
            "category",
            "farmer",
            "farmer__farmer_profile",
            "district",
            "sector",
        )
        .prefetch_related("images")
    )


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


class ProductListView(generics.ListCreateAPIView):
    """Public list of active listings + farmer-only creation.

    Query parameters (all optional): `search` or `q`, `category`, `province`,
    `district`, `sector`, `min_price`, `max_price`, `min_quantity`, `verified`,
    `sort` (`newest`, `price`, `nearest`) and `near` (district id).
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsFarmer()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductWriteSerializer
        return ProductListSerializer

    def get_queryset(self):
        queryset = product_queryset().filter(status=Product.Status.ACTIVE)

        filters = ProductFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data

        search = params.get("search")
        if search:
            queryset = queryset.filter(crop_name__icontains=search)
        if params.get("category"):
            queryset = queryset.filter(category=params["category"])
        if params.get("province"):
            queryset = queryset.filter(district__province=params["province"])
        if params.get("district"):
            queryset = queryset.filter(district=params["district"])
        if params.get("sector"):
            queryset = queryset.filter(sector=params["sector"])
        if params.get("min_price") is not None:
            queryset = queryset.filter(price_per_unit__gte=params["min_price"])
        if params.get("max_price") is not None:
            queryset = queryset.filter(price_per_unit__lte=params["max_price"])
        if params.get("min_quantity") is not None:
            queryset = queryset.filter(quantity__gte=params["min_quantity"])
        if params.get("verified"):
            queryset = queryset.filter(
                farmer__verification_level__in=[
                    User.VerificationLevel.IDENTITY,
                    User.VerificationLevel.COOPERATIVE,
                ]
            )

        if params["sort"] == SORT_PRICE:
            return queryset.order_by("price_per_unit", "-created_at", "-id")

        if params["sort"] == SORT_NEAREST:
            near = params.get("near")
            if near is None and self.request.user.is_authenticated:
                near = self.request.user.district
            if near is not None:
                # No coordinates yet: same district, then same province, then rest.
                return queryset.annotate(
                    distance_tier=Case(
                        When(district_id=near.id, then=Value(0)),
                        When(district__province_id=near.province_id, then=Value(1)),
                        default=Value(2),
                        output_field=IntegerField(),
                    )
                ).order_by("distance_tier", "-created_at", "-id")

        return queryset.order_by("-created_at", "-id")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(farmer=request.user)
        detail = ProductDetailSerializer(
            serializer.instance, context=self.get_serializer_context()
        )
        return Response(detail.data, status=status.HTTP_201_CREATED)


class ProductMineView(generics.ListAPIView):
    """A farmer's own listings, including sold and hidden ones."""

    serializer_class = ProductListSerializer
    permission_classes = [IsFarmer]

    def get_queryset(self):
        return product_queryset().filter(farmer=self.request.user)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Public details for active listings; owner-only editing and archiving."""

    owner_field = "farmer"

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsFarmer(), IsOwner()]

    def get_queryset(self):
        queryset = product_queryset()
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            return queryset

        user = self.request.user
        if user.is_authenticated:
            if user.is_staff:
                return queryset
            # Owners can preview their sold/hidden listings.
            return queryset.filter(Q(status=Product.Status.ACTIVE) | Q(farmer=user))
        return queryset.filter(status=Product.Status.ACTIVE)

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProductWriteSerializer
        return ProductDetailSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ProductWriteSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        detail = ProductDetailSerializer(instance, context=self.get_serializer_context())
        return Response(detail.data)

    def perform_destroy(self, instance):
        # Rules §3: archive instead of deleting so old orders keep meaning.
        instance.status = Product.Status.HIDDEN
        instance.save(update_fields=["status", "updated_at"])


class ProductImageCreateView(APIView):
    permission_classes = [IsFarmer, IsOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    owner_field = "farmer"

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk)
        self.check_object_permissions(request, product)

        if product.images.count() >= MAX_PHOTOS:
            return Response(
                {"detail": f"A listing can have at most {MAX_PHOTOS} photos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ProductImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        used = set(product.images.values_list("position", flat=True))
        requested_position = serializer.validated_data.get("position")
        if requested_position is not None and requested_position in used:
            return Response(
                {"position": ["This position is already used by another photo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if requested_position is None:
            requested_position = next(
                position for position in range(MAX_PHOTOS) if position not in used
            )

        image = serializer.save(
            product=product,
            position=requested_position,
            alt_text=serializer.validated_data.get("alt_text") or product.crop_name[:150],
        )
        return Response(
            ProductImageSerializer(image, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductImageDetailView(APIView):
    permission_classes = [IsFarmer, IsOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    owner_field = "farmer"

    def _get_image(self, request, pk, image_pk):
        product = get_object_or_404(Product, pk=pk)
        self.check_object_permissions(request, product)
        return product, get_object_or_404(ProductImage, pk=image_pk, product=product)

    def patch(self, request, pk, image_pk):
        product, image = self._get_image(request, pk, image_pk)
        serializer = ProductImageSerializer(image, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_position = serializer.validated_data.get("position")
        if (
            new_position is not None
            and product.images.exclude(pk=image.pk).filter(position=new_position).exists()
        ):
            return Response(
                {"position": ["This position is already used by another photo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save()
        return Response(ProductImageSerializer(image, context={"request": request}).data)

    def delete(self, request, pk, image_pk):
        _, image = self._get_image(request, pk, image_pk)
        # Remove the file from storage as well as the row.
        if image.image:
            image.image.delete(save=False)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicFarmerView(generics.RetrieveAPIView):
    """Public farmer profile: name, district, verification badge, listings."""

    serializer_class = PublicFarmerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            User.objects.filter(is_farmer=True, is_active=True)
            .select_related("farmer_profile", "district")
            .annotate(
                active_listings_count=Count(
                    "products", filter=Q(products__status=Product.Status.ACTIVE)
                )
            )
        )
