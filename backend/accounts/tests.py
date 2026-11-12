"""Tests for Step 3: accounts, roles, profiles, verification and permissions."""

import re
from unittest import mock

from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient, APIRequestFactory

from accounts.models import BuyerProfile, FarmerProfile, User
from accounts.permissions import IsBuyer, IsFarmer, IsOwner
from accounts.throttles import (
    LoginRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)
from core.models import District, Province, Sector


def make_locations():
    kigali = Province.objects.create(name="Kigali City", name_rw="Umujyi wa Kigali")
    gasabo = District.objects.create(province=kigali, name="Gasabo")
    kicukiro = District.objects.create(province=kigali, name="Kicukiro")
    kimironko = Sector.objects.create(district=gasabo, name="Kimironko")
    gikondo = Sector.objects.create(district=kicukiro, name="Gikondo")
    eastern = Province.objects.create(name="Eastern Province", name_rw="Intara y'Iburasirazuba")
    bugesera = District.objects.create(province=eastern, name="Bugesera")
    return {
        "kigali": kigali,
        "gasabo": gasabo,
        "kicukiro": kicukiro,
        "kimironko": kimironko,
        "gikondo": gikondo,
        "eastern": eastern,
        "bugesera": bugesera,
    }


class AccountTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.loc = make_locations()

    def setUp(self):
        # Throttle counters live in the cache, not the database, so clear them
        # before every test. Otherwise repeated logins across the suite would
        # hit the limiter and make unrelated tests fail.
        cache.clear()

    def register_payload(self, **overrides):
        data = {
            "email": "aline@example.com",
            "full_name": "Aline Uwase",
            "phone": "0788123456",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "is_buyer": True,
            "is_farmer": False,
            "province": self.loc["kigali"].id,
            "district": self.loc["gasabo"].id,
            "sector": self.loc["kimironko"].id,
            "cell": "Bibare",
            "language": "rw",
        }
        data.update(overrides)
        return data

    def make_user(self, email="farmer@example.com", phone="0722000000", **extra):
        defaults = {
            "full_name": "Jean Farmer",
            "is_farmer": True,
            "is_buyer": False,
            "province": self.loc["kigali"],
            "district": self.loc["gasabo"],
            "sector": self.loc["kimironko"],
        }
        defaults.update(extra)
        user = User.objects.create_user(
            email=email, password="StrongPass123!", phone=phone, **defaults
        )
        if user.is_farmer:
            FarmerProfile.objects.create(user=user)
        if user.is_buyer:
            BuyerProfile.objects.create(user=user)
        return user


class RegistrationTests(AccountTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def test_farmer_registration_creates_profile_and_logs_in(self):
        response = self.client.post(
            "/api/auth/register/", self.register_payload(is_buyer=False, is_farmer=True), format="json"
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["is_farmer"])
        self.assertFalse(response.data["is_buyer"])
        self.assertEqual(response.data["verification_level"], "unverified")
        self.assertTrue(FarmerProfile.objects.filter(user_id=response.data["id"]).exists())
        self.assertFalse(BuyerProfile.objects.filter(user_id=response.data["id"]).exists())

        # Auto-login: the session can now read the profile.
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "aline@example.com")

        # A verification email was sent.
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Verify your SARURA email", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ["aline@example.com"])

    def test_verification_link_from_registration_email_still_works(self):
        # Registering signs the user in immediately. The token in the welcome
        # email must survive that login (it hashes last_login), so the link
        # they open from their inbox is valid.
        response = self.client.post(
            "/api/auth/register/",
            self.register_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

        match = re.search(
            r"/verify-email\?uid=([^&]+)&token=([\w-]+)", mail.outbox[0].body
        )
        self.assertIsNotNone(match)

        verify = self.client.get(f"/api/auth/verify-email/?uid={match.group(1)}&token={match.group(2)}")
        self.assertEqual(verify.status_code, 200, verify.data)
        self.assertEqual(verify.data["user"]["verification_level"], "account")

    def test_dual_role_registration_creates_both_profiles(self):
        response = self.client.post(
            "/api/auth/register/",
            self.register_payload(
                is_buyer=True,
                is_farmer=True,
                farm_name="Uwase Farm",
                business_name="Uwase Fresh Ltd",
                buyer_type="company",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["is_farmer"])
        self.assertTrue(response.data["is_buyer"])
        self.assertEqual(response.data["farmer_profile"]["farm_name"], "Uwase Farm")
        self.assertEqual(response.data["buyer_profile"]["business_name"], "Uwase Fresh Ltd")
        self.assertEqual(response.data["buyer_profile"]["buyer_type"], "company")

    def test_registration_requires_at_least_one_role(self):
        response = self.client.post(
            "/api/auth/register/",
            self.register_payload(is_buyer=False, is_farmer=False),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("roles", response.data)

    def test_registration_rejects_district_from_another_province(self):
        response = self.client.post(
            "/api/auth/register/",
            self.register_payload(district=self.loc["bugesera"].id, sector=None),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("district", response.data)

    def test_registration_rejects_sector_from_another_district(self):
        response = self.client.post(
            "/api/auth/register/",
            self.register_payload(sector=self.loc["gikondo"].id),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("sector", response.data)

    def test_registration_rejects_duplicate_email_case_insensitively(self):
        self.make_user(email="aline@example.com")

        response = self.client.post(
            "/api/auth/register/",
            self.register_payload(email="ALINE@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_phone_is_normalized_and_duplicates_are_rejected(self):
        first = self.client.post(
            "/api/auth/register/",
            self.register_payload(phone="0788123456"),
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(User.objects.get(pk=first.data["id"]).phone, "+250788123456")

        second = self.client.post(
            "/api/auth/register/",
            self.register_payload(email="other@example.com", phone="+250 788 123 456"),
            format="json",
        )
        self.assertEqual(second.status_code, 400)
        self.assertIn("phone", second.data)


class LoginLogoutTests(AccountTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user = self.make_user()

    def test_login_me_logout_flow(self):
        login = self.client.post(
            "/api/auth/login/",
            {"email": "farmer@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)
        self.assertEqual(login.data["email"], "farmer@example.com")

        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)

        logout = self.client.post("/api/auth/logout/")
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_login_rejects_wrong_password(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "farmer@example.com", "password": "WrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

    def test_login_rejects_inactive_account(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            "/api/auth/login/",
            {"email": "farmer@example.com", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)


class ProfileTests(AccountTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user = self.make_user()
        self.client.force_login(self.user)

    def test_patch_profile_updates_person_and_farm_details(self):
        response = self.client.patch(
            "/api/auth/me/",
            {
                "full_name": "Jean Bosco",
                "cell": "Nyabisindu",
                "district": self.loc["kicukiro"].id,
                "sector": self.loc["gikondo"].id,
                "farmer_profile": {"farm_name": "Nyabisindu Farm", "about": "Maize and beans."},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Jean Bosco")
        self.assertEqual(self.user.district, self.loc["kicukiro"])
        self.assertEqual(self.user.sector, self.loc["gikondo"])
        self.assertEqual(self.user.farmer_profile.farm_name, "Nyabisindu Farm")
        self.assertIn("Gikondo", response.data["location_label"])

    def test_patch_profile_rejects_sector_from_another_district(self):
        response = self.client.patch(
            "/api/auth/me/",
            {"sector": self.loc["gikondo"].id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("sector", response.data)

    def test_me_requires_login(self):
        self.client.logout()
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)


class EmailVerificationTests(AccountTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user = self.make_user()

    def token_for(self, user):
        return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)

    def test_verify_email_promotes_account_level(self):
        uid, token = self.token_for(self.user)

        response = self.client.get("/api/auth/verify-email/", {"uid": uid, "token": token})

        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.email_verified_at)
        self.assertEqual(self.user.verification_level, User.VerificationLevel.ACCOUNT)

    def test_verify_email_rejects_bad_token(self):
        uid, _ = self.token_for(self.user)

        response = self.client.get("/api/auth/verify-email/", {"uid": uid, "token": "bad-token"})

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.email_verified_at)

    def test_verify_email_does_not_downgrade_identity_reviewed(self):
        self.user.verification_level = User.VerificationLevel.IDENTITY
        self.user.save(update_fields=["verification_level"])
        uid, token = self.token_for(self.user)

        response = self.client.get("/api/auth/verify-email/", {"uid": uid, "token": token})

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.verification_level, User.VerificationLevel.IDENTITY)

    def test_resend_verification_requires_login_and_sends_mail(self):
        self.assertEqual(self.client.post("/api/auth/verify-email/resend/").status_code, 403)

        self.client.force_login(self.user)
        response = self.client.post("/api/auth/verify-email/resend/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)


class PasswordResetTests(AccountTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.user = self.make_user()

    def test_request_does_not_reveal_whether_account_exists(self):
        unknown = self.client.post(
            "/api/auth/password-reset/", {"email": "nobody@example.com"}, format="json"
        )
        known = self.client.post(
            "/api/auth/password-reset/", {"email": "farmer@example.com"}, format="json"
        )

        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.status_code, 200)
        self.assertEqual(unknown.data, known.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Reset your SARURA password", mail.outbox[0].subject)

    def test_confirm_sets_new_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "NewStrongPass456!",
                "new_password_confirm": "NewStrongPass456!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass456!"))

    def test_confirm_rejects_bad_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": "bad-token",
                "new_password": "NewStrongPass456!",
                "new_password_confirm": "NewStrongPass456!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("StrongPass123!"))


class PermissionClassTests(AccountTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.farmer = self.make_user()
        self.buyer = self.make_user(
            email="buyer@example.com",
            phone="0733000000",
            is_farmer=False,
            is_buyer=True,
        )

    def request(self, user):
        request = self.factory.get("/")
        request.user = user
        return request

    def test_is_farmer(self):
        self.assertTrue(IsFarmer().has_permission(self.request(self.farmer), None))
        self.assertFalse(IsFarmer().has_permission(self.request(self.buyer), None))

    def test_is_buyer(self):
        self.assertTrue(IsBuyer().has_permission(self.request(self.buyer), None))
        self.assertFalse(IsBuyer().has_permission(self.request(self.farmer), None))

    def test_dual_role_user_passes_both(self):
        dual = self.make_user(email="dual@example.com", phone="0744000000", is_buyer=True)
        self.assertTrue(IsFarmer().has_permission(self.request(dual), None))
        self.assertTrue(IsBuyer().has_permission(self.request(dual), None))

    def test_is_owner(self):
        request = self.request(self.farmer)
        self.assertTrue(IsOwner().has_object_permission(request, None, self.farmer.farmer_profile))
        self.assertFalse(IsOwner().has_object_permission(request, None, self.buyer.buyer_profile))

    def test_unauthenticated_requests_are_rejected(self):
        request = self.request(AnonymousUser())
        self.assertFalse(IsFarmer().has_permission(request, None))
        self.assertFalse(IsBuyer().has_permission(request, None))


class VerificationLadderModelTests(AccountTestCase):
    def test_only_identity_or_cooperative_counts_as_verified_farmer(self):
        user = self.make_user()
        self.assertFalse(user.is_verified_farmer)

        user.email_verified_at = user.date_joined
        user.verification_level = User.VerificationLevel.ACCOUNT
        user.save(update_fields=["email_verified_at", "verification_level"])
        self.assertFalse(user.is_verified_farmer)

        user.verification_level = User.VerificationLevel.IDENTITY
        user.save(update_fields=["verification_level"])
        self.assertTrue(user.is_verified_farmer)

        user.verification_level = User.VerificationLevel.COOPERATIVE
        user.save(update_fields=["verification_level"])
        self.assertTrue(user.is_verified_farmer)


class AuthThrottleTests(AccountTestCase):
    """Guide section 7: rate-limit login, registration and password reset."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def test_login_is_rate_limited_per_ip(self):
        with mock.patch.object(LoginRateThrottle, "get_rate", return_value="2/min"):
            first = self.client.post(
                "/api/auth/login/",
                {"email": "farmer@example.com", "password": "WrongPass123!"},
                format="json",
            )
            second = self.client.post(
                "/api/auth/login/",
                {"email": "farmer@example.com", "password": "WrongPass123!"},
                format="json",
            )
            blocked = self.client.post(
                "/api/auth/login/",
                {"email": "farmer@example.com", "password": "WrongPass123!"},
                format="json",
            )

        self.assertEqual(first.status_code, 400)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("detail", blocked.data)

    def test_registration_is_rate_limited_per_ip(self):
        with mock.patch.object(RegisterRateThrottle, "get_rate", return_value="1/hour"):
            first = self.client.post(
                "/api/auth/register/",
                self.register_payload(is_buyer=True, is_farmer=False),
                format="json",
            )
            blocked = self.client.post(
                "/api/auth/register/",
                self.register_payload(
                    email="second@example.com", phone="0733000000", is_farmer=True
                ),
                format="json",
            )

        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(blocked.status_code, 429)

    def test_password_reset_is_rate_limited_per_ip(self):
        with mock.patch.object(
            PasswordResetRateThrottle, "get_rate", return_value="1/hour"
        ):
            first = self.client.post(
                "/api/auth/password-reset/",
                {"email": "farmer@example.com"},
                format="json",
            )
            blocked = self.client.post(
                "/api/auth/password-reset/",
                {"email": "farmer@example.com"},
                format="json",
            )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(blocked.status_code, 429)
