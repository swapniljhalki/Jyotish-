"""
Vedic Astrology API - New Auth Features Tests
Tests: Password Reset, Email Verification, Brute-force Lockout, Refresh Tokens, Admin Panel, Google OAuth
"""
import pytest
import requests
import os
import uuid
import time
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ FIXTURES ============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with cookies"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_session():
    """Admin authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@vedic.com",
        "password": os.environ.get("ADMIN_PASSWORD", "test1234")
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


# ============ REGISTRATION WITH VERIFICATION EMAIL ============

class TestRegistrationVerificationEmail:
    """Test that registration sends verification email to outbox"""
    
    def test_register_sends_verification_email(self, admin_session):
        """POST /api/auth/register sends verification email to outbox"""
        # Register a new user
        unique_email = f"TEST_verify_{uuid.uuid4().hex[:8]}@vedic.com"
        reg_session = requests.Session()
        reg_session.headers.update({"Content-Type": "application/json"})
        
        response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Verify Test"
        })
        assert response.status_code == 200
        data = response.json()
        assert not data["email_verified"], "New user should have email_verified=false"
        
        # Check admin outbox for verification email
        outbox_response = admin_session.get(f"{BASE_URL}/api/admin/emails")
        assert outbox_response.status_code == 200
        emails = outbox_response.json()["emails"]
        
        # Find verification email for this user
        verification_emails = [e for e in emails if e["to"] == unique_email.lower() and e["kind"] == "email_verification"]
        assert len(verification_emails) >= 1, f"No verification email found for {unique_email}"
        
        # Verify email contains token
        email_body = verification_emails[0]["body"]
        assert "verify-email?token=" in email_body, "Verification email should contain token link"
        print(f"✓ Registration sent verification email to {unique_email}")


# ============ BRUTE-FORCE LOCKOUT ============

class TestBruteForceLockout:
    """Test brute-force protection (5 failed attempts = lockout)"""
    
    def test_lockout_after_5_failed_attempts(self, api_client):
        """POST /api/auth/login returns 429 after 5 failed attempts"""
        # Use a FRESH email to avoid cached lockouts
        lockout_email = f"TEST_lockout_{uuid.uuid4().hex[:8]}@vedic.com"
        
        # First register the user
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": lockout_email,
            "password": "correctpass123",
            "name": "Lockout Test"
        })
        assert reg_response.status_code == 200
        
        # Create fresh session for lockout testing
        lockout_session = requests.Session()
        lockout_session.headers.update({"Content-Type": "application/json"})
        
        # Make 5 failed login attempts
        for i in range(5):
            response = lockout_session.post(f"{BASE_URL}/api/auth/login", json={
                "email": lockout_email,
                "password": "wrongpassword"
            })
            assert response.status_code == 401, f"Attempt {i+1} should return 401"
            print(f"  Failed attempt {i+1}: 401")
        
        # 6th attempt should be locked out (429)
        response = lockout_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": lockout_email,
            "password": "wrongpassword"
        })
        assert response.status_code == 429, f"6th attempt should return 429, got {response.status_code}"
        assert "Too many failed attempts" in response.json().get("detail", "")
        print("✓ Lockout triggered after 5 failed attempts (429)")


# ============ REFRESH TOKEN ============

class TestRefreshToken:
    """Test refresh token functionality"""
    
    def test_refresh_token_issues_new_access_token(self, api_client):
        """POST /api/auth/refresh uses refresh_token cookie to issue new access_token"""
        # Register and login to get cookies
        unique_email = f"TEST_refresh_{uuid.uuid4().hex[:8]}@vedic.com"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Refresh Test"
        })
        assert response.status_code == 200
        
        # Verify refresh_token cookie is set
        assert "refresh_token" in api_client.cookies, "refresh_token cookie should be set"
        
        # Call refresh endpoint
        refresh_response = api_client.post(f"{BASE_URL}/api/auth/refresh")
        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data, "Refresh should return new access_token"
        print("✓ Refresh token issued new access_token")
    
    def test_refresh_without_cookie_returns_401(self):
        """POST /api/auth/refresh without refresh_token returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/auth/refresh")
        assert response.status_code == 401
        print("✓ Refresh without cookie returns 401")


# ============ FORGOT PASSWORD / RESET PASSWORD ============

class TestPasswordReset:
    """Test forgot password and reset password flow"""
    
    def test_forgot_password_always_returns_200(self, api_client):
        """POST /api/auth/forgot-password always returns 200 (no email enumeration)"""
        # Test with non-existent email
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@vedic.com"
        })
        assert response.status_code == 200
        assert response.json().get("ok") is True
        print("✓ Forgot password returns 200 for non-existent email")
    
    def test_forgot_password_sends_email_for_existing_user(self, admin_session):
        """POST /api/auth/forgot-password sends reset email when account exists"""
        # Register a user
        unique_email = f"TEST_reset_{uuid.uuid4().hex[:8]}@vedic.com"
        reg_session = requests.Session()
        reg_session.headers.update({"Content-Type": "application/json"})
        
        reg_response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "oldpassword123",
            "name": "Reset Test"
        })
        assert reg_response.status_code == 200
        
        # Request password reset
        forgot_response = reg_session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": unique_email
        })
        assert forgot_response.status_code == 200
        
        # Check admin outbox for reset email
        outbox_response = admin_session.get(f"{BASE_URL}/api/admin/emails")
        assert outbox_response.status_code == 200
        emails = outbox_response.json()["emails"]
        
        reset_emails = [e for e in emails if e["to"] == unique_email.lower() and e["kind"] == "password_reset"]
        assert len(reset_emails) >= 1, f"No reset email found for {unique_email}"
        print(f"✓ Forgot password sent reset email to {unique_email}")
    
    def test_reset_password_full_flow(self, admin_session):
        """Full password reset flow: forgot -> extract token -> reset -> login with new password"""
        # Register a user
        unique_email = f"TEST_fullreset_{uuid.uuid4().hex[:8]}@vedic.com"
        reg_session = requests.Session()
        reg_session.headers.update({"Content-Type": "application/json"})
        
        reg_response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "oldpassword123",
            "name": "Full Reset Test"
        })
        assert reg_response.status_code == 200
        
        # Request password reset
        forgot_response = reg_session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": unique_email
        })
        assert forgot_response.status_code == 200
        
        # Get token from outbox
        outbox_response = admin_session.get(f"{BASE_URL}/api/admin/emails")
        emails = outbox_response.json()["emails"]
        reset_emails = [e for e in emails if e["to"] == unique_email.lower() and e["kind"] == "password_reset"]
        
        # Extract token from email body
        email_body = reset_emails[0]["body"]
        token_match = re.search(r'token=([A-Za-z0-9_-]+)', email_body)
        assert token_match, "Could not extract token from reset email"
        reset_token = token_match.group(1)
        
        # Reset password
        new_password = "newpassword456"
        reset_response = reg_session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": new_password
        })
        assert reset_response.status_code == 200
        assert reset_response.json().get("ok") is True
        
        # Login with new password
        login_session = requests.Session()
        login_session.headers.update({"Content-Type": "application/json"})
        login_response = login_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": new_password
        })
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.text}"
        print("✓ Full password reset flow completed successfully")
    
    def test_reset_password_invalid_token(self, api_client):
        """POST /api/auth/reset-password with invalid token returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        print("✓ Reset password with invalid token returns 400")


# ============ EMAIL VERIFICATION ============

class TestEmailVerification:
    """Test email verification flow"""
    
    def test_send_verification_requires_auth(self):
        """POST /api/auth/send-verification requires authentication"""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/auth/send-verification")
        assert response.status_code == 401
        print("✓ Send verification requires auth (401)")
    
    def test_verify_email_full_flow(self, admin_session):
        """Full email verification flow: register -> get token from outbox -> verify"""
        # Register a user
        unique_email = f"TEST_emailverify_{uuid.uuid4().hex[:8]}@vedic.com"
        reg_session = requests.Session()
        reg_session.headers.update({"Content-Type": "application/json"})
        
        reg_response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Email Verify Test"
        })
        assert reg_response.status_code == 200
        assert not reg_response.json()["email_verified"]
        
        # Get verification token from outbox
        outbox_response = admin_session.get(f"{BASE_URL}/api/admin/emails")
        emails = outbox_response.json()["emails"]
        verify_emails = [e for e in emails if e["to"] == unique_email.lower() and e["kind"] == "email_verification"]
        
        # Extract token
        email_body = verify_emails[0]["body"]
        token_match = re.search(r'token=([A-Za-z0-9_-]+)', email_body)
        assert token_match, "Could not extract token from verification email"
        verify_token = token_match.group(1)
        
        # Verify email
        verify_response = reg_session.post(f"{BASE_URL}/api/auth/verify-email", json={
            "token": verify_token
        })
        assert verify_response.status_code == 200
        assert verify_response.json().get("ok") is True
        
        # Check user is now verified via /me
        me_response = reg_session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        assert me_response.json()["email_verified"] is True
        print("✓ Email verification flow completed - user now verified")
    
    def test_verify_email_invalid_token(self, api_client):
        """POST /api/auth/verify-email with invalid token returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/verify-email", json={
            "token": "invalid_verification_token"
        })
        assert response.status_code == 400
        print("✓ Verify email with invalid token returns 400")


# ============ ADMIN ENDPOINTS ============

class TestAdminEndpoints:
    """Test admin panel endpoints"""
    
    def test_admin_list_users(self, admin_session):
        """GET /api/admin/users returns all users"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert len(data["users"]) > 0
        
        # Verify user structure
        user = data["users"][0]
        assert "id" in user
        assert "email" in user
        assert "tier" in user
        assert "role" in user
        assert "email_verified" in user
        print(f"✓ Admin list users returned {len(data['users'])} users")
    
    def test_admin_patch_user_tier(self, admin_session):
        """PATCH /api/admin/users/{id} upgrades user tier"""
        # Create a test user
        unique_email = f"TEST_adminpatch_{uuid.uuid4().hex[:8]}@vedic.com"
        reg_session = requests.Session()
        reg_session.headers.update({"Content-Type": "application/json"})
        
        reg_response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Admin Patch Test"
        })
        assert reg_response.status_code == 200
        user_id = reg_response.json()["id"]
        
        # Admin upgrades tier
        patch_response = admin_session.patch(f"{BASE_URL}/api/admin/users/{user_id}", json={
            "tier": "premium"
        })
        assert patch_response.status_code == 200
        assert patch_response.json()["tier"] == "premium"
        print("✓ Admin patched user tier to premium")
    
    def test_admin_delete_user(self, admin_session):
        """DELETE /api/admin/users/{id} removes user"""
        # Create a test user
        unique_email = f"TEST_admindelete_{uuid.uuid4().hex[:8]}@vedic.com"
        reg_session = requests.Session()
        reg_session.headers.update({"Content-Type": "application/json"})
        
        reg_response = reg_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Admin Delete Test"
        })
        assert reg_response.status_code == 200
        user_id = reg_response.json()["id"]
        
        # Admin deletes user
        delete_response = admin_session.delete(f"{BASE_URL}/api/admin/users/{user_id}")
        assert delete_response.status_code == 200
        assert delete_response.json().get("ok") is True
        
        # Verify user is gone
        users_response = admin_session.get(f"{BASE_URL}/api/admin/users")
        user_ids = [u["id"] for u in users_response.json()["users"]]
        assert user_id not in user_ids
        print("✓ Admin deleted user successfully")
    
    def test_admin_cannot_delete_self(self, admin_session):
        """DELETE /api/admin/users/{id} returns 400 when admin tries to delete self"""
        # Get admin's own ID
        me_response = admin_session.get(f"{BASE_URL}/api/auth/me")
        admin_id = me_response.json()["id"]
        
        # Try to delete self
        delete_response = admin_session.delete(f"{BASE_URL}/api/admin/users/{admin_id}")
        assert delete_response.status_code == 400
        assert "Cannot delete your own" in delete_response.json().get("detail", "")
        print("✓ Admin cannot delete own account (400)")
    
    def test_admin_list_emails(self, admin_session):
        """GET /api/admin/emails returns email outbox"""
        response = admin_session.get(f"{BASE_URL}/api/admin/emails")
        assert response.status_code == 200
        data = response.json()
        assert "emails" in data
        
        if len(data["emails"]) > 0:
            email = data["emails"][0]
            assert "id" in email
            assert "to" in email
            assert "subject" in email
            assert "body" in email
            assert "kind" in email
        print(f"✓ Admin list emails returned {len(data['emails'])} emails")
    
    def test_non_admin_gets_403(self):
        """Non-admin user gets 403 on admin endpoints"""
        # Register a regular user
        unique_email = f"TEST_nonadmin_{uuid.uuid4().hex[:8]}@vedic.com"
        user_session = requests.Session()
        user_session.headers.update({"Content-Type": "application/json"})
        
        reg_response = user_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Non Admin Test"
        })
        assert reg_response.status_code == 200
        
        # Try admin endpoints
        users_response = user_session.get(f"{BASE_URL}/api/admin/users")
        assert users_response.status_code == 403
        
        emails_response = user_session.get(f"{BASE_URL}/api/admin/emails")
        assert emails_response.status_code == 403
        
        patch_response = user_session.patch(f"{BASE_URL}/api/admin/users/someid", json={"tier": "premium"})
        assert patch_response.status_code == 403
        
        delete_response = user_session.delete(f"{BASE_URL}/api/admin/users/someid")
        assert delete_response.status_code == 403
        
        print("✓ Non-admin gets 403 on all admin endpoints")


# ============ GOOGLE OAUTH SESSION ============

class TestGoogleOAuthSession:
    """Test Google OAuth session endpoint"""
    
    def test_google_session_missing_header_returns_400(self, api_client):
        """POST /api/auth/google/session without X-Session-ID returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/google/session")
        assert response.status_code == 400
        assert "Missing X-Session-ID" in response.json().get("detail", "")
        print("✓ Google session without header returns 400")
    
    def test_google_session_invalid_header_returns_401(self, api_client):
        """POST /api/auth/google/session with invalid X-Session-ID returns 401"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/google/session",
            headers={"X-Session-ID": "invalid_session_id_12345"}
        )
        assert response.status_code == 401
        assert "Invalid session" in response.json().get("detail", "")
        print("✓ Google session with invalid header returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
