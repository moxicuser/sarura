"""Tests for Step 4: categories, listings, ownership and photo uploads."""

import os
import shutil
import tempfile
from datetime import timedelta
from io import BytesIO

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import BuyerProfile, FarmerProfile, User
from core.models import District, Province, Sector
from marketplace.models import Category, Product, ProductImage


def make_image(name="photo.png", size=(12, 12), image_format="PNG"):
    buffer = BytesIO()
    Image.new("RGB", size, (36, 122, 69)).save(buffer, format=image_format)
    buffer.seek(0)
    return SimpleUploadedFile(
        name, buffer.read(), content_type=f"image/{image_format.lower()}"
    )


def make_oversized_image():
    """A real PNG larger than 1 MB (random noise does not compress)."""
    buffer = BytesIO()
    Image.frombytes("RGB", (900, 900), os.urandom(900 * 900 * 3)).save(
        buffer, format="PNG"
    )
    buffer.seek(0)
    return SimpleUploadedFile("big.png", buffer.read(), content_type="image/png")


class MarketplaceTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.kigali = Province.objects.create(name="City of Kigali", name_rw="Umujyi wa Kigali")
        cls.gasabo = District.objects.create(province=cls.kigali, name="Gasabo")
        cls.kicukiro = District.objects.create(province=cls.kigali, name="Kicukiro")
        cls.kimironko = Sector.objects.create(district=cls.gasabo, name="Kimironko")
        cls.gikondo = Sector.objects.create(district=cls.kicukiro, name="Gikondo")

        cls.vegetables = Category.objects.get(name="Vegetables")
        cls.grains = Category.objects.get(name="Grains")

    def make_user(self, email, phone, is_farmer=False, is_buyer=False, **extra):
        defaults = {
            "full_name": "Test Person",
            "is_farmer": is_farmer,
            "is_buyer": is_buyer,
            "province": self.kigali,
            "district": self.gasabo,
            "sector": self.kimironko,
        }
        defaults.update(extra)
        user = User.objects.create_user(
            email=email, password="StrongPass123!", phone=phone, **defaults
        )
        if is_farmer:
            FarmerProfile.objects.create(user=user, farm_name=f"{user.full_name} Farm")
        if is_buyer:
            BuyerProfile.objects.create(user=user)
        return user

    def make_farmer(self, email="farmer@example.com", phone="0788111000", **extra):
        return self.make_user(email, phone, is_farmer=True, **extra)

    def make_buyer(self, email="buyer@example.com", phone="0788222000", **extra):
        return self.make_user(email, phone, is_buyer=True, **extra)

    def make_product(self, farmer, **overrides):
        defaults = {
            "farmer": farmer,
            "category": self.vegetables,
            "crop_name": "Irish potato",
            "description": "Fresh Irish potatoes from Musanze.",
            "quantity": 500,
            "price_per_unit": "380.00",
            "price_basis": Product.PriceBasis.NEGOTIABLE,
            "district": self.gasabo,
            "sector": self.kimironko,
            "status": Product.Status.ACTIVE,
        }
        defaults.update(overrides)
        return Product.objects.create(**defaults)

    def product_payload(self, **overrides):
        data = {
            "category": self.vegetables.id,
            "crop_name": "Irish potato",
            "description": "Fresh Irish potatoes.",
            "quantity": 500,
            "unit": "kg",
            "price_per_unit": "380.00",
            "price_basis": "negotiable",
            "district": self.gasabo.id,
            "sector": self.kimironko.id,
            "status": "active",
        }
        data.update(overrides)
        return data


class CategoryTests(MarketplaceTestBase):
    def test_public_category_list_returns_fixed_five(self):
        response = self.client.get("/api/categories/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [category["name"] for category in response.json()],
            ["Fruits", "Grains", "Other", "Tubers", "Vegetables"],
        )
        self.assertIn("Imboga", [category["name_rw"] for category in response.json()])


class ProductPublicListTests(MarketplaceTestBase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = self.make_farmer()
        self.active = self.make_product(self.farmer)
        self.sold = self.make_product(self.farmer, crop_name="Maize", status=Product.Status.SOLD)
        self.hidden = self.make_product(self.farmer, crop_name="Beans", status=Product.Status.HIDDEN)

    def test_public_list_shows_only_active_listings(self):
        response = self.client.get("/api/products/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        item = response.data["results"][0]
        self.assertEqual(item["crop_name"], "Irish potato")
        self.assertEqual(item["price_per_unit"], "380.00")
        self.assertEqual(item["farmer"]["display_name"], "Test Person Farm")
        self.assertIsNone(item["primary_image"])

    def test_public_list_never_exposes_contact_details(self):
        body = self.client.get("/api/products/").content.decode()

        self.assertNotIn(self.farmer.email, body)
        self.assertNotIn(self.farmer.phone, body)

    def test_public_detail_hides_sold_and_hidden_listings(self):
        self.assertEqual(self.client.get(f"/api/products/{self.active.id}/").status_code, 200)
        self.assertEqual(self.client.get(f"/api/products/{self.sold.id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/products/{self.hidden.id}/").status_code, 404)


class ProductCreateTests(MarketplaceTestBase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = self.make_farmer()
        self.buyer = self.make_buyer()

    def test_anonymous_and_buyers_cannot_create(self):
        self.assertEqual(
            self.client.post("/api/products/", self.product_payload(), format="json").status_code,
            403,
        )

        self.client.force_login(self.buyer)
        self.assertEqual(
            self.client.post("/api/products/", self.product_payload(), format="json").status_code,
            403,
        )

    def test_farmer_creates_listing_and_gets_detail(self):
        self.client.force_login(self.farmer)

        response = self.client.post("/api/products/", self.product_payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["farmer"]["id"], self.farmer.id)
        self.assertEqual(response.data["quantity"], 500)
        self.assertEqual(response.data["images"], [])
        product = Product.objects.get(pk=response.data["id"])
        self.assertEqual(product.farmer, self.farmer)

    def test_active_listing_requires_quantity(self):
        self.client.force_login(self.farmer)

        response = self.client.post(
            "/api/products/", self.product_payload(quantity=0), format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("quantity", response.data)

    def test_zero_quantity_is_allowed_when_marking_sold(self):
        self.client.force_login(self.farmer)

        response = self.client.post(
            "/api/products/",
            self.product_payload(quantity=0, status="sold"),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

    def test_price_and_quantity_bounds(self):
        self.client.force_login(self.farmer)

        for payload, field in [
            ({"price_per_unit": "49.00"}, "price_per_unit"),
            ({"price_per_unit": "100000.01"}, "price_per_unit"),
            ({"quantity": 1_000_001}, "quantity"),
            ({"quantity": -1}, "quantity"),
        ]:
            response = self.client.post(
                "/api/products/", self.product_payload(**payload), format="json"
            )
            self.assertEqual(response.status_code, 400, payload)
            self.assertIn(field, response.data)

    def test_sector_must_match_district(self):
        self.client.force_login(self.farmer)

        response = self.client.post(
            "/api/products/", self.product_payload(sector=self.gikondo.id), format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("sector", response.data)

    def test_contact_details_are_rejected(self):
        self.client.force_login(self.farmer)

        response = self.client.post(
            "/api/products/",
            self.product_payload(description="Call 0788123456 for a good price."),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("description", response.data)


class ProductOwnershipTests(MarketplaceTestBase):
    def setUp(self):
        self.client = APIClient()
        self.owner = self.make_farmer()
        self.other_farmer = self.make_farmer(email="other@example.com", phone="0788333000")
        self.buyer = self.make_buyer()
        self.product = self.make_product(self.owner)

    def test_owner_can_update_listing(self):
        self.client.force_login(self.owner)

        response = self.client.patch(
            f"/api/products/{self.product.id}/",
            {"quantity": 250, "price_per_unit": "400.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["quantity"], 250)
        self.product.refresh_from_db()
        self.assertEqual(str(self.product.price_per_unit), "400.00")

    def test_other_farmer_cannot_edit_or_archive(self):
        self.client.force_login(self.other_farmer)

        self.assertEqual(
            self.client.patch(
                f"/api/products/{self.product.id}/", {"quantity": 10}, format="json"
            ).status_code,
            403,
        )
        self.assertEqual(self.client.delete(f"/api/products/{self.product.id}/").status_code, 403)

    def test_buyers_cannot_edit_listings(self):
        self.client.force_login(self.buyer)

        self.assertEqual(
            self.client.patch(
                f"/api/products/{self.product.id}/", {"quantity": 10}, format="json"
            ).status_code,
            403,
        )

    def test_delete_archives_instead_of_removing(self):
        self.client.force_login(self.owner)

        response = self.client.delete(f"/api/products/{self.product.id}/")

        self.assertEqual(response.status_code, 204)
        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.HIDDEN)

        self.client.logout()
        self.assertEqual(self.client.get(f"/api/products/{self.product.id}/").status_code, 404)

    def test_owner_can_preview_hidden_listing(self):
        self.product.status = Product.Status.HIDDEN
        self.product.save(update_fields=["status"])
        self.client.force_login(self.owner)

        response = self.client.get(f"/api/products/{self.product.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "hidden")

    def test_mine_lists_all_statuses_but_only_own(self):
        self.make_product(
            self.other_farmer, crop_name="Other maize", status=Product.Status.SOLD
        )
        self.make_product(self.owner, crop_name="Hidden beans", status=Product.Status.HIDDEN)
        self.client.force_login(self.owner)

        response = self.client.get("/api/products/mine/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            {item["crop_name"] for item in response.data["results"]},
            {"Irish potato", "Hidden beans"},
        )

    def test_mine_requires_a_farmer(self):
        self.assertEqual(self.client.get("/api/products/mine/").status_code, 403)
        self.client.force_login(self.buyer)
        self.assertEqual(self.client.get("/api/products/mine/").status_code, 403)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp(prefix="sarura-test-media-"))
class ProductImageTests(MarketplaceTestBase):
    @classmethod
    def tearDownClass(cls):
        media_root = settings.MEDIA_ROOT
        super().tearDownClass()
        shutil.rmtree(media_root, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()
        self.owner = self.make_farmer()
        self.other_farmer = self.make_farmer(email="other@example.com", phone="0788333000")
        self.buyer = self.make_buyer()
        self.product = self.make_product(self.owner)

    def upload(self, **data):
        payload = {"image": make_image(), **data}
        return self.client.post(
            f"/api/products/{self.product.id}/images/", payload, format="multipart"
        )

    def test_owner_uploads_photo_with_fallback_alt_text(self):
        self.client.force_login(self.owner)

        response = self.upload(alt_text="")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["alt_text"], "Irish potato")
        self.assertEqual(response.data["position"], 0)
        image = ProductImage.objects.get(pk=response.data["id"])
        self.assertTrue(image.image.name.startswith(f"products/{self.product.id}/"))
        self.assertNotIn("photo", image.image.name)

    def test_photo_appears_in_detail_and_as_primary_image(self):
        self.client.force_login(self.owner)
        self.upload()

        detail = self.client.get(f"/api/products/{self.product.id}/")
        listing = self.client.get("/api/products/")

        self.assertEqual(len(detail.data["images"]), 1)
        self.assertIsNotNone(detail.data["primary_image"])
        self.assertEqual(
            listing.data["results"][0]["primary_image"], detail.data["primary_image"]
        )

    def test_only_five_photos_allowed(self):
        self.client.force_login(self.owner)
        for _ in range(5):
            self.assertEqual(self.upload().status_code, 201)

        response = self.upload()

        self.assertEqual(response.status_code, 400)
        self.assertIn("at most 5 photos", response.data["detail"])

    def test_wrong_extension_and_header_are_rejected(self):
        self.client.force_login(self.owner)

        text_file = SimpleUploadedFile("notes.txt", b"not an image", content_type="text/plain")
        self.assertEqual(
            self.client.post(
                f"/api/products/{self.product.id}/images/",
                {"image": text_file},
                format="multipart",
            ).status_code,
            400,
        )

        # A GIF renamed to .jpg must fail the header check.
        buffer = BytesIO()
        Image.new("RGB", (10, 10), (255, 0, 0)).save(buffer, format="GIF")
        fake_jpg = SimpleUploadedFile("fake.jpg", buffer.getvalue(), content_type="image/jpeg")
        self.assertEqual(
            self.client.post(
                f"/api/products/{self.product.id}/images/",
                {"image": fake_jpg},
                format="multipart",
            ).status_code,
            400,
        )

    def test_oversized_photo_is_rejected(self):
        self.client.force_login(self.owner)
        oversized = make_oversized_image()
        self.assertGreater(oversized.size, 1024 * 1024)

        response = self.client.post(
            f"/api/products/{self.product.id}/images/",
            {"image": oversized},
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("1 MB", str(response.data))

    def test_only_the_owner_can_upload(self):
        self.client.force_login(self.other_farmer)
        self.assertEqual(self.upload().status_code, 403)

        self.client.force_login(self.buyer)
        self.assertEqual(self.upload().status_code, 403)

    def test_photo_alt_text_and_position_can_be_changed(self):
        self.client.force_login(self.owner)
        image_id = self.upload().data["id"]

        response = self.client.patch(
            f"/api/products/{self.product.id}/images/{image_id}/",
            {"alt_text": "Potatoes in a basket", "position": 2},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["alt_text"], "Potatoes in a basket")
        self.assertEqual(response.data["position"], 2)

    def test_duplicate_position_is_rejected(self):
        self.client.force_login(self.owner)
        self.upload()
        second_id = self.upload().data["id"]

        response = self.client.patch(
            f"/api/products/{self.product.id}/images/{second_id}/",
            {"position": 0},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("position", response.data)

    def test_photo_delete_removes_file(self):
        self.client.force_login(self.owner)
        image_id = self.upload().data["id"]
        image = ProductImage.objects.get(pk=image_id)
        storage = image.image.storage
        name = image.image.name

        response = self.client.delete(f"/api/products/{self.product.id}/images/{image_id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(ProductImage.objects.filter(pk=image_id).exists())
        self.assertFalse(storage.exists(name))


class PublicFarmerProfileTests(MarketplaceTestBase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = self.make_farmer(full_name="Jean Bosco")
        self.buyer = self.make_buyer()
        self.active = self.make_product(self.farmer)
        self.hidden = self.make_product(
            self.farmer, crop_name="Hidden beans", status=Product.Status.HIDDEN
        )

    def test_public_farmer_profile_shows_safe_fields_and_active_listings(self):
        response = self.client.get(f"/api/farmers/{self.farmer.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "Jean Bosco Farm")
        self.assertEqual(response.data["district_name"], "Gasabo")
        self.assertEqual(response.data["verification_label"], "Unverified")
        self.assertFalse(response.data["is_verified_farmer"])
        self.assertEqual(response.data["active_listings_count"], 1)
        self.assertEqual([item["crop_name"] for item in response.data["products"]], ["Irish potato"])

        body = response.content.decode()
        self.assertNotIn(self.farmer.email, body)
        self.assertNotIn(self.farmer.phone, body)

    def test_buyers_and_inactive_farmers_have_no_public_profile(self):
        self.assertEqual(self.client.get(f"/api/farmers/{self.buyer.id}/").status_code, 404)

        self.farmer.is_active = False
        self.farmer.save(update_fields=["is_active"])
        self.assertEqual(self.client.get(f"/api/farmers/{self.farmer.id}/").status_code, 404)

    def test_verified_farmer_badge_uses_named_level(self):
        self.farmer.verification_level = User.VerificationLevel.IDENTITY
        self.farmer.save(update_fields=["verification_level"])

        response = self.client.get(f"/api/farmers/{self.farmer.id}/")

        self.assertTrue(response.data["is_verified_farmer"])
        self.assertEqual(response.data["verification_label"], "Identity reviewed")


class ProductSearchFilterTests(MarketplaceTestBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.northern = Province.objects.create(name="Northern", name_rw="Amajyaruguru")
        cls.musanze = District.objects.create(province=cls.northern, name="Musanze")
        cls.muhoza = Sector.objects.create(district=cls.musanze, name="Muhoza")
        cls.fruits = Category.objects.get(name="Fruits")

    def setUp(self):
        self.client = APIClient()
        self.farmer = self.make_farmer()
        self.identity_farmer = self.make_farmer(
            email="identity@example.com",
            phone="0788333001",
            verification_level=User.VerificationLevel.IDENTITY,
        )
        self.cooperative_farmer = self.make_farmer(
            email="coop@example.com",
            phone="0788333002",
            verification_level=User.VerificationLevel.COOPERATIVE,
        )
        self.account_farmer = self.make_farmer(
            email="account@example.com",
            phone="0788333003",
            verification_level=User.VerificationLevel.ACCOUNT,
        )

        self.potato = self.make_product(self.farmer)
        self.maize = self.make_product(
            self.farmer,
            crop_name="Maize",
            category=self.grains,
            quantity=1000,
            price_per_unit="250.00",
        )
        self.beans = self.make_product(
            self.identity_farmer,
            crop_name="Beans",
            category=self.grains,
            quantity=100,
            price_per_unit="900.00",
            district=self.kicukiro,
            sector=self.gikondo,
        )
        self.carrots = self.make_product(
            self.cooperative_farmer,
            crop_name="Carrots",
            quantity=800,
            price_per_unit="500.00",
            district=self.musanze,
            sector=self.muhoza,
        )
        self.mango = self.make_product(
            self.account_farmer,
            crop_name="Mango",
            category=self.fruits,
            quantity=600,
            price_per_unit="300.00",
        )
        self.make_product(
            self.farmer,
            crop_name="Hidden potatoes",
            price_per_unit="100.00",
            status=Product.Status.HIDDEN,
        )

    def listing_names(self, response):
        self.assertEqual(response.status_code, 200, response.data)
        return [item["crop_name"] for item in response.data["results"]]

    def listing_ids(self, response):
        self.assertEqual(response.status_code, 200, response.data)
        return [item["id"] for item in response.data["results"]]

    def test_search_is_partial_and_case_insensitive(self):
        self.assertEqual(self.listing_names(self.client.get("/api/products/?search=potat")), ["Irish potato"])
        self.assertEqual(self.listing_names(self.client.get("/api/products/?q=MAIZE")), ["Maize"])

    def test_blank_search_is_ignored(self):
        self.assertEqual(len(self.listing_names(self.client.get("/api/products/?search=+++"))), 5)

    def test_filter_by_category(self):
        names = self.listing_names(self.client.get(f"/api/products/?category={self.vegetables.id}"))

        self.assertEqual(set(names), {"Irish potato", "Carrots"})

    def test_filter_by_province_district_and_sector(self):
        kigali = self.listing_names(self.client.get(f"/api/products/?province={self.kigali.id}"))
        self.assertEqual(set(kigali), {"Irish potato", "Maize", "Beans", "Mango"})

        district = self.listing_names(
            self.client.get(f"/api/products/?district={self.kicukiro.id}")
        )
        self.assertEqual(district, ["Beans"])

        sector = self.listing_names(self.client.get(f"/api/products/?sector={self.gikondo.id}"))
        self.assertEqual(sector, ["Beans"])

    def test_filter_by_price_range_and_minimum_quantity(self):
        priced = self.listing_names(
            self.client.get("/api/products/?min_price=300&max_price=500")
        )
        self.assertEqual(set(priced), {"Irish potato", "Carrots", "Mango"})

        quantities = self.listing_names(self.client.get("/api/products/?min_quantity=800"))
        self.assertEqual(set(quantities), {"Maize", "Carrots"})

    def test_verified_filter_uses_identity_or_cooperative_levels(self):
        names = self.listing_names(self.client.get("/api/products/?verified=true"))

        self.assertEqual(set(names), {"Beans", "Carrots"})
        self.assertNotIn("Mango", names)  # Account verified (email only) is not enough.

        account_only = self.listing_names(self.client.get("/api/products/?verified=false"))
        self.assertIn("Mango", account_only)

    def test_filters_can_be_combined(self):
        query = (
            f"/api/products/?category={self.vegetables.id}"
            f"&district={self.gasabo.id}&max_price=400&min_quantity=100&verified=false"
        )

        self.assertEqual(self.listing_names(self.client.get(query)), ["Irish potato"])

    def test_hidden_listings_never_appear_in_filtered_results(self):
        names = self.listing_names(self.client.get("/api/products/?search=potato"))

        self.assertEqual(names, ["Irish potato"])

    def test_invalid_query_parameters_return_400(self):
        for query, field in [
            ("sort=cheapest", "sort"),
            ("min_price=500&max_price=100", "max_price"),
            ("min_price=abc", "min_price"),
            ("min_quantity=-1", "min_quantity"),
            ("verified=maybe", "verified"),
            ("category=999999", "category"),
            ("province=999999", "province"),
            ("district=999999", "district"),
            ("sector=999999", "sector"),
            ("near=999999", "near"),
        ]:
            response = self.client.get(f"/api/products/?{query}")
            self.assertEqual(response.status_code, 400, query)
            self.assertIn(field, response.data, query)


class ProductSortTests(MarketplaceTestBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.northern = Province.objects.create(name="Northern", name_rw="Amajyaruguru")
        cls.musanze = District.objects.create(province=cls.northern, name="Musanze")
        cls.muhoza = Sector.objects.create(district=cls.musanze, name="Muhoza")

    def setUp(self):
        self.client = APIClient()
        self.farmer = self.make_farmer()
        self.potato = self.make_product(self.farmer, price_per_unit="380.00")
        self.maize = self.make_product(
            self.farmer, crop_name="Maize", category=self.grains, price_per_unit="250.00"
        )
        self.beans = self.make_product(
            self.farmer,
            crop_name="Beans",
            category=self.grains,
            price_per_unit="900.00",
            district=self.kicukiro,
            sector=self.gikondo,
        )
        self.carrots = self.make_product(
            self.farmer,
            crop_name="Carrots",
            price_per_unit="500.00",
            district=self.musanze,
            sector=self.muhoza,
        )
        self.mango = self.make_product(
            self.farmer,
            crop_name="Mango",
            category=Category.objects.get(name="Fruits"),
            price_per_unit="300.00",
        )

        now = timezone.now()
        for product, minutes in [
            (self.potato, 50),
            (self.maize, 40),
            (self.beans, 30),
            (self.carrots, 20),
            (self.mango, 10),
        ]:
            Product.objects.filter(pk=product.pk).update(
                created_at=now - timedelta(minutes=minutes)
            )

    def names(self, query=""):
        response = self.client.get(f"/api/products/{query}")
        self.assertEqual(response.status_code, 200, response.data)
        return [item["crop_name"] for item in response.data["results"]]

    def test_newest_is_the_default_sort(self):
        expected = ["Mango", "Carrots", "Beans", "Maize", "Irish potato"]
        self.assertEqual(self.names(), expected)
        self.assertEqual(self.names("?sort=newest"), expected)

    def test_sort_by_lowest_price(self):
        self.assertEqual(
            self.names("?sort=price"),
            ["Maize", "Mango", "Irish potato", "Carrots", "Beans"],
        )

    def test_nearest_groups_same_district_then_province_then_rest(self):
        self.assertEqual(
            self.names(f"?sort=nearest&near={self.gasabo.id}"),
            ["Mango", "Maize", "Irish potato", "Beans", "Carrots"],
        )

    def test_nearest_uses_logged_in_users_district_when_near_is_absent(self):
        buyer = self.make_buyer()
        self.client.force_login(buyer)

        self.assertEqual(
            self.names("?sort=nearest"),
            ["Mango", "Maize", "Irish potato", "Beans", "Carrots"],
        )

    def test_nearest_falls_back_to_newest_without_a_location(self):
        self.assertEqual(self.names("?sort=nearest"), self.names("?sort=newest"))

        no_location = self.make_buyer(
            email="nolocation@example.com",
            phone="0788444000",
            district=None,
            sector=None,
            province=None,
        )
        self.client.force_login(no_location)
        self.assertEqual(self.names("?sort=nearest"), self.names("?sort=newest"))

    def test_nearest_from_another_province(self):
        self.assertEqual(
            self.names(f"?sort=nearest&near={self.musanze.id}"),
            ["Carrots", "Mango", "Beans", "Maize", "Irish potato"],
        )


class ProductPaginationTests(MarketplaceTestBase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = self.make_farmer()

    def test_twenty_five_active_listings_are_split_into_twenty_four_and_one(self):
        for index in range(25):
            self.make_product(self.farmer, crop_name=f"Crop {index:02d}")
        self.make_product(self.farmer, crop_name="Sold crop", status=Product.Status.SOLD)

        first = self.client.get("/api/products/")
        second = self.client.get("/api/products/?page=2")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["count"], 25)
        self.assertEqual(len(first.data["results"]), 24)
        self.assertIsNotNone(first.data["next"])
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["count"], 25)
        self.assertEqual(len(second.data["results"]), 1)
        self.assertIsNone(second.data["next"])

    def test_page_out_of_range_returns_404(self):
        self.assertEqual(self.client.get("/api/products/?page=99").status_code, 404)
