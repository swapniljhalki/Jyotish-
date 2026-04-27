"""Vedic Numerology endpoint tests (POST /api/numerology, /api/numerology/reading)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to frontend/.env
    from pathlib import Path
    envf = Path("/app/frontend/.env")
    if envf.exists():
        for line in envf.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"


# --- fixtures ---
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": "admin@vedic.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def basic_user_token(session):
    """Create a fresh non-premium user so we can test the 403 gate."""
    import uuid
    email = f"TEST_basic_{uuid.uuid4().hex[:8]}@vedic.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "testpass1", "name": "Basic User"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# --- calculation endpoint (public) ---
class TestNumerologyCalc:
    def test_sample_rahul_sharma(self, session):
        r = session.post(f"{API}/numerology", json={
            "full_name": "Rahul Sharma", "date_of_birth": "1990-05-15"
        })
        assert r.status_code == 200, r.text
        d = r.json()
        # mulank from day 15 -> 1+5=6 (Shukra)
        assert d["mulank"]["number"] == 6
        assert d["mulank"]["planet"] == "Shukra"
        # bhagyank from 1990-05-15 -> 1+9+9+0+0+5+1+5 = 30 -> 3 (Guru)
        assert d["bhagyank"]["number"] == 3
        assert d["bhagyank"]["planet"] == "Guru"
        # naamank for "Rahul Sharma" -> 6 (Shukra) per spec
        assert d["naamank"]["number"] == 6
        assert d["naamank"]["planet"] == "Shukra"
        # structure
        for block in ("mulank", "bhagyank", "naamank"):
            b = d[block]
            for k in ("traits", "lucky_days", "lucky_colors", "gemstone", "deity", "mantra", "career", "challenges"):
                assert k in b, f"{block}.{k} missing"

    def test_bad_date_format(self, session):
        r = session.post(f"{API}/numerology", json={
            "full_name": "Rahul Sharma", "date_of_birth": "1990/05/15"
        })
        assert r.status_code == 422, r.text

    def test_empty_full_name(self, session):
        r = session.post(f"{API}/numerology", json={
            "full_name": "", "date_of_birth": "1990-05-15"
        })
        assert r.status_code == 422, r.text

    def test_whitespace_full_name(self, session):
        r = session.post(f"{API}/numerology", json={
            "full_name": "   ", "date_of_birth": "1990-05-15"
        })
        assert r.status_code == 422, r.text


# --- reading endpoint (premium-only) ---
class TestNumerologyReading:
    def test_no_auth_returns_401(self, session):
        r = session.post(f"{API}/numerology/reading", json={
            "full_name": "Rahul Sharma", "date_of_birth": "1990-05-15"
        })
        assert r.status_code == 401, r.text

    def test_non_premium_returns_403(self, session, basic_user_token):
        r = session.post(
            f"{API}/numerology/reading",
            json={"full_name": "Rahul Sharma", "date_of_birth": "1990-05-15"},
            headers={"Authorization": f"Bearer {basic_user_token}"},
        )
        assert r.status_code == 403, r.text

    def test_premium_returns_profile_and_advice(self, session, admin_token):
        r = session.post(
            f"{API}/numerology/reading",
            json={"full_name": "Rahul Sharma", "date_of_birth": "1990-05-15"},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mulank"]["number"] == 6
        assert d["bhagyank"]["number"] == 3
        assert d["naamank"]["number"] == 6
        assert isinstance(d.get("advice"), str) and len(d["advice"]) > 50


# --- regression: existing endpoints still reachable ---
class TestRegression:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200

    def test_panchang(self, session):
        r = session.get(f"{API}/panchang/today")
        assert r.status_code == 200

    def test_festivals(self, session):
        r = session.get(f"{API}/festivals/upcoming?limit=3")
        assert r.status_code == 200
        assert "festivals" in r.json()

    def test_nakshatras(self, session):
        r = session.get(f"{API}/nakshatras")
        assert r.status_code == 200

    def test_auth_me(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == "admin@vedic.com"

    def test_readings_list(self, session, admin_token):
        r = session.get(f"{API}/readings", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert "readings" in r.json()
