"""Daily Rashifal (12-sign horoscope) — AI-authored, cached once per day per timezone.

Single batched Claude call returns 12 short forecasts. Cache hit means subsequent
requests cost zero LLM credits until the local date rolls over.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import date
from zoneinfo import ZoneInfo
from datetime import datetime as _dt

RASHIS = [
    # (english, sanskrit, lord, glyph)
    ("Aries", "Mesha", "Mangala", "♈"),
    ("Taurus", "Vrishabha", "Shukra", "♉"),
    ("Gemini", "Mithuna", "Budha", "♊"),
    ("Cancer", "Karka", "Chandra", "♋"),
    ("Leo", "Simha", "Surya", "♌"),
    ("Virgo", "Kanya", "Budha", "♍"),
    ("Libra", "Tula", "Shukra", "♎"),
    ("Scorpio", "Vrischika", "Mangala", "♏"),
    ("Sagittarius", "Dhanu", "Guru", "♐"),
    ("Capricorn", "Makara", "Shani", "♑"),
    ("Aquarius", "Kumbha", "Shani", "♒"),
    ("Pisces", "Meena", "Guru", "♓"),
]

# (date_iso, tz_name) -> payload
_cache: dict[tuple[str, str], dict] = {}
_lock = asyncio.Lock()


def _meta_dict() -> list[dict]:
    return [
        {"name": e, "sanskrit": s, "lord": ld, "glyph": g}
        for e, s, ld, g in RASHIS
    ]


def _fallback_forecasts(panchang: dict) -> list[dict]:
    """Deterministic offline fallback if the LLM call fails — keeps the tile usable."""
    nakshatra = panchang["nakshatra"]["name"]
    tithi = f"{panchang['tithi']['paksha']} {panchang['tithi']['name']}"
    moon = panchang["moon_sign"]
    base_themes = [
        "Initiative pays off — act on the boldest item on your list.",
        "Slow, steady earning energy — investments and resources favour you.",
        "Conversations open doors — reach out to the contact you've been avoiding.",
        "An emotional ripple settles into clarity by evening — trust your gut.",
        "Visibility increases — show up where you'd usually hide.",
        "Detail work yields disproportionate returns — refine, don't add.",
        "Partnerships and collaboration are the day's gold — share the credit.",
        "A buried truth surfaces — handle it with grace, not force.",
        "Travel, study, or a wider perspective brings unexpected luck.",
        "Long-term plans crystalise — patience meets progress.",
        "An unconventional idea finds its audience — pitch it.",
        "Inner work, art and dreams flow easily — make space for them.",
    ]
    themes = base_themes  # same order as RASHIS
    out = []
    for (name, sanskrit, lord, glyph), theme in zip(RASHIS, themes):
        out.append({
            "name": name,
            "sanskrit": sanskrit,
            "lord": lord,
            "glyph": glyph,
            "theme": theme,
            "forecast": (
                f"With Moon in {moon} on {tithi} and the day's nakshatra {nakshatra}, "
                f"{theme.lower()} Lean into the strengths of your sign and pace yourself."
            ),
            "lucky_color": ["Saffron", "Pink", "Green", "Pearl White", "Gold",
                            "Emerald Green", "White", "Crimson", "Yellow", "Indigo",
                            "Electric Blue", "Sea Blue"][RASHIS.index((name, sanskrit, lord, glyph))],
            "lucky_number": [9, 6, 5, 2, 1, 5, 6, 9, 3, 8, 4, 3][RASHIS.index((name, sanskrit, lord, glyph))],
        })
    return out


async def _generate_via_claude(panchang: dict, today_iso: str) -> list[dict] | None:
    """Single batched LLM call → 12 forecasts. Returns None on failure."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        return None

    system = (
        "You are a senior Vedic astrologer (Jyotishi) writing a daily rashifal for a modern audience. "
        "For each rashi, write a forecast in 2 short sentences (45–65 words). "
        "Use a warm, encouraging but honest tone. Reference today's panchang only briefly. "
        "Return STRICT JSON — no Markdown, no commentary."
    )
    user_msg = (
        f"Today's panchang ({today_iso}, IST):\n"
        f"- Tithi: {panchang['tithi']['paksha']} {panchang['tithi']['name']}\n"
        f"- Nakshatra: {panchang['nakshatra']['name']} (pada {panchang['nakshatra']['pada']})\n"
        f"- Yoga: {panchang['yoga']['name']}\n"
        f"- Vara: {panchang['vara']['english']} (ruled by {panchang['vara']['lord']})\n"
        f"- Sun in {panchang['sun_sign']}, Moon in {panchang['moon_sign']}\n\n"
        "Write today's rashifal for ALL 12 sidereal Vedic rashis.\n\n"
        "Return ONLY this JSON shape:\n"
        '{"forecasts":[{"name":"Aries","theme":"<6-10 words>","forecast":"<2 sentences>","lucky_color":"<one>","lucky_number":<1-9 int>}, ...]}\n'
        "Order MUST be: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces."
    )

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return None
    chat = LlmChat(
        api_key=api_key,
        session_id=f"rashifal-{today_iso}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        raw = await chat.send_message(UserMessage(text=user_msg))
    except Exception:
        return None

    # Strip code fences if any, extract first {...} block
    m = re.search(r"\{[\s\S]*\}", raw)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
        items = data.get("forecasts", [])
        if len(items) != 12:
            return None
    except Exception:
        return None

    out = []
    for (name, sanskrit, lord, glyph), item in zip(RASHIS, items):
        # Be lenient: match by name where possible, but order should be enforced.
        if isinstance(item.get("name"), str) and item["name"].strip().lower() != name.lower():
            return None  # malformed ordering — fall back
        out.append({
            "name": name,
            "sanskrit": sanskrit,
            "lord": lord,
            "glyph": glyph,
            "theme": str(item.get("theme", "")).strip(),
            "forecast": str(item.get("forecast", "")).strip(),
            "lucky_color": str(item.get("lucky_color", "")).strip(),
            "lucky_number": int(item.get("lucky_number", 0) or 0),
        })
    return out


async def get_daily_rashifal(panchang: dict, tz_name: str = "Asia/Kolkata") -> dict:
    today_local = _dt.now(ZoneInfo(tz_name)).date().isoformat()
    key = (today_local, tz_name)

    if key in _cache:
        return _cache[key]

    async with _lock:
        if key in _cache:
            return _cache[key]

        forecasts = await _generate_via_claude(panchang, today_local)
        source = "ai"
        if forecasts is None:
            forecasts = _fallback_forecasts(panchang)
            source = "fallback"

        payload = {
            "date": today_local,
            "timezone": tz_name,
            "moon_sign": panchang["moon_sign"],
            "sun_sign": panchang["sun_sign"],
            "source": source,
            "rashis": forecasts,
        }
        _cache[key] = payload
        return payload
