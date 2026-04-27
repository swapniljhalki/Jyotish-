"""
Dynamic Festival Computation Tests (iteration 5)
Verifies that compute_festivals_for_range / get_festivals_for_year in
backend/panchang.py produce Drik-Panchang-aligned dates for 2026.

The logic under test:
  - TITHI_FESTIVALS with 5-tuples (name, desc, tithi, lunar_month_rashi, kala_hour)
  - compute_festivals_for_range walks every day, tracks current Amanta lunar
    month, and matches tithi prevalence at each festival's kala hour.
  - Sankranti: sunset-based (before-sunset => today, else tomorrow).
  - Kshaya tithi handling for sunrise-based festivals.

Also covers /api/festivals/upcoming ordering + happy-path.
"""
import os
import sys
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Ensure we can import the panchang module directly for deterministic tests
sys.path.insert(0, '/app/backend')
from panchang import get_festivals_for_year, compute_festivals_for_range  # noqa: E402
from datetime import date  # noqa: E402


# --- Drik-aligned 2026 expected dates ---
DRIK_2026 = {
    "Makar Sankranti / Pongal": "2026-01-14",
    "Maha Shivaratri":          "2026-02-15",
    "Holi":                     "2026-03-04",
    "Ram Navami":               "2026-03-27",
    "Raksha Bandhan":           "2026-08-28",
    "Krishna Janmashtami":      "2026-09-04",
    "Ganesh Chaturthi":         "2026-09-14",
    "Vijayadashami / Dussehra": "2026-10-20",
    "Diwali":                   "2026-11-08",
    "Govardhan Puja":           "2026-11-10",
    "Bhai Dooj":                "2026-11-11",
}


@pytest.fixture(scope="module")
def festivals_2026():
    """Compute the full 2026 festival calendar once per module."""
    rows = get_festivals_for_year(2026)
    by_name = {}
    for f in rows:
        by_name.setdefault(f["name"], []).append(f["date"])
    return rows, by_name


# --- Direct computation tests (per-festival Drik alignment) ---
class TestDrikAlignment2026:
    @pytest.mark.parametrize("name,expected_date", list(DRIK_2026.items()))
    def test_festival_date_matches_drik(self, festivals_2026, name, expected_date):
        _, by_name = festivals_2026
        dates = by_name.get(name, [])
        assert dates, f"{name} not found in 2026 festival list"
        assert expected_date in dates, (
            f"{name} expected {expected_date} but got {dates}"
        )


class TestFestivalCalendarShape:
    def test_calendar_is_sorted(self, festivals_2026):
        rows, _ = festivals_2026
        dates = [f["date"] for f in rows]
        assert dates == sorted(dates), "Festival list must be chronologically sorted"

    def test_calendar_has_required_fields(self, festivals_2026):
        rows, _ = festivals_2026
        assert len(rows) >= 20, f"Expected >=20 festivals in 2026, got {len(rows)}"
        for f in rows:
            assert set(["date", "name", "description"]).issubset(f.keys())
            assert len(f["description"]) > 0
            # date format YYYY-MM-DD and belongs to 2026
            assert f["date"].startswith("2026-")

    def test_no_unexpected_duplicates_same_year(self, festivals_2026):
        """A festival (name, year) should appear at most once — except for
        Diwali / Naraka Chaturdashi that legitimately fall on the same day."""
        rows, _ = festivals_2026
        seen = {}
        for f in rows:
            k = f["name"]
            seen[k] = seen.get(k, 0) + 1
        for name, count in seen.items():
            assert count == 1, f"{name} appeared {count} times in 2026"

    def test_range_scan_matches_year_scan(self):
        """compute_festivals_for_range over the full year == get_festivals_for_year."""
        a = compute_festivals_for_range(date(2026, 1, 1), date(2026, 12, 31))
        b = get_festivals_for_year(2026)
        assert a == b


# --- /api/festivals/upcoming endpoint regression ---
class TestFestivalsUpcomingEndpoint:
    def test_endpoint_returns_sorted(self):
        r = requests.get(f"{BASE_URL}/api/festivals/upcoming?limit=8")
        assert r.status_code == 200
        festivals = r.json()["festivals"]
        assert len(festivals) <= 8 and len(festivals) >= 1
        dates = [f["date"] for f in festivals]
        assert dates == sorted(dates), "Upcoming festivals must be chronologically sorted"
        # days_until must be monotonic non-decreasing and >= 0
        last = -1
        for f in festivals:
            assert f["days_until"] >= 0
            assert f["days_until"] >= last
            last = f["days_until"]
            assert f["weekday"] in [
                "Monday", "Tuesday", "Wednesday", "Thursday",
                "Friday", "Saturday", "Sunday",
            ]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
