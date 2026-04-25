"""Real Parashari (sidereal Vedic) kundali computation using Swiss Ephemeris.

- Sidereal mode: Lahiri ayanamsa (Indian government standard, the most common in Parashari Jyotish)
- Houses: Whole-sign (the Parashari standard — first house = whole sign of ascendant)
- Ephemeris: Moshier semi-analytical model (no .se1 files required, sub-arcsecond accuracy)
- Inputs: local birth datetime + lat/lon + tz_name (resolved from place via geocode)
"""
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import swisseph as swe
from timezonefinder import TimezoneFinder

# Configure Swiss Ephemeris once at import time
swe.set_sid_mode(swe.SIDM_LAHIRI)

_TF = TimezoneFinder()

RASHIS = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]
RASHIS_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

PLANETS = [
    ("Su", "Sun", swe.SUN),
    ("Mo", "Moon", swe.MOON),
    ("Ma", "Mars", swe.MARS),
    ("Me", "Mercury", swe.MERCURY),
    ("Ju", "Jupiter", swe.JUPITER),
    ("Ve", "Venus", swe.VENUS),
    ("Sa", "Saturn", swe.SATURN),
    ("Ra", "Rahu", swe.MEAN_NODE),  # mean lunar node (north)
]
FLAGS = swe.FLG_SIDEREAL | swe.FLG_SPEED | swe.FLG_MOSEPH

# 27 nakshatras span the zodiac (each 13°20' = 800 arc-minutes)
NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
    "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati",
]


def resolve_timezone(lat: float, lon: float) -> Optional[str]:
    """IANA tz name (e.g. 'Asia/Kolkata') for the given coordinates."""
    return _TF.timezone_at(lat=lat, lng=lon) or _TF.closest_timezone_at(lat=lat, lng=lon)


def _nakshatra(longitude: float) -> dict:
    span = 360.0 / 27
    idx = int(longitude // span) % 27
    pada = int((longitude - idx * span) // (span / 4)) + 1  # 1..4
    return {"name": NAKSHATRA_NAMES[idx], "index": idx + 1, "pada": pada}


def compute_chart_from_local(
    local_year: int, local_month: int, local_day: int,
    local_hour: int, local_minute: int,
    lat: float, lon: float,
    place_name: str,
    tz_name: Optional[str] = None,
) -> dict:
    """Compute a sidereal/Parashari chart for the given local birth time + place."""
    if tz_name is None:
        tz_name = resolve_timezone(lat, lon)
    if tz_name is None:
        # Fallback to UTC; chart will still compute but ascendant accuracy depends on time
        tz_name = "UTC"
    tz = ZoneInfo(tz_name)
    local_dt = datetime(local_year, local_month, local_day,
                        local_hour, local_minute, tzinfo=tz)
    ut_dt = local_dt.astimezone(timezone.utc)
    ut_decimal = ut_dt.hour + ut_dt.minute / 60.0 + ut_dt.second / 3600.0
    jd = swe.julday(ut_dt.year, ut_dt.month, ut_dt.day, ut_decimal)

    # Ascendant via whole-sign houses (use 'W' = whole-sign)
    cusps, ascmc = swe.houses_ex(jd, lat, lon, b"W", FLAGS)
    asc_lon = ascmc[0] % 360
    asc_idx = int(asc_lon // 30)

    # Planets
    planets = []
    rahu_lon = None
    for code, name, pid in PLANETS:
        pos, _ = swe.calc_ut(jd, pid, FLAGS)
        lon_deg = pos[0] % 360
        speed = pos[3]
        rashi = int(lon_deg // 30)
        deg_in_sign = lon_deg - rashi * 30
        house = ((rashi - asc_idx) % 12) + 1
        nak = _nakshatra(lon_deg)
        planets.append({
            "code": code, "name": name,
            "longitude": round(lon_deg, 4),
            "rashi_index": rashi,
            "rashi": RASHIS[rashi],
            "rashi_english": RASHIS_EN[rashi],
            "degree": round(deg_in_sign, 2),
            "house": house,
            "retrograde": speed < 0,
            "nakshatra": nak["name"],
            "nakshatra_index": nak["index"],
            "nakshatra_pada": nak["pada"],
        })
        if code == "Ra":
            rahu_lon = lon_deg

    # Ketu = 180° opposite Rahu (always retrograde, no separate calc needed)
    if rahu_lon is not None:
        ketu_lon = (rahu_lon + 180) % 360
        rashi = int(ketu_lon // 30)
        deg_in_sign = ketu_lon - rashi * 30
        house = ((rashi - asc_idx) % 12) + 1
        nak = _nakshatra(ketu_lon)
        planets.append({
            "code": "Ke", "name": "Ketu",
            "longitude": round(ketu_lon, 4),
            "rashi_index": rashi,
            "rashi": RASHIS[rashi],
            "rashi_english": RASHIS_EN[rashi],
            "degree": round(deg_in_sign, 2),
            "house": house,
            "retrograde": True,
            "nakshatra": nak["name"],
            "nakshatra_index": nak["index"],
            "nakshatra_pada": nak["pada"],
        })

    # Houses (string keys for BSON)
    houses_map = {str(i): [] for i in range(1, 13)}
    for p in planets:
        houses_map[str(p["house"])].append(p["code"])

    house_signs = {str(i): (asc_idx + i - 1) % 12 for i in range(1, 13)}

    asc_nak = _nakshatra(asc_lon)
    return {
        "engine": "swiss-ephemeris-lahiri-whole-sign",
        "ascendant_index": asc_idx,
        "ascendant": RASHIS[asc_idx],
        "ascendant_english": RASHIS_EN[asc_idx],
        "ascendant_longitude": round(asc_lon, 4),
        "ascendant_degree": round(asc_lon - asc_idx * 30, 2),
        "ascendant_nakshatra": asc_nak["name"],
        "ascendant_nakshatra_pada": asc_nak["pada"],
        "place_of_birth": place_name,
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "timezone": tz_name,
        "date_of_birth": local_dt.date().isoformat(),
        "time_of_birth": local_dt.strftime("%H:%M"),
        "planets": planets,
        "houses": houses_map,
        "house_signs": house_signs,
    }
