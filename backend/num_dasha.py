"""Vedic Numerology Dasha — author's algorithm.

Mahadasha
---------
Starting MD lord = single-digit reduction of the birth DAY.
Sequence cycles 1 → 9. Each MD's duration in years equals its own number.
The timeline runs for at least 100 years from DOB.

Antardasha
----------
Computed annually, refreshed every birthday. For year-of-life starting on
dob's anniversary in year Y:
    DOB_sum = reduce( day_digits + month_digits + last_2_digits(Y) )
    weekday_num = WEEKDAY_MAP[ weekday_of(birthday in year Y) ]
    AD_number  = reduce( DOB_sum + weekday_num )

Pratyantardasha
---------------
Starts with the current AD number, cycles 1 → 9 (9 PDs total) over the year.
Durations (days):
    if 1 ≤ n ≤ 4 :   n × 8
    if 5 ≤ n ≤ 9 :   n × 8 + 1
Sum = 8+16+24+32 + 41+49+57+65+73 = 365 days exactly.

Daily Dasha
-----------
Daily_dasha = reduce( current_PD_number + WEEKDAY_MAP[today_weekday] )
"""
from __future__ import annotations

from datetime import datetime, date, timedelta

NUMBER_META: dict[int, dict] = {
    1: {"planet": "Surya",   "english": "Sun",     "glyph": "☉", "theme": "Leadership, originality, new beginnings."},
    2: {"planet": "Chandra", "english": "Moon",    "glyph": "☾", "theme": "Sensitivity, partnerships, emotional growth."},
    3: {"planet": "Guru",    "english": "Jupiter", "glyph": "♃", "theme": "Expansion, wisdom, opportunities."},
    4: {"planet": "Rahu",    "english": "Rahu",    "glyph": "☊", "theme": "Sudden change, unconventional gain, restlessness."},
    5: {"planet": "Budha",   "english": "Mercury", "glyph": "☿", "theme": "Communication, commerce, adaptability."},
    6: {"planet": "Shukra",  "english": "Venus",   "glyph": "♀", "theme": "Love, beauty, harmony, indulgence."},
    7: {"planet": "Ketu",    "english": "Ketu",    "glyph": "☋", "theme": "Introspection, mysticism, detachment."},
    8: {"planet": "Shani",   "english": "Saturn",  "glyph": "♄", "theme": "Discipline, karma, slow but lasting success."},
    9: {"planet": "Mangala", "english": "Mars",    "glyph": "♂", "theme": "Drive, courage, completion of cycles."},
}

# Python weekday(): Monday=0 .. Sunday=6  →  Vedic numerology mapping
WEEKDAY_MAP = {
    6: 1,  # Sunday
    0: 2,  # Monday
    1: 9,  # Tuesday
    2: 5,  # Wednesday
    3: 3,  # Thursday
    4: 6,  # Friday
    5: 8,  # Saturday
}
WEEKDAY_NAME = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday",
                4: "Friday", 5: "Saturday", 6: "Sunday"}

_DAYS_PER_YEAR = 365.25


def _reduce(n: int) -> int:
    n = abs(n)
    while n > 9:
        n = sum(int(d) for d in str(n))
    return n if n != 0 else 9


def _pd_duration_days(n: int) -> int:
    return n * 8 if 1 <= n <= 4 else n * 8 + 1


def _bday_in(year: int, dob: date) -> datetime:
    """Birthday in `year`, handling Feb 29 in non-leap years gracefully."""
    try:
        return datetime(year, dob.month, dob.day)
    except ValueError:
        return datetime(year, dob.month, dob.day - 1)


def _antardasha_for_year(dob: date, year: int) -> tuple[int, int]:
    """Returns (antardasha_number, weekday_num_used)."""
    y2 = year % 100
    dob_sum = _reduce(
        sum(int(d) for d in str(dob.day))
        + sum(int(d) for d in str(dob.month))
        + sum(int(d) for d in str(y2))
    )
    bday = _bday_in(year, dob)
    weekday_num = WEEKDAY_MAP[bday.weekday()]
    return _reduce(dob_sum + weekday_num), weekday_num


def compute_numerology_dasha(dob: date, mulank: int) -> dict:
    now = datetime.now()
    start_dt = datetime(dob.year, dob.month, dob.day)

    # --- 1. Mahadashas: 100-year timeline ---
    mahadashas: list[dict] = []
    cur_lord = mulank
    cur_start = start_dt
    total_years = 0
    while total_years < 100:
        years = cur_lord  # MD duration = its own number
        cur_end = cur_start + timedelta(days=years * _DAYS_PER_YEAR)
        mahadashas.append({
            "number": cur_lord,
            "start": cur_start,
            "end": cur_end,
            "years": float(years),
            "antardashas": [],  # filled below
        })
        cur_start = cur_end
        total_years += years
        cur_lord = (cur_lord % 9) + 1

    # --- 2. Antardashas: one per year-of-life, plus 9 PDs each ---
    timeline_end = mahadashas[-1]["end"]
    antardashas_flat: list[dict] = []
    for offset in range(120):  # generate a generous buffer
        y = dob.year + offset
        ad_start = _bday_in(y, dob)
        ad_end = _bday_in(y + 1, dob)
        if ad_start >= timeline_end:
            break

        ad_n, weekday_num = _antardasha_for_year(dob, y)

        # Pratyantardashas: 9 sub-periods cycling from ad_n
        pds = []
        pd_start = ad_start
        for i in range(9):
            pd_n = ((ad_n - 1 + i) % 9) + 1
            days = _pd_duration_days(pd_n)
            pd_end = pd_start + timedelta(days=days)
            pds.append({
                "number": pd_n,
                "start": pd_start,
                "end": pd_end,
                "days": float(days),
            })
            pd_start = pd_end

        antardashas_flat.append({
            "number": ad_n,
            "start": ad_start,
            "end": ad_end,
            "days": float((ad_end - ad_start).days),
            "year_of_life": offset + 1,
            "weekday_num": weekday_num,
            "weekday_name": WEEKDAY_NAME[ad_start.weekday()],
            "pratyantardashas": pds,
        })

    # Group antardashas under the containing mahadasha
    for ad in antardashas_flat:
        for md in mahadashas:
            if md["start"] <= ad["start"] < md["end"]:
                md["antardashas"].append(ad)
                break

    # --- 3. Current detection + Daily Dasha ---
    cur_md = next((m["number"] for m in mahadashas if m["start"] <= now < m["end"]), None)
    cur_ad_obj = next((a for a in antardashas_flat if a["start"] <= now < a["end"]), None)
    cur_ad = cur_ad_obj["number"] if cur_ad_obj else None
    cur_pd = None
    if cur_ad_obj:
        for pd in cur_ad_obj["pratyantardashas"]:
            if pd["start"] <= now < pd["end"]:
                cur_pd = pd["number"]
                break

    daily_dasha = None
    today_wd_num = WEEKDAY_MAP[now.weekday()]
    today_name = WEEKDAY_NAME[now.weekday()]
    if cur_pd is not None:
        daily_dasha = _reduce(cur_pd + today_wd_num)

    # --- Serialize ---
    def attach_meta(p, extras=None):
        meta = NUMBER_META[p["number"]]
        out = {
            "number": p["number"],
            "start": p["start"].isoformat(),
            "end": p["end"].isoformat(),
            **{k: meta[k] for k in ("planet", "english", "glyph", "theme")},
        }
        if "years" in p:
            out["years"] = round(p["years"], 3)
        if "days" in p:
            out["days"] = round(p["days"], 2)
        if extras:
            out.update(extras)
        return out

    serial_mds = []
    for md in mahadashas:
        ads = []
        for ad in md["antardashas"]:
            pds = [attach_meta(pd) for pd in ad["pratyantardashas"]]
            ads.append(attach_meta(ad, {
                "year_of_life": ad["year_of_life"],
                "weekday_num": ad["weekday_num"],
                "weekday_name": ad["weekday_name"],
                "pratyantardashas": pds,
            }))
        serial_mds.append({**attach_meta(md), "antardashas": ads})

    return {
        "current": {
            "mahadasha": cur_md,
            "antardasha": cur_ad,
            "pratyantardasha": cur_pd,
            "daily_dasha": daily_dasha,
            "today_weekday": today_name,
            "today_weekday_num": today_wd_num,
        },
        "mahadashas": serial_mds,
    }
