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
