from io import StringIO
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import ContactMessage, District, Province, Sector
from core.throttles import ContactRateThrottle


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


class ContactMessageTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.payload = {
            "name": "Aline Uwase",
            "email": "aline@example.com",
            "subject": "Question about beans",
            "message": "Do you have beans available in Kigali?",
        }

    def test_public_visitor_can_send_a_message_and_admin_is_emailed(self):
        response = self.client.post("/api/contact/", self.payload)

        self.assertEqual(response.status_code, 201)
        self.assertIn("received", response.data["detail"])

        message = ContactMessage.objects.get()
        self.assertEqual(message.name, "Aline Uwase")
        self.assertEqual(message.email, "aline@example.com")
        self.assertEqual(message.subject, "Question about beans")
        self.assertFalse(message.handled)

        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.subject, "[SARURA contact] Question about beans")
        self.assertEqual(email.to, ["hello@sarura.rw"])
        self.assertIn("Aline Uwase <aline@example.com>", email.body)
        self.assertIn("Do you have beans available", email.body)

    def test_invalid_fields_are_rejected_and_nothing_is_saved(self):
        response = self.client.post(
            "/api/contact/",
            {**self.payload, "email": "not-an-email", "message": "   "},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertIn("message", response.data)
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_hidden_spam_trap_drops_the_message_silently(self):
        response = self.client.post(
            "/api/contact/", {**self.payload, "website": "https://spam.example"}
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_contact_details_are_trimmed(self):
        self.client.post(
            "/api/contact/",
            {**self.payload, "name": "  Aline  ", "subject": "  Beans  "},
        )

        message = ContactMessage.objects.get()
        self.assertEqual(message.name, "Aline")
        self.assertEqual(message.subject, "Beans")

    @mock.patch.object(ContactRateThrottle, "rate", "2/hour", create=True)
    def test_rate_limit_blocks_after_the_configured_number_of_messages(self):
        self.assertEqual(self.client.post("/api/contact/", self.payload).status_code, 201)
        self.assertEqual(self.client.post("/api/contact/", self.payload).status_code, 201)

        blocked = self.client.post("/api/contact/", self.payload)

        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(ContactMessage.objects.count(), 2)
        self.assertEqual(len(mail.outbox), 2)
