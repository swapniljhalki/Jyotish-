"""
Panchang & Festivals API Tests
Tests: GET /api/panchang/today, GET /api/festivals/upcoming
Both endpoints are PUBLIC (no auth required)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ============ FIXTURES ============

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============ PANCHANG ENDPOINT ============

class TestPanchangToday:
    """GET /api/panchang/today tests (public, no auth)"""
    
    def test_panchang_default_timezone(self, api_client):
        """GET /api/panchang/today returns panchang with default Asia/Kolkata timezone"""
        response = api_client.get(f"{BASE_URL}/api/panchang/today")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "date" in data
        assert "timezone" in data
        assert data["timezone"] == "Asia/Kolkata"
        
        # Verify tithi structure
        assert "tithi" in data
        tithi = data["tithi"]
        assert "name" in tithi
        assert "index" in tithi
        assert 1 <= tithi["index"] <= 30, f"Tithi index {tithi['index']} out of range 1-30"
        assert "paksha" in tithi
        assert tithi["paksha"] in ["Shukla", "Krishna"]
        assert "progress" in tithi
        assert 0 <= tithi["progress"] <= 100
        
        # Verify nakshatra structure
        assert "nakshatra" in data
        nak = data["nakshatra"]
        assert "name" in nak
        assert "index" in nak
        assert 1 <= nak["index"] <= 27, f"Nakshatra index {nak['index']} out of range 1-27"
        assert "pada" in nak
        assert 1 <= nak["pada"] <= 4, f"Nakshatra pada {nak['pada']} out of range 1-4"
        assert "progress" in nak
        assert 0 <= nak["progress"] <= 100
        
        # Verify yoga structure
        assert "yoga" in data
        yoga = data["yoga"]
        assert "name" in yoga
        assert "index" in yoga
        assert 1 <= yoga["index"] <= 27, f"Yoga index {yoga['index']} out of range 1-27"
        assert "progress" in yoga
        assert 0 <= yoga["progress"] <= 100
        
        # Verify vara structure
        assert "vara" in data
        vara = data["vara"]
        assert "sanskrit" in vara
        assert "english" in vara
        assert "lord" in vara
        
        # Verify sun/moon signs
        assert "sun_sign" in data
        assert "moon_sign" in data
        
        print(f"✓ Panchang: {tithi['name']} {tithi['paksha']}, {nak['name']} pada {nak['pada']}, {yoga['name']}, {vara['sanskrit']}")
    
    def test_panchang_custom_timezone(self, api_client):
        """GET /api/panchang/today?tz=America/New_York respects custom timezone"""
        response = api_client.get(f"{BASE_URL}/api/panchang/today?tz=America/New_York")
        assert response.status_code == 200
        data = response.json()
        
        assert data["timezone"] == "America/New_York"
        # Tithi may differ from Asia/Kolkata due to time difference
        assert "tithi" in data
        assert "nakshatra" in data
        assert "yoga" in data
        assert "vara" in data
        print(f"✓ Panchang (America/New_York): {data['tithi']['name']} {data['tithi']['paksha']}")
    
    def test_panchang_invalid_timezone(self, api_client):
        """GET /api/panchang/today?tz=Invalid/Timezone returns 400"""
        response = api_client.get(f"{BASE_URL}/api/panchang/today?tz=Invalid/Timezone")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Invalid timezone" in data["detail"]
        print("✓ Invalid timezone returns 400")
    
    def test_panchang_europe_timezone(self, api_client):
        """GET /api/panchang/today?tz=Europe/London works"""
        response = api_client.get(f"{BASE_URL}/api/panchang/today?tz=Europe/London")
        assert response.status_code == 200
        data = response.json()
        assert data["timezone"] == "Europe/London"
        print(f"✓ Panchang (Europe/London): {data['tithi']['name']}")
    
    def test_panchang_no_auth_required(self, api_client):
        """Panchang endpoint is public - no auth needed"""
        # Use fresh session without any cookies
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/panchang/today")
        assert response.status_code == 200
        print("✓ Panchang endpoint is public (no auth required)")


# ============ FESTIVALS ENDPOINT ============

class TestFestivalsUpcoming:
    """GET /api/festivals/upcoming tests (public, no auth)"""
    
    def test_festivals_default_limit(self, api_client):
        """GET /api/festivals/upcoming returns up to 6 festivals by default"""
        response = api_client.get(f"{BASE_URL}/api/festivals/upcoming")
        assert response.status_code == 200
        data = response.json()
        
        assert "festivals" in data
        festivals = data["festivals"]
        assert len(festivals) <= 6, f"Default limit should be 6, got {len(festivals)}"
        assert len(festivals) >= 1, "Should return at least 1 festival"
        
        # Verify structure of each festival
        for f in festivals:
            assert "date" in f
            assert "name" in f
            assert "description" in f
            assert "days_until" in f
            assert f["days_until"] >= 0, f"days_until should be >= 0, got {f['days_until']}"
            assert "weekday" in f
        
        print(f"✓ Festivals (default): {len(festivals)} festivals, next: {festivals[0]['name']}")
    
    def test_festivals_limit_4(self, api_client):
        """GET /api/festivals/upcoming?limit=4 returns exactly 4 festivals"""
        response = api_client.get(f"{BASE_URL}/api/festivals/upcoming?limit=4")
        assert response.status_code == 200
        data = response.json()
        
        festivals = data["festivals"]
        assert len(festivals) == 4, f"Expected 4 festivals, got {len(festivals)}"
        
        # Verify all have required fields
        for f in festivals:
            assert "date" in f
            assert "name" in f
            assert "description" in f
            assert "days_until" in f
            assert "weekday" in f
        
        print(f"✓ Festivals (limit=4): {[f['name'] for f in festivals]}")
    
    def test_festivals_limit_1(self, api_client):
        """GET /api/festivals/upcoming?limit=1 returns exactly 1 festival"""
        response = api_client.get(f"{BASE_URL}/api/festivals/upcoming?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        festivals = data["festivals"]
        assert len(festivals) == 1, f"Expected 1 festival, got {len(festivals)}"
        print(f"✓ Festivals (limit=1): {festivals[0]['name']}")
    
    def test_festivals_limit_clamped_to_20(self, api_client):
        """GET /api/festivals/upcoming?limit=100 is clamped to 20"""
        response = api_client.get(f"{BASE_URL}/api/festivals/upcoming?limit=100")
        assert response.status_code == 200
        data = response.json()
        
        festivals = data["festivals"]
        assert len(festivals) <= 20, f"Limit should be clamped to 20, got {len(festivals)}"
        print(f"✓ Festivals (limit=100 clamped): {len(festivals)} festivals")
    
    def test_festivals_limit_clamped_to_1(self, api_client):
        """GET /api/festivals/upcoming?limit=0 is clamped to 1"""
        response = api_client.get(f"{BASE_URL}/api/festivals/upcoming?limit=0")
        assert response.status_code == 200
        data = response.json()
        
        festivals = data["festivals"]
        assert len(festivals) >= 1, f"Limit should be clamped to at least 1, got {len(festivals)}"
        print(f"✓ Festivals (limit=0 clamped): {len(festivals)} festivals")
    
    def test_festivals_no_auth_required(self, api_client):
        """Festivals endpoint is public - no auth needed"""
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/festivals/upcoming")
        assert response.status_code == 200
        print("✓ Festivals endpoint is public (no auth required)")
    
    def test_festivals_structure_complete(self, api_client):
        """Verify complete festival structure with all fields"""
        response = api_client.get(f"{BASE_URL}/api/festivals/upcoming?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        f = data["festivals"][0]
        
        # Verify date format (YYYY-MM-DD)
        assert len(f["date"]) == 10
        assert f["date"][4] == "-" and f["date"][7] == "-"
        
        # Verify name is non-empty
        assert len(f["name"]) > 0
        
        # Verify description is non-empty
        assert len(f["description"]) > 0
        
        # Verify days_until is integer >= 0
        assert isinstance(f["days_until"], int)
        assert f["days_until"] >= 0
        
        # Verify weekday is valid
        valid_weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        assert f["weekday"] in valid_weekdays
        
        print(f"✓ Festival structure complete: {f['name']} on {f['date']} ({f['weekday']}), {f['days_until']} days away")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
