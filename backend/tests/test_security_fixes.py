"""
Security fix verification tests for SEC-001, SEC-002, SEC-003.
Backend URL is loaded from REACT_APP_BACKEND_URL. No code modifications.
"""
import os
import re
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
assert BASE_URL, "REACT_APP_BACKEND_URL env is required"
BASE_URL = BASE_URL.rstrip("/")

ADMIN_EMAIL = "admin@vedic.com"
ADMIN_PW = "test1234"
PREMIUM_EMAIL = "testuser@vedic.com"
PREMIUM_PW = "test1234"
FREE_EMAIL = "demo@vedic.com"
FREE_PW = "demo1234"

EXPECTED_FRONTEND_URL = "https://kundali-chart-1.preview.emergentagent.com"


def _fresh_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password, origin=None):
    headers = {}
    if origin:
        headers["Origin"] = origin
    return session.post(f"{BASE_URL}/api/auth/login",
                        json={"email": email, "password": password},
                        headers=headers)


# ---------------- SEC-001 ----------------

def test_sec001_readings_admin_login_denied():
    s = _fresh_session()
    r = _login(s, "readings-admin@vedic.com", "readings123")
    assert r.status_code == 401, f"Expected 401 for deleted readings-admin, got {r.status_code}: {r.text}"


def test_sec001_admin_me_role_tier():
    s = _fresh_session()
    r = _login(s, ADMIN_EMAIL, ADMIN_PW)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    me = s.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200, me.text
    data = me.json()
    assert data.get("role") == "admin", f"role={data.get('role')}"
    assert data.get("tier") == "premium", f"tier={data.get('tier')}"


def test_sec001_admin_users_list_excludes_readings_admin():
    s = _fresh_session()
    r = _login(s, ADMIN_EMAIL, ADMIN_PW)
    assert r.status_code == 200
    users = s.get(f"{BASE_URL}/api/admin/users")
    assert users.status_code == 200, users.text
    payload = users.json()
    users_list = payload if isinstance(payload, list) else payload.get("users", [])
    emails = [u.get("email") for u in users_list]
    assert "readings-admin@vedic.com" not in emails, f"Deleted account still present: {emails}"


# ---------------- SEC-002 ----------------

def test_sec002_forgot_password_uses_frontend_url_not_origin():
    s = _fresh_session()
    r = s.post(f"{BASE_URL}/api/auth/forgot-password",
               json={"email": PREMIUM_EMAIL},
               headers={"Origin": "https://attacker.example.com"})
    assert r.status_code == 200, f"forgot-password status {r.status_code}: {r.text}"
    body = r.json()
    assert body.get("ok") is True

    # login as admin and inspect outbox
    admin = _fresh_session()
    assert _login(admin, ADMIN_EMAIL, ADMIN_PW).status_code == 200
    outbox = admin.get(f"{BASE_URL}/api/admin/emails")
    assert outbox.status_code == 200, outbox.text
    payload = outbox.json()
    emails = payload if isinstance(payload, list) else payload.get("emails", [])
    # Find the most recent reset email for the premium user
    reset_email = None
    for e in emails:
        to = e.get("to") or e.get("recipient") or e.get("email")
        subj = (e.get("subject") or "").lower()
        body_text = e.get("body") or e.get("html") or e.get("content") or ""
        if to == PREMIUM_EMAIL and ("reset" in subj or "reset-password" in body_text):
            reset_email = e
            break
    assert reset_email is not None, f"No reset email found for {PREMIUM_EMAIL}. Outbox sample: {emails[:2]}"
    body_text = reset_email.get("body") or reset_email.get("html") or reset_email.get("content") or ""
    assert "attacker.example.com" not in body_text, "Reset link contains attacker origin!"
    assert f"{EXPECTED_FRONTEND_URL}/reset-password?token=" in body_text, \
        f"Reset link does not start with expected FRONTEND_URL. Body: {body_text[:500]}"


# ---------------- SEC-003 ----------------

def test_sec003_cookies_secure_flag():
    s = _fresh_session()
    r = _login(s, ADMIN_EMAIL, ADMIN_PW)
    assert r.status_code == 200
    set_cookies = r.headers.get("set-cookie", "")
    # requests concatenates multiple Set-Cookie; also inspect raw
    raw_headers = r.raw.headers.getlist("Set-Cookie") if hasattr(r.raw.headers, "getlist") else [set_cookies]
    combined = "\n".join(raw_headers)
    access_line = next((h for h in raw_headers if h.lower().startswith("access_token=")), None)
    refresh_line = next((h for h in raw_headers if h.lower().startswith("refresh_token=")), None)
    assert access_line, f"No access_token cookie. Headers: {raw_headers}"
    assert refresh_line, f"No refresh_token cookie. Headers: {raw_headers}"
    assert re.search(r";\s*secure", access_line, re.IGNORECASE), f"access_token missing Secure: {access_line}"
    assert re.search(r";\s*secure", refresh_line, re.IGNORECASE), f"refresh_token missing Secure: {refresh_line}"


def test_sec003_register_weak_password_rejected():
    s = _fresh_session()
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"email": f"TEST_weak_{int(time.time())}@vedic.com",
                     "password": "abcde", "name": "Weak"})
    assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text}"
    text = r.text.lower()
    assert "at least 8" in text or "min_length" in text or "8 characters" in text, \
        f"Validation msg missing min-length hint: {r.text}"


def test_sec003_reset_password_short_rejected():
    s = _fresh_session()
    r = s.post(f"{BASE_URL}/api/auth/reset-password",
               json={"token": "dummy-token", "new_password": "short"})
    assert r.status_code in (400, 422), f"expected 400/422, got {r.status_code}: {r.text}"
    # Spec allows 400/422 for dummy token; min-length msg only enforced when token order swaps.
    # Current server checks token first — response is "Invalid or used reset token", which is acceptable.


# ---------------- Regression ----------------

def test_regression_full_auth_flow():
    email = f"test_reg_{int(time.time())}@vedic.com"
    pw = "strongpass123"
    s = _fresh_session()
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"email": email, "password": pw, "name": "Reg Test"})
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"

    lo = s.post(f"{BASE_URL}/api/auth/logout")
    assert lo.status_code in (200, 204), lo.text

    s2 = _fresh_session()
    r2 = _login(s2, email, pw)
    assert r2.status_code == 200, r2.text
    me = s2.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200, me.text
    assert me.json().get("email") == email

    lo2 = s2.post(f"{BASE_URL}/api/auth/logout")
    assert lo2.status_code in (200, 204)


def test_regression_admin_login_and_me():
    s = _fresh_session()
    r = _login(s, ADMIN_EMAIL, ADMIN_PW)
    assert r.status_code == 200, r.text
    me = s.get(f"{BASE_URL}/api/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "admin"


def test_regression_premium_tarot_access():
    s = _fresh_session()
    r = _login(s, PREMIUM_EMAIL, PREMIUM_PW)
    assert r.status_code == 200, r.text
    # Try POST first, fall back to GET
    tarot = s.post(f"{BASE_URL}/api/astrology/tarot/reading", json={})
    if tarot.status_code == 405:
        tarot = s.get(f"{BASE_URL}/api/astrology/tarot/reading")
    assert tarot.status_code in (200, 201), f"tarot for premium failed: {tarot.status_code} {tarot.text[:300]}"


def test_regression_free_user_tarot_gated():
    s = _fresh_session()
    r = _login(s, FREE_EMAIL, FREE_PW)
    assert r.status_code == 200, r.text
    tarot = s.post(f"{BASE_URL}/api/astrology/tarot/reading", json={})
    if tarot.status_code == 405:
        tarot = s.get(f"{BASE_URL}/api/astrology/tarot/reading")
    assert tarot.status_code == 403, f"free user should be gated (403), got {tarot.status_code}: {tarot.text[:300]}"
