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

from dasha import compute_vimshottari
from num_dasha import compute_numerology_dasha
from numerology import compute_mulank

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
    # Outer planets — included for modern interpretation alongside the 9 grahas.
    # Not part of classical Parashari but commonly added in contemporary readings.
    ("Ur", "Uranus", swe.URANUS),
    ("Ne", "Neptune", swe.NEPTUNE),
]
FLAGS = swe.FLG_SIDEREAL | swe.FLG_SPEED | swe.FLG_MOSEPH

# Classical exaltation: planet code → (rashi index 0..11, peak degree within sign)
EXALTATION = {
    "Su": (0, 10),    # Aries 10°
    "Mo": (1, 3),     # Taurus 3°
    "Ma": (9, 28),    # Capricorn 28°
    "Me": (5, 15),    # Virgo 15°
    "Ju": (3, 5),     # Cancer 5°
    "Ve": (11, 27),   # Pisces 27°
    "Sa": (6, 20),    # Libra 20°
    "Ra": (1, 20),    # Taurus 20°
    "Ke": (7, 20),    # Scorpio 20°
}
DEBILITATION = {  # 180° opposite of exaltation
    "Su": (6, 10),    # Libra
    "Mo": (7, 3),     # Scorpio
    "Ma": (3, 28),    # Cancer
    "Me": (11, 15),   # Pisces
    "Ju": (9, 5),     # Capricorn
    "Ve": (5, 27),    # Virgo
    "Sa": (0, 20),    # Aries
    "Ra": (7, 20),    # Scorpio
    "Ke": (1, 20),    # Taurus
}
# Combustion orbs in degrees (Drik tradition). Not applicable to Sun, nodes, outer planets.
COMBUST_ORB = {
    "Mo": 12.0,
    "Ma": 17.0,
    "Me": 12.0,        # tradition: 14° if direct, ~12° if combust by close conjunction
    "Ju": 11.0,
    "Ve": 8.0,         # 10° when retrograde — handled inline
    "Sa": 15.0,
}

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


def _navamsha_sign(longitude: float) -> int:
    """D9 Navamsha sign index (0..11) for a sidereal longitude.

    Each rashi (30°) is divided into 9 navamshas of 3°20' each. Across the
    full zodiac that yields 108 navamshas; the resulting sign cycles 9 times.
    The unified formula `int(longitude / (30/9)) % 12` correctly applies the
    movable / fixed / dual starting-sign rules of Parashari tradition.
    """
    return int(longitude / (30.0 / 9)) % 12


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
        nav_sign = _navamsha_sign(lon_deg)
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
            "navamsha_sign_index": nav_sign,
            "navamsha_sign": RASHIS[nav_sign],
            "navamsha_sign_english": RASHIS_EN[nav_sign],
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
        nav_sign = _navamsha_sign(ketu_lon)
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
            "navamsha_sign_index": nav_sign,
            "navamsha_sign": RASHIS[nav_sign],
            "navamsha_sign_english": RASHIS_EN[nav_sign],
        })

    # --- Compute classical states for each planet ---
    sun_lon = next((p["longitude"] for p in planets if p["code"] == "Su"), None)
    for p in planets:
        states: list[str] = []
        # Retrograde — skip nodes (Rahu/Ketu always retrograde by convention)
        if p["retrograde"] and p["code"] not in ("Ra", "Ke"):
            states.append("Retrograde")
        # Combust (Asta) — only classical inner/outer planets, not Sun/nodes/outer modern
        if sun_lon is not None and p["code"] in COMBUST_ORB:
            sep = abs((p["longitude"] - sun_lon + 180) % 360 - 180)
            orb = COMBUST_ORB[p["code"]]
            if p["code"] == "Ve" and p["retrograde"]:
                orb = 10.0
            if sep <= orb:
                states.append("Combust")
        # Exalted (Uchcha) / Debilitated (Neecha)
        if p["code"] in EXALTATION:
            ex_sign, _ = EXALTATION[p["code"]]
            de_sign, _ = DEBILITATION[p["code"]]
            if p["rashi_index"] == ex_sign:
                states.append("Exalted")
            elif p["rashi_index"] == de_sign:
                states.append("Debilitated")
        # Vargottam — same sign in D1 (rashi) and D9 (navamsha)
        if p["rashi_index"] == p["navamsha_sign_index"]:
            states.append("Vargottam")
        p["states"] = states

    # Houses (string keys for BSON)
    houses_map = {str(i): [] for i in range(1, 13)}
    for p in planets:
        houses_map[str(p["house"])].append(p["code"])

    house_signs = {str(i): (asc_idx + i - 1) % 12 for i in range(1, 13)}

    # --- Chandra Lagna (Moon-sign) chart ---
    # Treat the Moon's rashi as the 1st house; redistribute all planets accordingly.
    moon = next((p for p in planets if p["code"] == "Mo"), None)
    chandra_chart = None
    if moon:
        moon_idx = moon["rashi_index"]
        ch_houses_map = {str(i): [] for i in range(1, 13)}
        for p in planets:
            ch = ((p["rashi_index"] - moon_idx) % 12) + 1
            ch_houses_map[str(ch)].append(p["code"])
        ch_house_signs = {str(i): (moon_idx + i - 1) % 12 for i in range(1, 13)}
        chandra_chart = {
            "ascendant_index": moon_idx,
            "ascendant": RASHIS[moon_idx],
            "ascendant_english": RASHIS_EN[moon_idx],
            "houses": ch_houses_map,
            "house_signs": ch_house_signs,
        }

    # --- D9 Navamsha (marriage / dharma) chart ---
    # Navamsha ascendant uses the same _navamsha_sign formula on asc longitude.
    nav_asc_idx = _navamsha_sign(asc_lon)
    nav_houses_map = {str(i): [] for i in range(1, 13)}
    for p in planets:
        ns = p["navamsha_sign_index"]
        nh = ((ns - nav_asc_idx) % 12) + 1
        nav_houses_map[str(nh)].append(p["code"])
    nav_house_signs = {str(i): (nav_asc_idx + i - 1) % 12 for i in range(1, 13)}
    navamsha_chart = {
        "ascendant_index": nav_asc_idx,
        "ascendant": RASHIS[nav_asc_idx],
        "ascendant_english": RASHIS_EN[nav_asc_idx],
        "houses": nav_houses_map,
        "house_signs": nav_house_signs,
    }

    asc_nak = _nakshatra(asc_lon)
    return {
        "engine": "swiss-ephemeris-lahiri-whole-sign",
        "ayanamsa": "Lahiri",
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
        "chandra": chandra_chart,
        "navamsha": navamsha_chart,
        "dasha": compute_vimshottari(
            ut_dt,
            next(p["longitude"] for p in planets if p["code"] == "Mo"),
        ),
        "numerology_dasha": compute_numerology_dasha(
            local_dt.date(), compute_mulank(local_dt.date())
        ),
        "mulank": compute_mulank(local_dt.date()),
    }
