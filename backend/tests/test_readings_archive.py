"""
Vedic Astrology API - Readings Archive & Sharing Tests
Tests: GET /api/readings (list), GET /api/readings/{id}, DELETE /api/readings/{id},
       POST /api/readings/{id}/share, GET /api/public/readings/{token}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ FIXTURES ============

@pytest.fixture(scope="module")
def admin_session():
    """Admin authenticated session (premium tier)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@vedic.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def testuser_session():
    """Test user authenticated session (premium tier)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@vedic.com",
        "password": "test1234"
    })
    assert response.status_code == 200, f"Testuser login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def fresh_basic_user_session():
    """Fresh user with basic tier for testing new reading creation"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    unique_email = f"TEST_archive_{uuid.uuid4().hex[:8]}@vedic.com"
    
    # Register
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": unique_email,
        "password": "testpass123",
        "name": "Archive Test User"
    })
    assert reg_response.status_code == 200
    
    # Upgrade to basic
    sub_response = session.post(f"{BASE_URL}/api/subscribe", json={"tier": "basic"})
    assert sub_response.status_code == 200
    
    return session


# ============ READINGS LIST ============

class TestReadingsList:
    """GET /api/readings - list user's readings"""
    
    def test_list_readings_requires_auth(self):
        """GET /api/readings without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/readings")
        assert response.status_code == 401
        print("✓ GET /api/readings without auth returns 401")
    
    def test_list_readings_returns_user_readings(self, admin_session):
        """GET /api/readings returns current user's readings"""
        response = admin_session.get(f"{BASE_URL}/api/readings")
        assert response.status_code == 200
        data = response.json()
        
        assert "readings" in data
        assert isinstance(data["readings"], list)
        
        # Admin should have readings from previous tests
        if len(data["readings"]) > 0:
            reading = data["readings"][0]
            # Verify structure - should have summary, advice_preview, NOT full advice or inputs
            assert "id" in reading
            assert "tier" in reading
            assert "created_at" in reading
            assert "advice_preview" in reading
            # Should NOT have full advice or inputs in list view
            assert "advice" not in reading, "List view should not include full advice"
            assert "inputs" not in reading, "List view should not include inputs (PII)"
        
        print(f"✓ GET /api/readings returned {len(data['readings'])} readings")
    
    def test_list_readings_empty_for_new_user(self, fresh_basic_user_session):
        """GET /api/readings returns empty list for new user"""
        response = fresh_basic_user_session.get(f"{BASE_URL}/api/readings")
        assert response.status_code == 200
        data = response.json()
        
        assert "readings" in data
        assert len(data["readings"]) == 0
        print("✓ GET /api/readings returns empty list for new user")


# ============ GET SINGLE READING ============

class TestGetReading:
    """GET /api/readings/{id} - get full reading"""
    
    def test_get_reading_requires_auth(self):
        """GET /api/readings/{id} without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/readings/some-id")
        assert response.status_code == 401
        print("✓ GET /api/readings/{id} without auth returns 401")
    
    def test_get_reading_owner_access(self, admin_session):
        """GET /api/readings/{id} returns full reading to owner"""
        # First get list to find a reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        reading_id = readings[0]["id"]
        
        # Get full reading
        response = admin_session.get(f"{BASE_URL}/api/readings/{reading_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == reading_id
        assert "tier" in data
        assert "advice" in data  # Full advice should be present
        assert "created_at" in data
        print(f"✓ GET /api/readings/{reading_id} returns full reading to owner")
    
    def test_get_reading_non_owner_returns_404(self, admin_session, testuser_session):
        """GET /api/readings/{id} returns 404 for non-owner"""
        # Get admin's reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        admin_reading_id = readings[0]["id"]
        
        # Try to access as testuser
        response = testuser_session.get(f"{BASE_URL}/api/readings/{admin_reading_id}")
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
        print(f"✓ GET /api/readings/{admin_reading_id} returns 404 for non-owner")
    
    def test_get_reading_nonexistent_returns_404(self, admin_session):
        """GET /api/readings/{id} returns 404 for non-existent reading"""
        fake_id = str(uuid.uuid4())
        response = admin_session.get(f"{BASE_URL}/api/readings/{fake_id}")
        assert response.status_code == 404
        print("✓ GET /api/readings/{fake_id} returns 404 for non-existent reading")


# ============ DELETE READING ============

class TestDeleteReading:
    """DELETE /api/readings/{id} - delete reading"""
    
    def test_delete_reading_requires_auth(self):
        """DELETE /api/readings/{id} without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.delete(f"{BASE_URL}/api/readings/some-id")
        assert response.status_code == 401
        print("✓ DELETE /api/readings/{id} without auth returns 401")
    
    def test_delete_reading_non_owner_returns_404(self, admin_session, testuser_session):
        """DELETE /api/readings/{id} returns 404 for non-owner"""
        # Get admin's reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        admin_reading_id = readings[0]["id"]
        
        # Try to delete as testuser
        response = testuser_session.delete(f"{BASE_URL}/api/readings/{admin_reading_id}")
        assert response.status_code == 404
        print(f"✓ DELETE /api/readings/{admin_reading_id} returns 404 for non-owner")
    
    def test_delete_reading_nonexistent_returns_404(self, admin_session):
        """DELETE /api/readings/{id} returns 404 for non-existent reading"""
        fake_id = str(uuid.uuid4())
        response = admin_session.delete(f"{BASE_URL}/api/readings/{fake_id}")
        assert response.status_code == 404
        print("✓ DELETE /api/readings/{fake_id} returns 404 for non-existent reading")


# ============ SHARE TOGGLE ============

class TestShareToggle:
    """POST /api/readings/{id}/share - toggle sharing"""
    
    def test_share_requires_auth(self):
        """POST /api/readings/{id}/share without auth returns 401"""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/readings/some-id/share", json={"enabled": True})
        assert response.status_code == 401
        print("✓ POST /api/readings/{id}/share without auth returns 401")
    
    def test_share_enable_returns_token(self, admin_session):
        """POST /api/readings/{id}/share {enabled:true} returns share_token"""
        # Get a reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        reading_id = readings[0]["id"]
        
        # Enable sharing
        response = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_shared"] == True
        assert "share_token" in data
        assert len(data["share_token"]) > 10  # Token should be substantial
        print(f"✓ Share enabled, token: {data['share_token'][:10]}...")
    
    def test_share_disable_clears_is_shared(self, admin_session):
        """POST /api/readings/{id}/share {enabled:false} clears is_shared"""
        # Get a reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        reading_id = readings[0]["id"]
        
        # First enable sharing
        admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        
        # Then disable
        response = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": False}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_shared"] == False
        # Token should NOT be returned when disabling
        assert "share_token" not in data or data.get("share_token") is None
        print("✓ Share disabled, is_shared=false")
    
    def test_share_reenable_reuses_token(self, admin_session):
        """POST /api/readings/{id}/share re-enable reuses same token"""
        # Get a reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        reading_id = readings[0]["id"]
        
        # Enable sharing
        enable1 = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        token1 = enable1.json()["share_token"]
        
        # Disable
        admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": False}
        )
        
        # Re-enable
        enable2 = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        token2 = enable2.json()["share_token"]
        
        assert token1 == token2, "Token should be reused on re-enable"
        print(f"✓ Token reused on re-enable: {token1}")
    
    def test_share_non_owner_returns_404(self, admin_session, testuser_session):
        """POST /api/readings/{id}/share returns 404 for non-owner"""
        # Get admin's reading ID
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        admin_reading_id = readings[0]["id"]
        
        # Try to share as testuser
        response = testuser_session.post(
            f"{BASE_URL}/api/readings/{admin_reading_id}/share",
            json={"enabled": True}
        )
        assert response.status_code == 404
        print("✓ Share toggle returns 404 for non-owner")


# ============ PUBLIC READING ============

class TestPublicReading:
    """GET /api/public/readings/{token} - public reading access"""
    
    def test_public_reading_no_auth_required(self, admin_session):
        """GET /api/public/readings/{token} works without auth"""
        # Get a reading and enable sharing
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        reading_id = readings[0]["id"]
        
        # Enable sharing
        share_response = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        token = share_response.json()["share_token"]
        
        # Access without auth
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/public/readings/{token}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify sanitized response
        assert "id" in data
        assert "tier" in data
        assert "advice" in data
        assert "author_name" in data
        assert "created_at" in data
        
        # Should NOT have PII
        assert "user_id" not in data, "Public reading should not expose user_id"
        assert "inputs" not in data, "Public reading should not expose inputs"
        
        print(f"✓ Public reading accessible without auth, author: {data['author_name']}")
    
    def test_public_reading_returns_404_when_not_shared(self, admin_session):
        """GET /api/public/readings/{token} returns 404 when is_shared=false"""
        # Get a reading and enable then disable sharing
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        if len(readings) == 0:
            pytest.skip("No readings available for admin")
        
        reading_id = readings[0]["id"]
        
        # Enable sharing to get token
        share_response = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        token = share_response.json()["share_token"]
        
        # Disable sharing
        admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": False}
        )
        
        # Try to access
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/public/readings/{token}")
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower() or "no longer shared" in response.json().get("detail", "").lower()
        print("✓ Public reading returns 404 when sharing disabled")
        
        # Re-enable for other tests
        admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
    
    def test_public_reading_invalid_token_returns_404(self):
        """GET /api/public/readings/{token} returns 404 for invalid token"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/public/readings/invalid_token_xyz123")
        assert response.status_code == 404
        print("✓ Public reading returns 404 for invalid token")
    
    def test_public_reading_premium_includes_chart(self, admin_session):
        """GET /api/public/readings/{token} includes chart for premium readings"""
        # Find a premium reading
        list_response = admin_session.get(f"{BASE_URL}/api/readings")
        readings = list_response.json()["readings"]
        
        premium_reading = next((r for r in readings if r["tier"] == "premium"), None)
        if not premium_reading:
            pytest.skip("No premium readings available")
        
        reading_id = premium_reading["id"]
        
        # Enable sharing
        share_response = admin_session.post(
            f"{BASE_URL}/api/readings/{reading_id}/share",
            json={"enabled": True}
        )
        token = share_response.json()["share_token"]
        
        # Access public
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/public/readings/{token}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "premium"
        assert "chart" in data, "Premium public reading should include chart"
        print("✓ Premium public reading includes chart")


# ============ NEW READING CREATION WITH SUMMARY ============

class TestNewReadingCreation:
    """Test that new readings store summary and is_shared fields"""
    
    def test_basic_reading_stores_summary_and_is_shared(self, fresh_basic_user_session):
        """POST /api/astrology/basic stores summary and is_shared=false"""
        # Cast a basic reading
        response = fresh_basic_user_session.post(f"{BASE_URL}/api/astrology/basic", json={
            "date_of_birth": "1995-03-20",
            "time_of_birth": "14:30",
            "place_of_birth": "Chennai, India",
            "full_name": "Test Archive User"
        })
        
        assert response.status_code == 200, f"Basic reading failed: {response.text}"
        data = response.json()
        
        # Verify response has id
        assert "id" in data
        reading_id = data["id"]
        
        # Verify summary fields in response
        assert "ascendant" in data
        assert "sun_sign" in data
        assert "moon_sign" in data
        
        # Fetch the reading to verify stored fields
        get_response = fresh_basic_user_session.get(f"{BASE_URL}/api/readings/{reading_id}")
        assert get_response.status_code == 200
        stored = get_response.json()
        
        # Verify summary is stored
        assert "summary" in stored, "Reading should have summary field"
        if stored["summary"]:
            assert "ascendant" in stored["summary"]
            assert "sun_sign" in stored["summary"]
            assert "moon_sign" in stored["summary"]
        
        # Verify is_shared defaults to false
        assert stored.get("is_shared") == False, "New reading should have is_shared=false"
        
        print(f"✓ Basic reading created with summary and is_shared=false")
        
        # Cleanup - delete the reading
        fresh_basic_user_session.delete(f"{BASE_URL}/api/readings/{reading_id}")


# ============ DELETE READING FULL FLOW ============

class TestDeleteReadingFullFlow:
    """Test delete reading with verification"""
    
    def test_delete_own_reading_removes_it(self, fresh_basic_user_session):
        """DELETE /api/readings/{id} removes reading from list"""
        # Cast a reading
        create_response = fresh_basic_user_session.post(f"{BASE_URL}/api/astrology/basic", json={
            "date_of_birth": "1992-07-15",
            "time_of_birth": "09:00",
            "place_of_birth": "Bangalore, India",
            "full_name": "Delete Test User"
        })
        
        assert create_response.status_code == 200
        reading_id = create_response.json()["id"]
        
        # Verify it's in the list
        list_response = fresh_basic_user_session.get(f"{BASE_URL}/api/readings")
        reading_ids = [r["id"] for r in list_response.json()["readings"]]
        assert reading_id in reading_ids, "Reading should be in list after creation"
        
        # Delete it
        delete_response = fresh_basic_user_session.delete(f"{BASE_URL}/api/readings/{reading_id}")
        assert delete_response.status_code == 200
        assert delete_response.json().get("ok") == True
        
        # Verify it's gone from list
        list_response2 = fresh_basic_user_session.get(f"{BASE_URL}/api/readings")
        reading_ids2 = [r["id"] for r in list_response2.json()["readings"]]
        assert reading_id not in reading_ids2, "Reading should be removed from list after delete"
        
        # Verify GET returns 404
        get_response = fresh_basic_user_session.get(f"{BASE_URL}/api/readings/{reading_id}")
        assert get_response.status_code == 404
        
        print("✓ Delete reading removes it from list and returns 404 on GET")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
