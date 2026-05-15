"""Numerology Dasha — Vedic numerological timing cycle.

Tradition followed in this implementation:

* **Mahadasha**  — the first Mahadasha lord is the native's **Mulank**, and its
  duration is **`Mulank` years**. Each subsequent Mahadasha lord is the next
  number (cycling 1 → 9), and runs for that many years (e.g. number 5 = 5
  years). Nine Mahadashas in total span the full cycle of 1+2+…+9 = **45 years**.
* **Antardasha** — within each Mahadasha of N years, the 9 Antardashas
  cycle starting with the Mahadasha lord. Each AD's duration is
  proportional to its lord's number: `AD_years = AD_lord × N / 45`. The
  Antardasha durations within an N-year MD therefore sum to exactly N.
* **Pratyantardasha** — within each Antardasha of A years, 9 sub-periods
  follow the same proportional rule: `PD_days = PD_lord × A_days / 45`.
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

_DAYS_PER_YEAR = 365.25
_CYCLE_SUM = 45  # 1+2+...+9


def _add_days(d: datetime, days: float) -> datetime:
    return d + timedelta(days=days)


def _next_number(n: int) -> int:
    return (n % 9) + 1


def _build_antardashas(start: datetime, md_lord: int, md_years: int) -> list[dict]:
    """Within an N-year Mahadasha, build N antardashas of exactly 1 year each.
    Sequence starts from the Mahadasha lord and cycles 1 → 9."""
    cur = start
    out = []
    for i in range(md_years):
        n = ((md_lord - 1 + i) % 9) + 1
        ad_days = _DAYS_PER_YEAR  # exactly 1 year
        end = _add_days(cur, ad_days)
        out.append({"number": n, "start": cur, "end": end, "days": ad_days})
        cur = end
    return out


def _build_pratyantardashas(start: datetime, ad_lord: int, ad_days: float) -> list[dict]:
    """Within a 1-year Antardasha, build 9 pratyantardashas whose durations are
    proportional to their own number (sum back to the parent's duration)."""
    cur = start
    out = []
    for i in range(9):
        n = ((ad_lord - 1 + i) % 9) + 1
        pd_days = n * ad_days / _CYCLE_SUM
        end = _add_days(cur, pd_days)
        out.append({"number": n, "start": cur, "end": end, "days": pd_days})
        cur = end
    return out


def compute_numerology_dasha(dob: date, mulank: int) -> dict:
    """Return the full 45-year numerology dasha tree starting at `dob`."""
    start_dt = datetime(dob.year, dob.month, dob.day)
    now = datetime.now()

    md_lord = mulank
    md_start = start_dt
    mahadashas: list[dict] = []
    for _ in range(9):
        md_years = float(md_lord)  # MD duration = its own number, in years
        md_days = md_years * _DAYS_PER_YEAR
        md_end = _add_days(md_start, md_days)

        antardashas = _build_antardashas(md_start, md_lord, int(md_years))
        for ad in antardashas:
            ad["pratyantardashas"] = _build_pratyantardashas(
                ad["start"], ad["number"], ad["days"]
            )

        mahadashas.append({
            "number": md_lord,
            "start": md_start,
            "end": md_end,
            "years": md_years,
            "antardashas": antardashas,
        })
        md_start = md_end
        md_lord = _next_number(md_lord)

    # Detect currently running period
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
        meta = NUMBER_META[p["number"]]
        out = {
            "number": p["number"],
            "start": p["start"].isoformat(),
            "end": p["end"].isoformat(),
            **{k: meta[k] for k in ("planet", "english", "glyph", "theme")},
        }
        if "years" in p:
            out["years"] = round(p["years"], 3)
        else:
            out["days"] = round(p["days"], 2)
        return out

    serial = []
    for md in mahadashas:
        ads = []
        for ad in md["antardashas"]:
            pds = [fmt(pd) for pd in ad["pratyantardashas"]]
            ads.append({**fmt(ad), "pratyantardashas": pds})
        serial.append({**fmt(md), "antardashas": ads})

    return {"current": current, "mahadashas": serial}
