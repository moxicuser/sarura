from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from core.models import District, Province, Sector


class HealthCheckTests(TestCase):
    def test_health_check_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "ok"})


class SeedLocationsTests(TestCase):
    def test_seed_loads_full_official_structure(self):
        call_command("seed_locations", stdout=StringIO())

        self.assertEqual(Province.objects.count(), 5)
        self.assertEqual(District.objects.count(), 30)
        self.assertEqual(Sector.objects.count(), 415)

        # A known chain from docs/data/rwanda-sectors.json.
        kigali = Province.objects.get(name="City of Kigali")
        gasabo = District.objects.get(province=kigali, name="Gasabo")
        self.assertTrue(Sector.objects.filter(district=gasabo, name="Kimironko").exists())

    def test_seed_is_idempotent(self):
        call_command("seed_locations", stdout=StringIO())
        counts = (
            Province.objects.count(),
            District.objects.count(),
            Sector.objects.count(),
        )

        call_command("seed_locations", stdout=StringIO())

        self.assertEqual(
            counts,
            (
                Province.objects.count(),
                District.objects.count(),
                Sector.objects.count(),
            ),
        )


class LocationApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.kigali = Province.objects.create(
            name="City of Kigali", name_rw="Umujyi wa Kigali"
        )
        cls.northern = Province.objects.create(name="Northern", name_rw="Amajyaruguru")
        cls.gasabo = District.objects.create(province=cls.kigali, name="Gasabo")
        cls.kicukiro = District.objects.create(province=cls.kigali, name="Kicukiro")
        cls.musanze = District.objects.create(province=cls.northern, name="Musanze")
        cls.kimironko = Sector.objects.create(district=cls.gasabo, name="Kimironko")
        cls.gikondo = Sector.objects.create(district=cls.kicukiro, name="Gikondo")
        cls.muhoza = Sector.objects.create(district=cls.musanze, name="Muhoza")

    def test_provinces_are_public_and_not_paginated(self):
        response = self.client.get("/api/locations/provinces/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {"id": self.kigali.id, "name": "City of Kigali", "name_rw": "Umujyi wa Kigali"},
                {"id": self.northern.id, "name": "Northern", "name_rw": "Amajyaruguru"},
            ],
        )

    def test_districts_follow_the_selected_province(self):
        response = self.client.get(f"/api/locations/districts/?province={self.kigali.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [district["name"] for district in response.json()], ["Gasabo", "Kicukiro"]
        )
        self.assertTrue(
            all(item["province_id"] == self.kigali.id for item in response.json())
        )

    def test_sectors_require_a_valid_district(self):
        response = self.client.get(f"/api/locations/sectors/?district={self.gasabo.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [{"id": self.kimironko.id, "name": "Kimironko", "district_id": self.gasabo.id}],
        )

        self.assertEqual(self.client.get("/api/locations/sectors/").status_code, 400)
        self.assertEqual(
            self.client.get("/api/locations/sectors/?district=999999").status_code,
            400,
        )

    def test_invalid_location_query_returns_400(self):
        response = self.client.get("/api/locations/districts/?province=999999")

        self.assertEqual(response.status_code, 400)
        self.assertIn("province", response.json())
