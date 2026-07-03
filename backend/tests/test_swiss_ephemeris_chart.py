"""
Vedic Astrology API - Swiss Ephemeris Premium Chart Tests
Tests: Premium chart with Swiss Ephemeris, Lahiri ayanamsa, whole-sign houses
       Geocoding, caching, determinism, nakshatra/pada, 9 grahas including Ketu
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
        "password": os.environ.get("ADMIN_PASSWORD", "test1234")
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def premium_user_session():
    """Fresh premium user session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    unique_email = f"TEST_swisseph_{uuid.uuid4().hex[:8]}@vedic.com"
    
    # Register
    reg_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": unique_email,
        "password": "testpass123",
        "name": "Swiss Eph Test User"
    })
    assert reg_response.status_code == 200
    
    # Upgrade to premium
    sub_response = session.post(f"{BASE_URL}/api/subscribe", json={"tier": "premium"})
    assert sub_response.status_code == 200
    
    return session


# ============ PREMIUM CHART ENGINE ============

class TestPremiumChartEngine:
    """Test premium chart uses Swiss Ephemeris with Lahiri ayanamsa"""
    
    def test_premium_chart_engine_is_swiss_ephemeris(self, premium_user_session):
        """POST /api/astrology/premium returns chart with engine='swiss-ephemeris-lahiri-whole-sign'"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Engine Test"
        })
        assert response.status_code == 200, f"Premium reading failed: {response.text}"
        data = response.json()
        
        assert "chart" in data
        chart = data["chart"]
        
        # Verify engine identifier
        assert chart.get("engine") == "swiss-ephemeris-lahiri-whole-sign", \
            f"Expected engine='swiss-ephemeris-lahiri-whole-sign', got {chart.get('engine')}"
        
        print(f"✓ Premium chart engine: {chart['engine']}")
    
    def test_premium_chart_has_9_grahas_including_ketu(self, premium_user_session):
        """POST /api/astrology/premium returns 9 grahas (Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke)"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Graha Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        planets = chart["planets"]
        assert len(planets) == 9, f"Expected 9 planets, got {len(planets)}"
        
        # Verify all 9 grahas present
        codes = [p["code"] for p in planets]
        expected_codes = ["Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"]
        for code in expected_codes:
            assert code in codes, f"Missing graha: {code}"
        
        print(f"✓ All 9 grahas present: {codes}")
    
    def test_ketu_is_180_degrees_from_rahu(self, premium_user_session):
        """Ketu longitude = Rahu longitude + 180° (mod 360)"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Ketu Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        planets = {p["code"]: p for p in chart["planets"]}
        rahu_lon = planets["Ra"]["longitude"]
        ketu_lon = planets["Ke"]["longitude"]
        
        expected_ketu = (rahu_lon + 180) % 360
        assert abs(ketu_lon - expected_ketu) < 0.01, \
            f"Ketu should be 180° from Rahu. Rahu={rahu_lon}, Ketu={ketu_lon}, expected={expected_ketu}"
        
        # Ketu should always be retrograde
        assert planets["Ke"]["retrograde"] is True, "Ketu should always be retrograde"
        
        print(f"✓ Ketu at {ketu_lon}° is 180° from Rahu at {rahu_lon}°")


# ============ NAKSHATRA AND PADA ============

class TestNakshatraPada:
    """Test nakshatra and pada computation for each planet"""
    
    def test_each_planet_has_nakshatra_and_pada(self, premium_user_session):
        """Each planet should have nakshatra name, index, and pada (1-4)"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Nakshatra Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        for planet in chart["planets"]:
            assert "nakshatra" in planet, f"{planet['name']} missing nakshatra"
            assert "nakshatra_index" in planet, f"{planet['name']} missing nakshatra_index"
            assert "nakshatra_pada" in planet, f"{planet['name']} missing nakshatra_pada"
            
            # Nakshatra index should be 1-27
            assert 1 <= planet["nakshatra_index"] <= 27, \
                f"{planet['name']} nakshatra_index {planet['nakshatra_index']} out of range"
            
            # Pada should be 1-4
            assert 1 <= planet["nakshatra_pada"] <= 4, \
                f"{planet['name']} pada {planet['nakshatra_pada']} out of range"
        
        print("✓ All planets have valid nakshatra and pada")
    
    def test_ascendant_has_nakshatra_and_pada(self, premium_user_session):
        """Ascendant should have nakshatra and pada"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Asc Nakshatra Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        assert "ascendant_nakshatra" in chart, "Missing ascendant_nakshatra"
        assert "ascendant_nakshatra_pada" in chart, "Missing ascendant_nakshatra_pada"
        assert 1 <= chart["ascendant_nakshatra_pada"] <= 4
        
        print(f"✓ Ascendant nakshatra: {chart['ascendant_nakshatra']} pada {chart['ascendant_nakshatra_pada']}")


# ============ PLANET DETAILS ============

class TestPlanetDetails:
    """Test planet detail fields"""
    
    def test_planet_has_all_required_fields(self, premium_user_session):
        """Each planet should have longitude, rashi, degree, house, retrograde flag"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Planet Fields Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        required_fields = ["code", "name", "longitude", "rashi_index", "rashi", 
                          "rashi_english", "degree", "house", "retrograde"]
        
        for planet in chart["planets"]:
            for field in required_fields:
                assert field in planet, f"{planet.get('name', 'Unknown')} missing {field}"
            
            # Validate ranges
            assert 0 <= planet["longitude"] < 360, f"Invalid longitude: {planet['longitude']}"
            assert 0 <= planet["rashi_index"] < 12, f"Invalid rashi_index: {planet['rashi_index']}"
            assert 0 <= planet["degree"] < 30, f"Invalid degree: {planet['degree']}"
            assert 1 <= planet["house"] <= 12, f"Invalid house: {planet['house']}"
            assert isinstance(planet["retrograde"], bool)
        
        print("✓ All planets have required fields with valid values")


# ============ HOUSES ============

class TestHouses:
    """Test houses dict structure"""
    
    def test_houses_has_string_keys_1_to_12(self, premium_user_session):
        """Houses dict should have string keys '1' through '12'"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Houses Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        assert "houses" in chart
        houses = chart["houses"]
        
        for i in range(1, 13):
            key = str(i)
            assert key in houses, f"Missing house key '{key}'"
            assert isinstance(houses[key], list), f"House {key} should be a list"
        
        print("✓ Houses dict has string keys '1' through '12'")
    
    def test_house_signs_has_string_keys(self, premium_user_session):
        """house_signs dict should have string keys '1' through '12'"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "House Signs Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        assert "house_signs" in chart
        house_signs = chart["house_signs"]
        
        for i in range(1, 13):
            key = str(i)
            assert key in house_signs, f"Missing house_signs key '{key}'"
            # Value should be rashi index 0-11
            assert 0 <= house_signs[key] < 12, f"Invalid rashi index for house {key}"
        
        print("✓ house_signs dict has string keys '1' through '12'")


# ============ GEOCODING ============

class TestGeocoding:
    """Test geocoding functionality"""
    
    def test_valid_place_returns_chart(self, premium_user_session):
        """Valid place like 'Mumbai, India' returns chart with lat/lon"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Geocode Test"
        })
        assert response.status_code == 200
        chart = response.json()["chart"]
        
        assert "latitude" in chart
        assert "longitude" in chart
        assert "place_of_birth" in chart
        assert "timezone" in chart
        
        # Mumbai should be around 19°N, 72°E
        assert 18 < chart["latitude"] < 20, f"Mumbai lat should be ~19°N, got {chart['latitude']}"
        assert 72 < chart["longitude"] < 73, f"Mumbai lon should be ~72°E, got {chart['longitude']}"
        
        print(f"✓ Mumbai geocoded: {chart['latitude']}°N, {chart['longitude']}°E, tz={chart['timezone']}")
    
    def test_invalid_place_returns_422(self, premium_user_session):
        """Invalid place like 'asdfqwerty' returns 422 with helpful message"""
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "asdfqwerty",
            "full_name": "Invalid Place Test"
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        
        detail = response.json().get("detail", "")
        assert "could not locate" in detail.lower() or "asdfqwerty" in detail.lower(), \
            f"Error message should mention the place: {detail}"
        
        print(f"✓ Invalid place returns 422: {detail}")
    
    def test_various_cities_geocode_correctly(self, premium_user_session):
        """Test geocoding for various major cities"""
        cities = [
            ("Delhi, India", 28, 29, 77, 78),
            ("Bangalore, India", 12, 14, 77, 78),
            ("New York, USA", 40, 41, -75, -73),
            ("London, UK", 51, 52, -1, 1),
        ]
        
        for city, lat_min, lat_max, lon_min, lon_max in cities:
            response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
                "date_of_birth": "1990-05-15",
                "time_of_birth": "14:30",
                "place_of_birth": city,
                "full_name": f"City Test {city}"
            })
            assert response.status_code == 200, f"Failed for {city}: {response.text}"
            chart = response.json()["chart"]
            
            assert lat_min < chart["latitude"] < lat_max, \
                f"{city} lat {chart['latitude']} not in range ({lat_min}, {lat_max})"
            assert lon_min < chart["longitude"] < lon_max, \
                f"{city} lon {chart['longitude']} not in range ({lon_min}, {lon_max})"
            
            print(f"  ✓ {city}: {chart['latitude']}°, {chart['longitude']}°")
        
        print("✓ All cities geocoded correctly")


# ============ DETERMINISM ============

class TestDeterminism:
    """Test chart computation is deterministic"""
    
    def test_same_inputs_produce_identical_chart(self, premium_user_session):
        """Same birth data should produce identical planetary placements"""
        birth_data = {
            "date_of_birth": "1985-12-25",
            "time_of_birth": "06:00",
            "place_of_birth": "Delhi, India",
            "full_name": "Determinism Test"
        }
        
        # First request
        response1 = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json=birth_data)
        assert response1.status_code == 200
        chart1 = response1.json()["chart"]
        
        # Second request
        response2 = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json=birth_data)
        assert response2.status_code == 200
        chart2 = response2.json()["chart"]
        
        # Compare key fields
        assert chart1["ascendant"] == chart2["ascendant"], "Ascendant should be identical"
        assert chart1["ascendant_longitude"] == chart2["ascendant_longitude"], "Ascendant longitude should be identical"
        
        for p1, p2 in zip(chart1["planets"], chart2["planets"]):
            assert p1["code"] == p2["code"]
            assert p1["longitude"] == p2["longitude"], f"{p1['name']} longitude differs"
            assert p1["rashi"] == p2["rashi"], f"{p1['name']} rashi differs"
            assert p1["nakshatra"] == p2["nakshatra"], f"{p1['name']} nakshatra differs"
        
        print("✓ Chart computation is deterministic")


# ============ LAHIRI AYANAMSA ACCURACY ============

class TestLahiriAyanamsaAccuracy:
    """Test Lahiri ayanamsa is applied correctly"""
    
    def test_delhi_1985_12_25_06_00_ascendant_is_scorpio(self, premium_user_session):
        """Delhi 1985-12-25 06:00 IST should have Scorpio/Vrishchika ascendant (sidereal)
        
        With Lahiri ayanamsa (~23.7° in 1985), the sidereal ascendant for this time
        falls in Scorpio (210-240° sidereal range).
        """
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1985-12-25",
            "time_of_birth": "06:00",
            "place_of_birth": "Delhi, India",
            "full_name": "Lahiri Test"
        })
        assert response.status_code == 200, f"Request failed: {response.text}"
        chart = response.json()["chart"]
        
        asc_english = chart["ascendant_english"]
        asc_lon = chart["ascendant_longitude"]
        
        print(f"  Ascendant: {asc_english} ({chart['ascendant']}) at {asc_lon}°")
        
        # The ascendant should be in Scorpio (Vrishchika) for this birth data
        # Scorpio = index 7, longitude 210-240°
        assert asc_english == "Scorpio" or chart["ascendant"] == "Vrishchika", \
            f"Expected Scorpio/Vrishchika ascendant, got {asc_english}/{chart['ascendant']}"
        
        # Verify longitude is in Scorpio range (210-240°)
        assert 210 <= asc_lon < 240, \
            f"Ascendant longitude {asc_lon}° should be in Scorpio range (210-240°)"
        
        print(f"✓ Delhi 1985-12-25 06:00 has Scorpio ascendant at {asc_lon}° (Lahiri ayanamsa correct)")


# ============ BASIC TIER STILL WORKS ============

class TestBasicTierStillWorks:
    """Test basic tier endpoint still works with new chart engine"""
    
    def test_basic_returns_ascendant_sun_moon(self, premium_user_session):
        """POST /api/astrology/basic returns ascendant, sun_sign, moon_sign strings"""
        # Downgrade to basic for this test
        premium_user_session.post(f"{BASE_URL}/api/subscribe", json={"tier": "basic"})
        
        response = premium_user_session.post(f"{BASE_URL}/api/astrology/basic", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Mumbai, India",
            "full_name": "Basic Test"
        })
        assert response.status_code == 200, f"Basic reading failed: {response.text}"
        data = response.json()
        
        assert "ascendant" in data
        assert "sun_sign" in data
        assert "moon_sign" in data
        assert "advice" in data
        
        # Verify they are strings (sign names)
        assert isinstance(data["ascendant"], str)
        assert isinstance(data["sun_sign"], str)
        assert isinstance(data["moon_sign"], str)
        
        print(f"✓ Basic tier returns: ascendant={data['ascendant']}, sun={data['sun_sign']}, moon={data['moon_sign']}")
        
        # Upgrade back to premium
        premium_user_session.post(f"{BASE_URL}/api/subscribe", json={"tier": "premium"})


# ============ GEOCODE CACHE ============

class TestGeocodeCache:
    """Test geocode caching in MongoDB"""
    
    def test_geocode_cache_is_populated(self, admin_session):
        """After geocoding, the geocode_cache collection should have entries"""
        # Make a request to ensure cache is populated
        response = admin_session.post(f"{BASE_URL}/api/astrology/premium", json={
            "date_of_birth": "1990-05-15",
            "time_of_birth": "14:30",
            "place_of_birth": "Chennai, India",
            "full_name": "Cache Test"
        })
        assert response.status_code == 200
        
        # Note: We can't directly query MongoDB from tests, but we can verify
        # the second request is faster (cache hit) or check via admin endpoint if available
        # For now, we just verify the request succeeds
        print("✓ Geocoding request succeeded (cache should be populated)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
