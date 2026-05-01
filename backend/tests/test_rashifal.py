"""Backend tests for the Daily Rashifal endpoint."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kundali-chart-1.preview.emergentagent.com").rstrip("/")

EXPECTED_ORDER = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Rashifal endpoint tests ----
class TestRashifal:
    def test_rashifal_default_tz_payload(self, session):
        # First call may take 20-30s due to Claude batched call
        t0 = time.time()
        r = session.get(f"{BASE_URL}/api/rashifal/today", timeout=90)
        elapsed_first = time.time() - t0
        assert r.status_code == 200, r.text
        data = r.json()

        # Top-level schema
        for key in ("date", "timezone", "moon_sign", "sun_sign", "source", "rashis"):
            assert key in data, f"missing key: {key}"
        assert data["timezone"] == "Asia/Kolkata"
        assert data["source"] in ("ai", "fallback")
        assert isinstance(data["rashis"], list)
        assert len(data["rashis"]) == 12

        # Order enforcement
        names = [r["name"] for r in data["rashis"]]
        assert names == EXPECTED_ORDER, f"Rashi order mismatch: {names}"

        # Per-rashi required fields
        required_fields = ("name", "sanskrit", "lord", "glyph", "theme",
                           "forecast", "lucky_color", "lucky_number")
        for rashi in data["rashis"]:
            for f in required_fields:
                assert f in rashi, f"{rashi.get('name')} missing '{f}'"
            assert isinstance(rashi["lucky_number"], int)
            assert rashi["forecast"].strip() != ""

        print(f"[rashifal] first call elapsed={elapsed_first:.2f}s source={data['source']}")

    def test_rashifal_cache_hit_fast(self, session):
        # Second call should be cached and fast
        t0 = time.time()
        r = session.get(f"{BASE_URL}/api/rashifal/today", timeout=15)
        elapsed = time.time() - t0
        assert r.status_code == 200
        print(f"[rashifal] cached call elapsed={elapsed:.2f}s")
        assert elapsed < 2.0, f"cache hit too slow: {elapsed:.2f}s"

    def test_rashifal_invalid_tz_returns_400(self, session):
        r = session.get(f"{BASE_URL}/api/rashifal/today", params={"tz": "Invalid"}, timeout=15)
        assert r.status_code == 400, r.text
        body = r.json()
        assert "detail" in body

    def test_rashifal_alt_timezone_valid(self, session):
        r = session.get(f"{BASE_URL}/api/rashifal/today",
                        params={"tz": "America/New_York"}, timeout=90)
        assert r.status_code == 200
        data = r.json()
        assert data["timezone"] == "America/New_York"
        assert len(data["rashis"]) == 12
        names = [x["name"] for x in data["rashis"]]
        assert names == EXPECTED_ORDER


# ---- Regression: existing panchang + festivals still work ----
class TestRegression:
    def test_panchang_today(self, session):
        r = session.get(f"{BASE_URL}/api/panchang/today", timeout=30)
        assert r.status_code == 200
        p = r.json()
        for key in ("date", "timezone", "tithi", "nakshatra", "yoga", "vara", "sun_sign", "moon_sign"):
            assert key in p, f"panchang missing {key}"
        assert "name" in p["tithi"]
        assert "paksha" in p["tithi"]
        assert "name" in p["nakshatra"]

    def test_festivals_upcoming(self, session):
        r = session.get(f"{BASE_URL}/api/festivals/upcoming", params={"limit": 5}, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "festivals" in body
        assert isinstance(body["festivals"], list)
        # limit=5 → at most 5
        assert len(body["festivals"]) <= 5
        if body["festivals"]:
            f0 = body["festivals"][0]
            for k in ("date", "name", "days_until"):
                assert k in f0
