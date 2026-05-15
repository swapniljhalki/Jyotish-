"""Numerology Dasha — Vedic numerological timing cycle.

A 9-number cycle adapted into a 3-tier dasha structure, parallel in form to
Vimshottari but driven by numerology rules:

* **Mahadasha**  — each number rules 9 years. Sequence starts from the
  native's Mulank and proceeds 1 → 2 → 3 … wrapping at 9.
* **Antardasha** — each 9-year Mahadasha is divided into 9 Antardashas of
  exactly 1 year each, in the same numeric sequence beginning with the
  Mahadasha lord.
* **Pratyantardasha** — each 1-year Antardasha is divided into 9
  Pratyantardashas of ~40.5 days each, again starting with the Antardasha
  lord.

Total cycle = 81 years.
"""
from __future__ import annotations

from datetime import datetime, date, timedelta

NUMBER_META: dict[int, dict] = {
    1: {"planet": "Surya", "english": "Sun", "glyph": "☉", "theme": "Leadership, originality, new beginnings."},
    2: {"planet": "Chandra", "english": "Moon", "glyph": "☾", "theme": "Sensitivity, partnerships, emotional growth."},
    3: {"planet": "Guru", "english": "Jupiter", "glyph": "♃", "theme": "Expansion, wisdom, opportunities."},
    4: {"planet": "Rahu", "english": "Rahu", "glyph": "☊", "theme": "Sudden change, unconventional gain, restlessness."},
    5: {"planet": "Budha", "english": "Mercury", "glyph": "☿", "theme": "Communication, commerce, adaptability."},
    6: {"planet": "Shukra", "english": "Venus", "glyph": "♀", "theme": "Love, beauty, harmony, indulgence."},
    7: {"planet": "Ketu", "english": "Ketu", "glyph": "☋", "theme": "Introspection, mysticism, detachment."},
    8: {"planet": "Shani", "english": "Saturn", "glyph": "♄", "theme": "Discipline, karma, slow but lasting success."},
    9: {"planet": "Mangala", "english": "Mars", "glyph": "♂", "theme": "Drive, courage, completion of cycles."},
}

# Days approximations — keep close to calendar-year accuracy
_DAYS_PER_YEAR = 365.25


def _add_days(d: datetime, days: float) -> datetime:
    return d + timedelta(days=days)


def _next_number(n: int) -> int:
    return (n % 9) + 1


def _build_subperiods(start: datetime, lord: int, total_days: float) -> list[dict]:
    """Equal 9-way split, sequence starts from `lord` and wraps."""
    per = total_days / 9.0
    cur = start
    out = []
    for i in range(9):
        n = ((lord - 1 + i) % 9) + 1
        end = _add_days(cur, per)
        out.append({"number": n, "start": cur, "end": end, "days": per})
        cur = end
    return out


def compute_numerology_dasha(dob: date, mulank: int) -> dict:
    """Return the full 81-year numerology dasha tree starting from `dob`."""
    start_dt = datetime(dob.year, dob.month, dob.day)
    now = datetime.now()

    md_lord = mulank
    md_start = start_dt
    mahadashas: list[dict] = []
    for i in range(9):  # 9 mahadashas × 9 years = 81 years
        md_days = 9 * _DAYS_PER_YEAR
        md_end = _add_days(md_start, md_days)
        antardashas = _build_subperiods(md_start, md_lord, md_days)
        for ad in antardashas:
            ad["pratyantardashas"] = _build_subperiods(ad["start"], ad["number"], ad["days"])
        mahadashas.append({
            "number": md_lord,
            "start": md_start,
            "end": md_end,
            "years": 9.0,
            "antardashas": antardashas,
        })
        md_start = md_end
        md_lord = _next_number(md_lord)

    # Determine the currently running period
    current = {"mahadasha": None, "antardasha": None, "pratyantardasha": None}
    for md in mahadashas:
        if md["start"] <= now < md["end"]:
            current["mahadasha"] = md["number"]
            for ad in md["antardashas"]:
                if ad["start"] <= now < ad["end"]:
                    current["antardasha"] = ad["number"]
                    for pd in ad["pratyantardashas"]:
                        if pd["start"] <= now < pd["end"]:
                            current["pratyantardasha"] = pd["number"]
                            break
                    break
            break

    def fmt(p):
        out = {
            "number": p["number"],
            "start": p["start"].isoformat(),
            "end": p["end"].isoformat(),
        }
        if "years" in p:
            out["years"] = round(p["years"], 3)
        else:
            out["days"] = round(p["days"], 2)
        # Enrich with planet meta
        meta = NUMBER_META[p["number"]]
        out["planet"] = meta["planet"]
        out["english"] = meta["english"]
        out["glyph"] = meta["glyph"]
        out["theme"] = meta["theme"]
        return out

    serial = []
    for md in mahadashas:
        ads = []
        for ad in md["antardashas"]:
            pds = [fmt(pd) for pd in ad["pratyantardashas"]]
            ads.append({**fmt(ad), "pratyantardashas": pds})
        serial.append({**fmt(md), "antardashas": ads})

    return {
        "current": current,
        "mahadashas": serial,
    }
