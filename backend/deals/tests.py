"""Step 10: purchase requests, negotiation and order creation rules."""

import json
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from core.models import District, Province
from deals.models import Offer, Order, OrderEvent, PurchaseRequest
from marketplace.models import Category, Product


class DealsTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.province = Province.objects.create(name="City of Kigali", name_rw="Umujyi wa Kigali")
        cls.district = District.objects.create(province=cls.province, name="Gasabo")
        cls.category = Category.objects.get(name="Vegetables")

        cls.farmer = cls.make_user("farmer@deals.test", "0788111001", is_farmer=True)
        cls.buyer = cls.make_user("buyer@deals.test", "0788222002", is_buyer=True)
        cls.other_buyer = cls.make_user("other@deals.test", "0788333003", is_buyer=True)
        cls.dual = cls.make_user(
            "dual@deals.test", "0788444004", is_buyer=True, is_farmer=True
        )
        cls.product = cls.make_product(cls.farmer)

    @classmethod
    def make_user(cls, email, phone, **roles):
        return User.objects.create_user(
            email=email,
            password="StrongPass123!",
            full_name=email.split("@")[0].title(),
            phone=phone,
            province=cls.province,
            district=cls.district,
            **roles,
        )

    @classmethod
    def make_product(cls, farmer, **overrides):
        defaults = {
            "farmer": farmer,
            "category": cls.category,
            "crop_name": "Irish potato",
            "quantity": 500,
            "price_per_unit": "380.00",
            "district": cls.district,
            "status": Product.Status.ACTIVE,
        }
        defaults.update(overrides)
        return Product.objects.create(**defaults)

    def post_json(self, path, data=None):
        return self.client.post(
            path,
            data=json.dumps(data or {}),
            content_type="application/json",
        )

    def request_payload(self, **overrides):
        data = {
            "product": self.product.id,
            "quantity": 100,
            "offered_price": "400.00",
            "message": "Please confirm the harvest date.",
        }
        data.update(overrides)
        return data

    def open_request(self):
        self.client.force_login(self.buyer)
        response = self.post_json("/api/deals/requests/", self.request_payload())
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()


class PurchaseRequestTests(DealsTestBase):
    def test_buyer_creates_request_and_only_participants_can_read_it(self):
        created = self.open_request()
        self.assertEqual(created["status"], "pending")
        self.assertEqual(created["buyer"]["id"], self.buyer.id)
        self.assertEqual(created["current_terms"]["source"], "request")
        self.assertEqual(created["current_terms"]["offered_price"], "400.00")
        self.assertTrue(created["can_cancel"])
        self.assertTrue(created["can_accept"] is False)

        detail_url = f"/api/deals/requests/{created['id']}/"
        self.assertEqual(self.client.get(detail_url).status_code, 200)

        self.client.force_login(self.other_buyer)
        self.assertEqual(self.client.get(detail_url).status_code, 403)

        self.client.force_login(self.farmer)
        farmer_detail = self.client.get(detail_url)
        self.assertEqual(farmer_detail.status_code, 200)
        self.assertTrue(farmer_detail.json()["can_accept"])
        self.assertTrue(farmer_detail.json()["can_counter"])

    def test_lists_are_private_and_can_be_filtered_by_product_and_side(self):
        created = self.open_request()

        listing = self.client.get("/api/deals/requests/").json()
        self.assertEqual(listing["count"], 1)
        self.assertEqual(listing["results"][0]["viewer_side"], "buying")

        self.client.force_login(self.farmer)
        incoming = self.client.get("/api/deals/requests/?side=selling").json()
        self.assertEqual(incoming["count"], 1)
        self.assertEqual(incoming["results"][0]["viewer_side"], "selling")

        filtered = self.client.get(f"/api/deals/requests/?product={self.product.id}").json()
        self.assertEqual(filtered["count"], 1)
        self.assertEqual(
            self.client.get("/api/deals/requests/?product=99999").json()["count"], 0
        )

        self.client.force_login(self.other_buyer)
        self.assertEqual(self.client.get("/api/deals/requests/").json()["count"], 0)
        self.assertEqual(created["buyer"]["id"], self.buyer.id)

    def test_validation_blocks_over_quantity_duplicates_own_and_inactive_listings(self):
        self.client.force_login(self.buyer)
        over = self.post_json(
            "/api/deals/requests/", self.request_payload(quantity=600)
        )
        self.assertEqual(over.status_code, 400)
        self.assertIn("quantity", over.json())

        self.open_request()
        duplicate = self.post_json("/api/deals/requests/", self.request_payload())
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("detail", duplicate.json())

        self.client.force_login(self.farmer)
        farmer_request = self.post_json("/api/deals/requests/", self.request_payload())
        self.assertEqual(farmer_request.status_code, 403)

        own_product = self.make_product(self.dual, crop_name="Own potato")
        self.client.force_login(self.dual)
        own = self.post_json(
            "/api/deals/requests/", self.request_payload(product=own_product.id)
        )
        self.assertEqual(own.status_code, 400)
        self.assertIn("product", own.json())

        hidden = self.make_product(self.farmer, crop_name="Hidden potato", status="hidden")
        self.client.force_login(self.buyer)
        hidden_request = self.post_json(
            "/api/deals/requests/", self.request_payload(product=hidden.id)
        )
        self.assertEqual(hidden_request.status_code, 400)
        self.assertIn("product", hidden_request.json())

    def test_unauthenticated_request_is_forbidden(self):
        response = self.post_json("/api/deals/requests/", self.request_payload())
        self.assertEqual(response.status_code, 403)


class NegotiationTests(DealsTestBase):
    def test_farmer_accept_creates_order_event_and_reduces_stock(self):
        created = self.open_request()

        self.client.force_login(self.farmer)
        accepted = self.post_json(
            f"/api/deals/requests/{created['id']}/accept/"
        )
        self.assertEqual(accepted.status_code, 201, accepted.content)
        order = accepted.json()
        self.assertEqual(order["status"], "confirmed")
        self.assertEqual(order["quantity"], 100)
        self.assertEqual(order["unit_price"], "400.00")
        self.assertEqual(order["buyer"]["id"], self.buyer.id)
        self.assertEqual(len(order["events"]), 1)
        self.assertEqual(order["events"][0]["actor"]["id"], self.farmer.id)
        self.assertEqual(order["events"][0]["from_status"], None)

        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 400)
        request_row = PurchaseRequest.objects.get(pk=created["id"])
        self.assertEqual(request_row.status, PurchaseRequest.Status.ACCEPTED)
        self.assertEqual(request_row.accepted_by_id, self.farmer.id)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderEvent.objects.count(), 1)

        again = self.post_json(f"/api/deals/requests/{created['id']}/accept/")
        self.assertEqual(again.status_code, 400)

    def test_counter_is_recorded_and_buyer_accept_creates_order(self):
        created = self.open_request()
        request_id = created["id"]

        self.client.force_login(self.farmer)
        counter = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {
                "quantity": 120,
                "offered_price": "450.00",
                "message": "Only 120 kg ready this week.",
            },
        )
        self.assertEqual(counter.status_code, 201, counter.content)
        offer_id = counter.json()["id"]
        self.assertEqual(counter.json()["status"], "pending")
        self.assertEqual(Offer.objects.count(), 1)

        request_row = PurchaseRequest.objects.get(pk=request_id)
        self.assertEqual(request_row.status, PurchaseRequest.Status.NEGOTIATING)

        farmer_accept = self.post_json(f"/api/deals/requests/{request_id}/accept/")
        self.assertEqual(farmer_accept.status_code, 400)

        self.client.force_login(self.buyer)
        detail = self.client.get(f"/api/deals/requests/{request_id}/").json()
        self.assertEqual(detail["current_terms"]["source"], "offer")
        self.assertEqual(detail["current_terms"]["offer_id"], offer_id)
        self.assertTrue(detail["can_accept"])
        self.assertFalse(detail["can_counter"])

        accepted = self.post_json(f"/api/deals/requests/{request_id}/accept/")
        self.assertEqual(accepted.status_code, 201, accepted.content)
        self.assertEqual(accepted.json()["quantity"], 120)
        self.assertEqual(accepted.json()["unit_price"], "450.00")
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 380)

        offer = Offer.objects.get(pk=offer_id)
        self.assertEqual(offer.status, Offer.Status.ACCEPTED)
        self.assertIsNotNone(offer.decided_at)

    def test_new_counter_supersedes_pending_offer_and_requires_changed_terms(self):
        created = self.open_request()
        request_id = created["id"]
        self.client.force_login(self.farmer)

        first = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {"quantity": 120, "offered_price": "450.00"},
        )
        self.assertEqual(first.status_code, 201)

        same = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {"quantity": 120, "offered_price": "450.00"},
        )
        self.assertEqual(same.status_code, 400)
        self.assertIn("detail", same.json())

        second = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {"quantity": 150, "offered_price": "430.00"},
        )
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(
            Offer.objects.get(pk=first.json()["id"]).status, Offer.Status.SUPERSEDED
        )
        self.assertEqual(Offer.objects.count(), 2)

        self.client.force_login(self.buyer)
        detail = self.client.get(f"/api/deals/requests/{request_id}/").json()
        self.assertEqual(detail["current_terms"]["offer_id"], second.json()["id"])

    def test_role_checks_on_negotiation_actions(self):
        created = self.open_request()
        request_id = created["id"]

        counter = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {"quantity": 120, "offered_price": "450.00"},
        )
        self.assertEqual(counter.status_code, 403)

        farmer_accept = self.post_json(f"/api/deals/requests/{request_id}/accept/")
        self.assertEqual(farmer_accept.status_code, 400)

        self.client.force_login(self.other_buyer)
        outsider = self.post_json(f"/api/deals/requests/{request_id}/counter/")
        self.assertEqual(outsider.status_code, 403)

        self.client.force_login(self.farmer)
        counter = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {"quantity": 120, "offered_price": "450.00"},
        )
        self.assertEqual(counter.status_code, 201)

    def test_reject_and_cancel_close_the_request_and_record_the_actor(self):
        created = self.open_request()
        request_id = created["id"]

        self.client.force_login(self.farmer)
        rejected = self.post_json(
            f"/api/deals/requests/{request_id}/reject/",
            {"message": "Harvest was damaged."},
        )
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(rejected.json()["status"], "rejected")
        self.assertEqual(rejected.json()["status_note"], "Harvest was damaged.")
        self.assertEqual(rejected.json()["status_changed_by"]["id"], self.farmer.id)

        # A closed request frees the buyer to open a new one.
        self.client.force_login(self.buyer)
        again = self.post_json("/api/deals/requests/", self.request_payload())
        self.assertEqual(again.status_code, 201)

        cancelled = self.post_json(
            f"/api/deals/requests/{again.json()['id']}/cancel/",
            {"message": "Found another supplier."},
        )
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.json()["status"], "cancelled")
        self.assertEqual(cancelled.json()["status_note"], "Found another supplier.")

        after_close = self.post_json(f"/api/deals/requests/{request_id}/accept/")
        self.assertEqual(after_close.status_code, 400)

    def test_expired_counter_closes_request_and_allows_a_new_one(self):
        created = self.open_request()
        request_id = created["id"]
        self.client.force_login(self.farmer)
        counter = self.post_json(
            f"/api/deals/requests/{request_id}/counter/",
            {
                "quantity": 120,
                "offered_price": "450.00",
                "expires_at": (timezone.now() + timedelta(hours=1)).isoformat(),
            },
        )
        self.assertEqual(counter.status_code, 201)
        Offer.objects.filter(pk=counter.json()["id"]).update(
            expires_at=timezone.now() - timedelta(minutes=1)
        )

        self.client.force_login(self.buyer)
        expired_accept = self.post_json(f"/api/deals/requests/{request_id}/accept/")
        self.assertEqual(expired_accept.status_code, 400)
        self.assertEqual(
            PurchaseRequest.objects.get(pk=request_id).status,
            PurchaseRequest.Status.EXPIRED,
        )

        fresh = self.post_json("/api/deals/requests/", self.request_payload())
        self.assertEqual(fresh.status_code, 201, fresh.content)

    def test_past_expiry_is_rejected_when_counter_is_created(self):
        created = self.open_request()
        self.client.force_login(self.farmer)
        response = self.post_json(
            f"/api/deals/requests/{created['id']}/counter/",
            {
                "quantity": 120,
                "offered_price": "450.00",
                "expires_at": (timezone.now() - timedelta(minutes=1)).isoformat(),
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("expires_at", response.json())

    def test_message_is_stored_as_plain_text(self):
        created = self.open_request()
        self.client.post(f"/api/deals/requests/{created['id']}/cancel/", {})
        response = self.post_json(
            "/api/deals/requests/",
            self.request_payload(message="<script>alert(1)</script>"),
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["message"], "<script>alert(1)</script>")


class OrderVisibilityTests(DealsTestBase):
    def test_orders_are_visible_only_to_the_two_parties(self):
        created = self.open_request()
        self.client.force_login(self.farmer)
        self.assertEqual(
            self.post_json(f"/api/deals/requests/{created['id']}/accept/").status_code, 201
        )
        order_id = Order.objects.get().id

        buyer_list = self.client.get("/api/deals/orders/").json()
        self.assertEqual(buyer_list["count"], 1)
        self.assertEqual(buyer_list["results"][0]["id"], order_id)

        self.client.force_login(self.farmer)
        farmer_list = self.client.get("/api/deals/orders/").json()
        self.assertEqual(farmer_list["count"], 1)

        detail = self.client.get(f"/api/deals/orders/{order_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.json()["events"]), 1)

        self.client.force_login(self.other_buyer)
        self.assertEqual(self.client.get("/api/deals/orders/").json()["count"], 0)
        self.assertEqual(self.client.get(f"/api/deals/orders/{order_id}/").status_code, 403)
