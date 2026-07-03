"""Regression tests after code review cleanup (iteration 10).

Focus: verify tarot RNG uses SystemRandom (different cards across calls),
payments webhook signature check still rejects invalid sig, and all
existing user-facing flows still pass.
"""
import os
import time

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

ADMIN = {"email": "admin@vedic.com", "password": "test1234"}
PREMIUM = {"email": "testuser@vedic.com", "password": "test1234"}
FREE = {"email": "demo@vedic.com", "password": "demo1234"}


def _login(session: requests.Session, creds: dict) -> requests.Response:
    return session.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)


# ---------- Auth ----------
class TestAuth:
    def test_admin_login_and_secure_cookies(self):
        s = requests.Session()
        r = _login(s, ADMIN)
        assert r.status_code == 200, r.text
        # cookies must include access_token and refresh_token with Secure
        set_cookies = r.headers.get("set-cookie", "")
        # multiple set-cookie headers -> use raw
        raw = r.raw.headers.getlist("set-cookie") if hasattr(r.raw, "headers") else [set_cookies]
        joined = ";".join(raw).lower()
        assert "access_token=" in joined
        assert "refresh_token=" in joined
        assert "secure" in joined, f"Secure flag missing: {joined}"
        assert "httponly" in joined

        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert me.status_code == 200
        body = me.json()
        assert body["role"] == "admin"
        assert body["tier"] == "premium"

    def test_premium_user_login(self):
        s = requests.Session()
        r = _login(s, PREMIUM)
        assert r.status_code == 200, r.text
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
        assert me["tier"] == "premium"


# ---------- Tarot (SystemRandom regression) ----------
class TestTarot:
    def _premium_session(self):
        s = requests.Session()
        r = _login(s, PREMIUM)
        assert r.status_code == 200
        return s

    def test_tarot_returns_valid_three_card_spread(self):
        s = self._premium_session()
        r = s.post(f"{BASE_URL}/api/astrology/tarot/reading", json={}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        # response may be wrapped; extract cards
        cards = data.get("cards") or data.get("spread") or data
        assert isinstance(cards, list), f"Expected list, got {type(cards)}: {data}"
        assert len(cards) == 3
        positions = [c["position"] for c in cards]
        assert positions == ["past", "present", "future"]
        names = {c["name"] for c in cards}
        assert len(names) == 3  # unique cards
        for c in cards:
            assert c["orientation"] in ("upright", "reversed")
            assert c.get("meaning")

    def test_tarot_rng_produces_variety(self):
        """SystemRandom-backed draws should not be identical across many calls."""
        s = self._premium_session()
        seen_card_sets = set()
        for _ in range(6):
            r = s.post(f"{BASE_URL}/api/astrology/tarot/reading", json={}, timeout=20)
            assert r.status_code == 200
            data = r.json()
            cards = data.get("cards") or data.get("spread") or data
            seen_card_sets.add(tuple(sorted(c["name"] for c in cards)))
        # With 22 cards choose 3, C(22,3)=1540; probability of 6 identical draws is astronomically small.
        assert len(seen_card_sets) > 1, f"RNG appears deterministic: {seen_card_sets}"

    def test_free_user_blocked_from_tarot(self):
        s = requests.Session()
        r = _login(s, FREE)
        assert r.status_code == 200, r.text
        r2 = s.post(f"{BASE_URL}/api/astrology/tarot/reading", json={}, timeout=15)
        assert r2.status_code == 403, f"Expected 403, got {r2.status_code}: {r2.text}"


# ---------- Payments webhook ----------
class TestPaymentsWebhook:
    def test_invalid_signature_returns_400(self):
        r = requests.post(
            f"{BASE_URL}/api/payments/webhook",
            json={"event": "payment.captured", "payload": {"payment": {"entity": {"id": "pay_fake"}}}},
            headers={"X-Razorpay-Signature": "definitely-not-valid"},
            timeout=15,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"


# ---------- Panchang ----------
class TestPanchang:
    def test_panchang_today(self):
        r = requests.get(f"{BASE_URL}/api/panchang/today", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        # Just verify it's non-empty json
        assert len(data) > 0


# ---------- Basic & Premium Astrology ----------
class TestAstrologyTiers:
    PAYLOAD = {
        "name": "TEST_User",
        "date_of_birth": "1990-05-15",
        "time_of_birth": "10:30",
        "place_of_birth": "Mumbai, India",
    }

    def _premium_session(self):
        s = requests.Session()
        assert _login(s, PREMIUM).status_code == 200
        return s

    def test_basic_astrology_start_returns_chart(self):
        s = self._premium_session()
        r = s.post(f"{BASE_URL}/api/astrology/basic/start", json=self.PAYLOAD, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] in ("processing", "done")
        assert "id" in data
        assert data.get("chart")
        assert data.get("ascendant")

    def test_premium_astrology_start_returns_chart(self):
        s = self._premium_session()
        r = s.post(f"{BASE_URL}/api/astrology/premium/start", json=self.PAYLOAD, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        assert data.get("chart")
