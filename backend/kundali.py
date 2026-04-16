"""Deterministic Vedic kundali (birth-chart) calculator.

This is a simplified symbolic placement (not a true ephemeris) — each graha
is placed into one of the 12 houses based on a seeded offset per date/time.
Produces a stable, reproducible chart per (date, time, place) so users get the
same chart every run, and enough variety to feel astrologically meaningful.
"""
from datetime import date, time
from typing import List, Dict

RASHIS = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]
RASHIS_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

# Approximate mean motion offsets (days to complete one rashi = 30°)
# These are rough symbolic periods, tuned to spread planets realistically.
GRAHA_CYCLES = {
    "Su": 365.25 / 12,      # Sun — 1 sign/month
    "Mo": 27.32 / 12,       # Moon — very fast
    "Ma": 687 / 12,         # Mars
    "Me": 88 / 12,          # Mercury (sidereal)
    "Ju": 4332 / 12,        # Jupiter
    "Ve": 225 / 12,         # Venus
    "Sa": 10759 / 12,       # Saturn
    "Ra": -6798 / 12,       # Rahu (retrograde node)
    "Ke": -6798 / 12,       # Ketu (opposite Rahu)
}

GRAHA_NAMES = {
    "Su": "Sun", "Mo": "Moon", "Ma": "Mars", "Me": "Mercury",
    "Ju": "Jupiter", "Ve": "Venus", "Sa": "Saturn", "Ra": "Rahu", "Ke": "Ketu",
}

# Epoch J2000-ish — symbolic starting positions (rashi index 0..11) for each graha
# on 2000-01-01. Chosen to be deterministic and pleasing.
EPOCH = date(2000, 1, 1)
EPOCH_POSITIONS = {
    "Su": 8,   # Sagittarius-ish
    "Mo": 3,
    "Ma": 6,
    "Me": 8,
    "Ju": 1,
    "Ve": 10,
    "Sa": 1,
    "Ra": 3,
    "Ke": 9,
}


def _normalize_rashi(idx: float) -> int:
    return int(idx) % 12


def compute_ascendant(dob: date, tob: time) -> int:
    """Ascendant (Lagna) advances roughly 1 rashi every 2 hours."""
    minutes = tob.hour * 60 + tob.minute
    # base shift from day-of-year for some spread
    doy = dob.timetuple().tm_yday
    idx = (minutes // 120) + (doy // 30)
    return idx % 12


def compute_graha_positions(dob: date, tob: time) -> List[Dict]:
    """Return a list of 9 grahas with their rashi + house placements."""
    days_since_epoch = (dob - EPOCH).days + (tob.hour * 60 + tob.minute) / 1440.0
    asc = compute_ascendant(dob, tob)

    out = []
    for code, cycle_days in GRAHA_CYCLES.items():
        base = EPOCH_POSITIONS[code]
        advance = days_since_epoch / cycle_days  # in rashi units
        rashi_idx = _normalize_rashi(base + advance)
        # House is rashi relative to ascendant (1..12)
        house = ((rashi_idx - asc) % 12) + 1
        # Degree within sign — deterministic
        degree = ((days_since_epoch / cycle_days) * 30) % 30
        out.append({
            "code": code,
            "name": GRAHA_NAMES[code],
            "rashi_index": rashi_idx,
            "rashi": RASHIS[rashi_idx],
            "rashi_english": RASHIS_EN[rashi_idx],
            "house": house,
            "degree": round(degree, 2),
            "retrograde": code in ("Ra", "Ke"),
        })
    return out


def compute_chart(dob: date, tob: time, pob: str) -> Dict:
    asc = compute_ascendant(dob, tob)
    planets = compute_graha_positions(dob, tob)

    # Group planets by house (string keys for JSON/BSON compatibility)
    houses = {str(i): [] for i in range(1, 13)}
    for p in planets:
        houses[str(p["house"])].append(p["code"])

    # house_signs[i] = rashi index in house i (1-based)
    house_signs = {str(i): (asc + i - 1) % 12 for i in range(1, 13)}

    return {
        "ascendant_index": asc,
        "ascendant": RASHIS[asc],
        "ascendant_english": RASHIS_EN[asc],
        "place_of_birth": pob,
        "date_of_birth": dob.isoformat(),
        "time_of_birth": tob.strftime("%H:%M"),
        "planets": planets,
        "houses": houses,
        "house_signs": house_signs,
    }
