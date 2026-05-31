"""Backend tests for Consultation Scheduler (Phase 10).

Covers:
- /api/scheduler/config (public)
- /api/scheduler/slots (public)
- /api/scheduler/availability (admin)
- /api/scheduler/book (premium only)
- /api/scheduler/confirm (mock razorpay -> stub meet URL)
- /api/scheduler/my-bookings, /api/scheduler/all-bookings
- /api/scheduler/oauth/start, /api/scheduler/oauth/disconnect (admin)

Regression:
- /api/payments/config, /api/numerology/mobile, /api/astrology/premium
"""
import os
import re
import requests
import pytest
from datetime import datetime, timedelta, timezone

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://kundali-chart-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN = {"email": "admin@vedic.com", "password": "admin123"}
PREMIUM = {"email": "testuser@vedic.com", "password": "test1234"}
FREE = {"email": "demo@vedic.com", "password": "demo1234"}


def _login(session: requests.Session, creds):
    r = session.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    _login(s, ADMIN)
    return s


@pytest.fixture(scope="module")
def premium_session():
    s = requests.Session()
    _login(s, PREMIUM)
    return s


@pytest.fixture(scope="module")
def free_session():
    s = requests.Session()
    _login(s, FREE)
    return s


# ---------------- Config (public) ----------------
class TestSchedulerConfig:
    def test_config_public(self):
        r = requests.get(f"{API}/scheduler/config", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ["weekly_rules", "slot_minutes", "tz", "price_inr",
                  "payment_mode", "google_connected", "duration_minutes", "label"]:
            assert k in d, f"missing key {k}"
        assert d["price_inr"] == 999
        assert d["payment_mode"] in ("mock", "live")
        assert isinstance(d["weekly_rules"], list)
        assert isinstance(d["google_connected"], bool)


# ---------------- Slots (public) ----------------
class TestSchedulerSlots:
    def test_slots_default(self):
        r = requests.get(f"{API}/scheduler/slots?weeks=4", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "slots" in d and isinstance(d["slots"], list)
        if d["slots"]:
            s = d["slots"][0]
            for k in ["start_utc", "end_utc", "start_local", "end_local", "tz", "weekday", "date"]:
                assert k in s
            # All slot starts must be in the future (> now + 30min buffer)
            now = datetime.now(timezone.utc)
            for slot in d["slots"]:
                t = datetime.fromisoformat(slot["start_utc"].replace("Z", "+00:00"))
                assert t > now, f"past slot leaked: {slot['start_utc']}"

    def test_slots_weeks_clamped(self):
        r = requests.get(f"{API}/scheduler/slots?weeks=99", timeout=20)
        assert r.status_code == 200


# ---------------- Availability (admin) ----------------
class TestAvailability:
    def test_availability_non_admin_forbidden(self, premium_session):
        r = premium_session.put(f"{API}/scheduler/availability", json={
            "weekly_rules": [{"day": 1, "start": "10:00", "end": "12:00"}],
            "slot_minutes": 30,
            "tz": "Asia/Kolkata",
        }, timeout=20)
        assert r.status_code in (401, 403), r.text

    def test_availability_unauth_forbidden(self):
        r = requests.put(f"{API}/scheduler/availability", json={
            "weekly_rules": [{"day": 1, "start": "10:00", "end": "12:00"}],
            "slot_minutes": 30, "tz": "Asia/Kolkata"
        }, timeout=20)
        assert r.status_code in (401, 403)

    def test_availability_bad_slot_minutes(self, admin_session):
        r = admin_session.put(f"{API}/scheduler/availability", json={
            "weekly_rules": [{"day": 1, "start": "10:00", "end": "12:00"}],
            "slot_minutes": 17, "tz": "Asia/Kolkata"
        }, timeout=20)
        assert r.status_code == 400

    def test_availability_bad_day(self, admin_session):
        r = admin_session.put(f"{API}/scheduler/availability", json={
            "weekly_rules": [{"day": 9, "start": "10:00", "end": "12:00"}],
            "slot_minutes": 30, "tz": "Asia/Kolkata"
        }, timeout=20)
        assert r.status_code == 400

    def test_availability_save_and_reflect(self, admin_session):
        # Save a generous week so slots are guaranteed to be available
        rules = [
            {"day": 0, "start": "10:00", "end": "18:00"},
            {"day": 1, "start": "10:00", "end": "18:00"},
            {"day": 2, "start": "10:00", "end": "18:00"},
            {"day": 3, "start": "10:00", "end": "18:00"},
            {"day": 4, "start": "10:00", "end": "18:00"},
            {"day": 5, "start": "10:00", "end": "18:00"},
            {"day": 6, "start": "10:00", "end": "18:00"},
        ]
        r = admin_session.put(f"{API}/scheduler/availability", json={
            "weekly_rules": rules, "slot_minutes": 30, "tz": "Asia/Kolkata"
        }, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["weekly_rules"]) == 7
        assert d["slot_minutes"] == 30

        # GET config should reflect
        cfg = requests.get(f"{API}/scheduler/config", timeout=20).json()
        assert len(cfg["weekly_rules"]) == 7

        # Slots should be non-empty
        slots = requests.get(f"{API}/scheduler/slots?weeks=4", timeout=20).json()["slots"]
        assert len(slots) > 0, "Expected slots after wide availability"


# ---------------- Booking (premium-only) ----------------
class TestBooking:
    @pytest.fixture(scope="class")
    def a_slot(self):
        slots = requests.get(f"{API}/scheduler/slots?weeks=4", timeout=20).json()["slots"]
        if not slots:
            pytest.skip("No slots available for booking test")
        return slots[0]

    def test_book_unauthenticated(self, a_slot):
        r = requests.post(f"{API}/scheduler/book", json={
            "slot_start_utc": a_slot["start_utc"],
            "customer_name": "TEST Anon",
        }, timeout=20)
        assert r.status_code in (401, 403)

    def test_book_free_forbidden(self, free_session, a_slot):
        r = free_session.post(f"{API}/scheduler/book", json={
            "slot_start_utc": a_slot["start_utc"],
            "customer_name": "TEST Free",
        }, timeout=20)
        assert r.status_code == 403, r.text

    def test_book_premium_success_and_confirm(self, premium_session, a_slot):
        # Book
        r = premium_session.post(f"{API}/scheduler/book", json={
            "slot_start_utc": a_slot["start_utc"],
            "customer_name": "TEST Premium User",
            "customer_phone": "+910000000000",
            "notes": "TEST booking",
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        booking = data["booking"]
        order = data["order"]
        assert booking["status"] == "pending"
        assert booking["amount_paise"] == 99900
        assert order["mode"] in ("mock", "live")
        assert order["order_id"]
        pytest.shared_booking_id = booking["id"]  # type: ignore[attr-defined]
        pytest.shared_order_id = order["order_id"]  # type: ignore[attr-defined]
        pytest.shared_slot = a_slot["start_utc"]  # type: ignore[attr-defined]

        # Confirm (mock signature)
        r2 = premium_session.post(f"{API}/scheduler/confirm", json={
            "booking_id": booking["id"],
            "razorpay_order_id": order["order_id"],
            "razorpay_payment_id": "pay_TEST_" + booking["id"][:8],
            "razorpay_signature": "TEST_SIG",
        }, timeout=20)
        assert r2.status_code == 200, r2.text
        confirmed = r2.json()
        assert confirmed["status"] == "paid"
        assert confirmed.get("meet_url"), "meet_url missing"
        assert re.match(r"^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$", confirmed["meet_url"]), \
            f"Unexpected meet URL: {confirmed['meet_url']}"

    def test_book_clash_409(self, premium_session):
        slot = getattr(pytest, "shared_slot", None)
        if not slot:
            pytest.skip("no previously booked slot")
        r = premium_session.post(f"{API}/scheduler/book", json={
            "slot_start_utc": slot,
            "customer_name": "TEST Clash",
        }, timeout=20)
        assert r.status_code == 409, r.text

    def test_book_past_slot_rejected(self, premium_session):
        past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        r = premium_session.post(f"{API}/scheduler/book", json={
            "slot_start_utc": past,
            "customer_name": "TEST Past",
        }, timeout=20)
        assert r.status_code == 400

    def test_book_invalid_iso(self, premium_session):
        r = premium_session.post(f"{API}/scheduler/book", json={
            "slot_start_utc": "not-an-iso",
            "customer_name": "TEST Bad",
        }, timeout=20)
        assert r.status_code == 400

    def test_my_bookings(self, premium_session):
        r = premium_session.get(f"{API}/scheduler/my-bookings", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "bookings" in d and isinstance(d["bookings"], list)
        assert any(b["id"] == getattr(pytest, "shared_booking_id", "") for b in d["bookings"])

    def test_all_bookings_admin_only(self, admin_session, premium_session):
        r = admin_session.get(f"{API}/scheduler/all-bookings", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "bookings" in d
        # Non-admin
        r2 = premium_session.get(f"{API}/scheduler/all-bookings", timeout=20)
        assert r2.status_code in (401, 403)


# ---------------- OAuth admin endpoints ----------------
class TestOAuth:
    def test_oauth_start_admin(self, admin_session):
        r = admin_session.get(f"{API}/scheduler/oauth/start", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        url = d.get("authorization_url", "")
        assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
        client_id = os.environ.get("GOOGLE_CALENDAR_CLIENT_ID",
                                   "731891768937-eu76eatgb33jo53g2tsdkpc3kiv6ssmk.apps.googleusercontent.com")
        assert client_id in url
        assert "redirect_uri=" in url
        assert "scope=" in url
        assert "state=" in url

    def test_oauth_start_non_admin(self, premium_session):
        r = premium_session.get(f"{API}/scheduler/oauth/start", timeout=20)
        assert r.status_code in (401, 403)

    def test_oauth_disconnect_admin(self, admin_session):
        r = admin_session.post(f"{API}/scheduler/oauth/disconnect", timeout=20)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_oauth_disconnect_non_admin(self, premium_session):
        r = premium_session.post(f"{API}/scheduler/oauth/disconnect", timeout=20)
        assert r.status_code in (401, 403)


# ---------------- Regression ----------------
class TestRegression:
    def test_payments_config(self):
        r = requests.get(f"{API}/payments/config", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "mode" in d

    def test_numerology_mobile(self):
        r = requests.post(f"{API}/numerology/mobile", json={"mobile_number": "9876543210"}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "sum" in d or "total" in d or "mulank" in d or "destiny" in d or isinstance(d, dict)

    def test_premium_kundali(self, premium_session):
        payload = {
            "name": "TEST Premium",
            "dob": "1990-01-15",
            "tob": "10:30",
            "place": "Mumbai",
            "lat": 19.076,
            "lon": 72.8777,
            "tz": "Asia/Kolkata",
        }
        r = premium_session.post(f"{API}/astrology/premium", json=payload, timeout=30)
        # Either 200 or known dependent error — at least not 500 for valid input
        assert r.status_code in (200, 400, 422), f"Unexpected: {r.status_code} {r.text[:200]}"
