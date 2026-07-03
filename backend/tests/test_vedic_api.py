"""
Vedic Astrology API Backend Tests
Tests: Auth, Grahas, Nakshatras, Subscription, Astrology endpoints
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ FIXTURES ============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with cookies"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_user_email():
    """Generate unique test email for this test run"""
    return f"TEST_user_{uuid.uuid4().hex[:8]}@vedic.com"


@pytest.fixture(scope="module")
def registered_user(api_client, test_user_email):
    """Register a fresh test user and return user data"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_user_email,
        "password": "testpass123",
        "name": "Test Seeker"
    })
    assert response.status_code == 200, f"Registration failed: {response.text}"
    return response.json()


# ============ HEALTH CHECK ============

class TestHealth:
    """Health check tests - run first"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "Vedic" in data.get("message", "")
        print("✓ API root endpoint working")


# ============ FREE TIER: GRAHAS ============

class TestGrahas:
    """Grahas endpoint tests (free tier)"""
    
    def test_list_grahas_returns_9(self, api_client):
        """GET /api/grahas returns 9 grahas"""
        response = api_client.get(f"{BASE_URL}/api/grahas")
        assert response.status_code == 200
        data = response.json()
        assert "grahas" in data
        assert len(data["grahas"]) == 9, f"Expected 9 grahas, got {len(data['grahas'])}"
        # Verify structure
        graha = data["grahas"][0]
        assert "id" in graha
        assert "name" in graha
        assert "english" in graha
        assert "symbol" in graha
        print(f"✓ GET /api/grahas returns {len(data['grahas'])} grahas")
    
    def test_get_graha_surya(self, api_client):
        """GET /api/grahas/surya returns Sun details"""
        response = api_client.get(f"{BASE_URL}/api/grahas/surya")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "surya"
        assert data["name"] == "Surya"
        assert data["english"] == "Sun"
        assert "description" in data
        assert "qualities" in data
        print(f"✓ GET /api/grahas/surya returns: {data['name']} ({data['english']})")
    
    def test_get_graha_not_found(self, api_client):
        """GET /api/grahas/invalid returns 404"""
        response = api_client.get(f"{BASE_URL}/api/grahas/invalid_graha")
        assert response.status_code == 404
        print("✓ GET /api/grahas/invalid returns 404")


# ============ FREE TIER: NAKSHATRAS ============

class TestNakshatras:
    """Nakshatras endpoint tests (free tier)"""
    
    def test_list_nakshatras_returns_27(self, api_client):
        """GET /api/nakshatras returns 27 nakshatras"""
        response = api_client.get(f"{BASE_URL}/api/nakshatras")
        assert response.status_code == 200
        data = response.json()
        assert "nakshatras" in data
        assert len(data["nakshatras"]) == 27, f"Expected 27 nakshatras, got {len(data['nakshatras'])}"
        # Verify structure
        nakshatra = data["nakshatras"][0]
        assert "id" in nakshatra
        assert "name" in nakshatra
        assert "sanskrit" in nakshatra
        print(f"✓ GET /api/nakshatras returns {len(data['nakshatras'])} nakshatras")
    
    def test_get_nakshatra_by_id(self, api_client):
        """GET /api/nakshatras/1 returns Ashwini"""
        response = api_client.get(f"{BASE_URL}/api/nakshatras/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Ashwini"
        assert "deity" in data
        assert "ruler" in data
        print(f"✓ GET /api/nakshatras/1 returns: {data['name']}")
    
    def test_get_nakshatra_not_found(self, api_client):
        """GET /api/nakshatras/99 returns 404"""
        response = api_client.get(f"{BASE_URL}/api/nakshatras/99")
        assert response.status_code == 404
        print("✓ GET /api/nakshatras/99 returns 404")


# ============ AUTH: REGISTER ============

class TestAuthRegister:
    """Registration tests"""
    
    def test_register_new_user(self, api_client):
        """POST /api/auth/register creates user with tier=free"""
        unique_email = f"TEST_reg_{uuid.uuid4().hex[:8]}@vedic.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "New Seeker"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_email.lower()
        assert data["tier"] == "free", f"Expected tier=free, got {data['tier']}"
        assert data["name"] == "New Seeker"
        assert "id" in data
        assert "access_token" in data
        print(f"✓ Registered new user: {data['email']} with tier={data['tier']}")
    
    def test_register_duplicate_email(self, api_client, registered_user, test_user_email):
        """POST /api/auth/register with existing email returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_user_email,
            "password": "anotherpass",
            "name": "Duplicate"
        })
        assert response.status_code == 400
        print("✓ Duplicate email registration returns 400")


# ============ AUTH: LOGIN ============

class TestAuthLogin:
    """Login tests"""
    
    def test_login_success(self, api_client, registered_user, test_user_email):
        """POST /api/auth/login returns user + sets cookie"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_email.lower()
        assert "tier" in data
        assert "access_token" in data
        # Check cookie was set
        assert "access_token" in api_client.cookies
        print(f"✓ Login successful for {data['email']}, cookie set")
    
    def test_login_invalid_password(self, api_client, test_user_email):
        """POST /api/auth/login with wrong password returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_email,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password returns 401")
    
    def test_login_nonexistent_user(self, api_client):
        """POST /api/auth/login with unknown email returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@vedic.com",
            "password": "anypass"
        })
        assert response.status_code == 401
        print("✓ Nonexistent user login returns 401")


# ============ AUTH: ME ============

class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_me_with_cookie(self, api_client, registered_user, test_user_email):
        """GET /api/auth/me with cookie returns user"""
        # First login to set cookie
        api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_email,
            "password": "testpass123"
        })
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user_email.lower()
        assert "tier" in data
        print(f"✓ GET /api/auth/me returns user: {data['email']}")
    
    def test_me_without_auth(self):
        """GET /api/auth/me without auth returns 401"""
        # Use fresh session without cookies
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ GET /api/auth/me without auth returns 401")


# ============ ADMIN USER ============

class TestAdminUser:
    """Admin user tests"""
    
    def test_admin_login(self, api_client):
        """Admin user (email/password from env) can login with tier=premium"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vedic.com",
            "password": os.environ.get("ADMIN_PASSWORD", "test1234")
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["email"] == "admin@vedic.com"
        assert data["tier"] == "premium", f"Expected admin tier=premium, got {data['tier']}"
        print(f"✓ Admin login successful: {data['email']} with tier={data['tier']}")


# ============ SUBSCRIPTION ============

class TestSubscription:
    """Subscription (mock) tests"""
    
    def test_subscribe_upgrade_to_premium(self, api_client, registered_user, test_user_email):
        """POST /api/subscribe upgrades user tier"""
        # Login first
        api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_email,
            "password": "testpass123"
        })
        
        # Upgrade to premium
        response = api_client.post(f"{BASE_URL}/api/subscribe", json={"tier": "premium"})
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "premium"
        
        # Verify via /me
        me_response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["tier"] == "premium"
        print("✓ Subscription upgrade to premium verified via /me")
    
    def test_subscribe_without_auth(self):
        """POST /api/subscribe without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/subscribe", json={"tier": "basic"})
        assert response.status_code == 401
        print("✓ Subscribe without auth returns 401")
    
    def test_subscribe_invalid_tier(self, api_client, registered_user, test_user_email):
        """POST /api/subscribe with invalid tier returns 400"""
        api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_email,
            "password": "testpass123"
        })
        response = api_client.post(f"{BASE_URL}/api/subscribe", json={"tier": "invalid"})
        assert response.status_code == 400
        print("✓ Subscribe with invalid tier returns 400")


# ============ ASTROLOGY BASIC ============

class TestAstrologyBasic:
    """Basic tier astrology tests"""
    
    def test_basic_requires_auth(self):
        """POST /api/astrology/basic without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/astrology/basic", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "10:30",
            "place_of_birth": "Mumbai, India"
        })
        assert response.status_code == 401
        print("✓ Basic astrology without auth returns 401")
    
    def test_basic_requires_tier(self, api_client):
        """POST /api/astrology/basic with free tier returns 403"""
        # Register fresh user (free tier)
        unique_email = f"TEST_free_{uuid.uuid4().hex[:8]}@vedic.com"
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Free User"
        })
        
        response = api_client.post(f"{BASE_URL}/api/astrology/basic", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "10:30",
            "place_of_birth": "Mumbai, India"
        })
        assert response.status_code == 403
        print("✓ Basic astrology with free tier returns 403")
    
    def test_basic_with_basic_tier(self, api_client):
        """POST /api/astrology/basic with basic tier returns reading"""
        # Register and upgrade to basic
        unique_email = f"TEST_basic_{uuid.uuid4().hex[:8]}@vedic.com"
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Basic User"
        })
        api_client.post(f"{BASE_URL}/api/subscribe", json={"tier": "basic"})
        
        response = api_client.post(f"{BASE_URL}/api/astrology/basic", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "10:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Test Seeker"
        })
        assert response.status_code == 200, f"Basic reading failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "ascendant" in data
        assert "sun_sign" in data
        assert "moon_sign" in data
        assert "advice" in data
        
        # Verify advice is substantial (~250 words)
        word_count = len(data["advice"].split())
        assert word_count >= 100, f"Advice too short: {word_count} words"
        print(f"✓ Basic reading returned: ascendant={data['ascendant']}, advice={word_count} words")


# ============ ASTROLOGY PREMIUM ============

class TestAstrologyPremium:
    """Premium tier astrology tests"""
    
    def test_premium_requires_premium_tier(self, api_client):
        """POST /api/astrology/premium with basic tier returns 403"""
        # Register and upgrade to basic only
        unique_email = f"TEST_basiconly_{uuid.uuid4().hex[:8]}@vedic.com"
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Basic Only User"
        })
        api_client.post(f"{BASE_URL}/api/subscribe", json={"tier": "basic"})
        
        response = api_client.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "10:30",
            "place_of_birth": "Mumbai, India"
        })
        assert response.status_code == 403
        print("✓ Premium astrology with basic tier returns 403")
    
    def test_premium_with_premium_tier(self, api_client):
        """POST /api/astrology/premium with premium tier returns chart + advice"""
        # Register and upgrade to premium
        unique_email = f"TEST_premium_{uuid.uuid4().hex[:8]}@vedic.com"
        api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Premium User"
        })
        api_client.post(f"{BASE_URL}/api/subscribe", json={"tier": "premium"})
        
        response = api_client.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1985-12-25",
            "time_of_birth": "06:00",
            "place_of_birth": "Delhi, India",
            "full_name": "Premium Seeker"
        })
        assert response.status_code == 200, f"Premium reading failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "chart" in data
        assert "advice" in data
        
        chart = data["chart"]
        assert "ascendant" in chart
        assert "ascendant_english" in chart
        assert "planets" in chart
        assert len(chart["planets"]) == 9, f"Expected 9 planets, got {len(chart['planets'])}"
        
        # Verify houses dict has string keys 1-12
        assert "houses" in chart
        for i in range(1, 13):
            assert str(i) in chart["houses"], f"Missing house {i} in chart"
        
        # Verify advice is substantial (~700 words)
        word_count = len(data["advice"].split())
        assert word_count >= 300, f"Advice too short: {word_count} words"
        print(f"✓ Premium reading returned: ascendant={chart['ascendant_english']}, planets=9, advice={word_count} words")


# ============ INPUT VALIDATION ============

class TestInputValidation:
    """Input validation tests"""
    
    def test_invalid_date_format(self, api_client):
        """Invalid date format returns 422"""
        # Login as admin (premium)
        api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vedic.com",
            "password": os.environ.get("ADMIN_PASSWORD", "test1234")
        })
        
        response = api_client.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "15-05-1990",  # Wrong format
            "time_of_birth": "10:30",
            "place_of_birth": "Mumbai, India"
        })
        assert response.status_code == 422
        print("✓ Invalid date format returns 422")
    
    def test_invalid_time_format(self, api_client):
        """Invalid time format returns 422"""
        api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@vedic.com",
            "password": os.environ.get("ADMIN_PASSWORD", "test1234")
        })
        
        response = api_client.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "10:30:00",  # Wrong format
            "place_of_birth": "Mumbai, India"
        })
        assert response.status_code == 422
        print("✓ Invalid time format returns 422")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
