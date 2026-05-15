"""Vimshottari Dasha — the canonical Vedic predictive timing system.

A 120-year cycle of nine planetary periods (Mahadasha), each subdivided into
nine Antardasha sub-periods, each further into nine Pratyantardasha
sub-sub-periods. The opening Mahadasha is determined by the nakshatra of the
Moon at birth — its lord is the first Mahadasha lord, and the remaining
duration is pro-rated to how much of that nakshatra was still untraversed.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

# Standard Vimshottari order and durations (years). Sum = 120.
DASHA_ORDER = [
    ("Ketu", 7),
    ("Venus", 20),
    ("Sun", 6),
    ("Moon", 10),
    ("Mars", 7),
    ("Rahu", 18),
    ("Jupiter", 16),
    ("Saturn", 19),
    ("Mercury", 17),
]
DASHA_LORDS = [d[0] for d in DASHA_ORDER]
DASHA_YEARS = {name: years for name, years in DASHA_ORDER}

# Nakshatra index 0..26 → ruling planet (cycles every 9)
NAKSHATRA_LORDS = [DASHA_LORDS[i % 9] for i in range(27)]

# Use the sidereal-year convention adopted in standard Vedic dasha tables.
# 365.25 days × the lord's years gives reproducible dates to the day.
_DAYS_PER_YEAR = 365.25
_NAKSHATRA_SPAN = 360.0 / 27  # 13°20'


def _add_years(start: datetime, years: float) -> datetime:
    return start + timedelta(days=years * _DAYS_PER_YEAR)


def _next_lord(after: str) -> str:
    idx = DASHA_LORDS.index(after)
    return DASHA_LORDS[(idx + 1) % 9]


def _balance_years(moon_longitude_sidereal: float) -> tuple[str, float]:
    """Return (first_md_lord, remaining_years_of_first_md)."""
    nak_idx = int(moon_longitude_sidereal / _NAKSHATRA_SPAN) % 27
    lord = NAKSHATRA_LORDS[nak_idx]
    deg_into_nak = moon_longitude_sidereal - nak_idx * _NAKSHATRA_SPAN
    fraction_left = 1 - (deg_into_nak / _NAKSHATRA_SPAN)
    return lord, DASHA_YEARS[lord] * fraction_left


def _build_subperiods(start: datetime, lord: str, total_years: float) -> list[dict]:
    """Build the 9 sub-periods within a given period (Mahadasha → Antardasha,
    or Antardasha → Pratyantardasha). Sub-periods cycle through the standard
    order beginning with the parent lord itself."""
    parent_idx = DASHA_LORDS.index(lord)
    cur = start
    out = []
    for i in range(9):
        sub_lord = DASHA_LORDS[(parent_idx + i) % 9]
        sub_years = total_years * DASHA_YEARS[sub_lord] / 120.0
        sub_end = _add_years(cur, sub_years)
        out.append({"lord": sub_lord, "start": cur, "end": sub_end, "years": sub_years})
        cur = sub_end
    return out


def compute_vimshottari(birth_dt_utc: datetime, moon_longitude_sidereal: float) -> dict:
    """Compute the full Vimshottari Mahadasha → Antardasha → Pratyantardasha tree.

    `birth_dt_utc` must be timezone-aware in UTC. `moon_longitude_sidereal` is
    in degrees [0, 360) using the same ayanamsa as the rest of the chart
    (Lahiri sidereal for this project).
    """
    first_lord, balance = _balance_years(moon_longitude_sidereal)

    # Build sequence of Mahadashas
    mahadashas: list[dict] = []
    md_lord = first_lord
    md_years = balance
    md_start = birth_dt_utc
    for i in range(9):  # 9 mahadashas to span 120 years
        md_end = _add_years(md_start, md_years)
        antardashas = _build_subperiods(md_start, md_lord, md_years)
        for ad in antardashas:
            ad["pratyantardashas"] = _build_subperiods(ad["start"], ad["lord"], ad["years"])
        mahadashas.append({
            "lord": md_lord,
            "start": md_start,
            "end": md_end,
            "years": md_years,
            "antardashas": antardashas,
        })
        md_start = md_end
        md_lord = _next_lord(md_lord)
        md_years = DASHA_YEARS[md_lord]  # subsequent dashas use the full duration

    return _serialize(mahadashas)


def _serialize(mahadashas: list[dict]) -> dict:
    """Convert datetimes to ISO strings and mark the currently-running period."""
    now = datetime.utcnow().replace(tzinfo=mahadashas[0]["start"].tzinfo)

    def in_range(p):
        return p["start"] <= now < p["end"]

    current_md = current_ad = current_pd = None
    for md in mahadashas:
        if in_range(md):
            current_md = md["lord"]
            for ad in md["antardashas"]:
                if in_range(ad):
                    current_ad = ad["lord"]
                    for pd in ad["pratyantardashas"]:
                        if in_range(pd):
                            current_pd = pd["lord"]
                            break
                    break
            break

    def fmt(p):
        return {**p, "start": p["start"].isoformat(), "end": p["end"].isoformat(),
                "years": round(p["years"], 3)}

    serial = []
    for md in mahadashas:
        ads = []
        for ad in md["antardashas"]:
            pds = [fmt(pd) for pd in ad["pratyantardashas"]]
            ads.append({**fmt(ad), "pratyantardashas": pds})
        serial.append({**fmt(md), "antardashas": ads})

    return {
        "current": {"mahadasha": current_md, "antardasha": current_ad, "pratyantardasha": current_pd},
        "mahadashas": serial,
    }
