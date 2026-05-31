"""On-demand LLM translation cache for static content (grahas, nakshatras).

The first time someone requests the Grahas page in Hindi, this translates the
GRAHAS list via Claude Sonnet 4.5 and stores it in `db.translations_cache` keyed
by (kind, lang). All subsequent requests hit the cache (no LLM call, no cost).

If translation fails, the English source is returned with a logger warning so
the UI never breaks.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_LANGS = {"en", "hi", "te", "ta"}

LANG_LABEL = {
    "hi": "Hindi (Devanagari script)",
    "te": "Telugu",
    "ta": "Tamil",
}

# Per-kind: which string keys should be translated and which left as-is.
TRANSLATABLE_KEYS = {
    "grahas": {
        "translate": ["name", "english", "element", "gender", "deity", "day", "gemstone",
                       "color", "rules", "exalted", "debilitated", "description"],
        "translate_list": ["qualities"],
        "preserve": ["id", "symbol", "sanskrit"],
    },
    "nakshatras": {
        "translate": ["name", "deity", "symbol", "ruler", "gana", "quality", "description"],
        "translate_list": [],
        "preserve": ["id", "sanskrit", "range"],
    },
}


async def get_or_translate(db, kind: str, lang: str, source: list[dict]) -> list[dict]:
    if lang not in SUPPORTED_LANGS or lang == "en":
        return source
    cached = await db.translations_cache.find_one({"kind": kind, "lang": lang}, {"_id": 0})
    if cached and cached.get("data"):
        return cached["data"]

    try:
        translated = await _translate(source, kind, lang)
    except Exception as e:
        logger.warning(f"Translation cache build failed for ({kind},{lang}): {e}")
        return source

    await db.translations_cache.update_one(
        {"kind": kind, "lang": lang},
        {"$set": {"kind": kind, "lang": lang, "data": translated}},
        upsert=True,
    )
    return translated


async def _translate(source: list[dict], kind: str, lang: str) -> list[dict]:
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    spec = TRANSLATABLE_KEYS[kind]
    target = LANG_LABEL[lang]

    # Build a stripped payload of ONLY the translatable fields for LLM efficiency
    payload = []
    for item in source:
        slim = {"id": item["id"]}
        for k in spec["translate"]:
            if k in item:
                slim[k] = item[k]
        for k in spec["translate_list"]:
            if k in item:
                slim[k] = item[k]
        payload.append(slim)

    system = (
        f"You are a professional translator specialising in Vedic astrology. "
        f"Translate JSON object values from English to {target}.\n"
        f"- Keep every `id` exactly as-is.\n"
        f"- Translate string values to {target}.\n"
        f"- For array values (qualities), translate each entry in the array.\n"
        f"- For Vedic terms (Surya, Chandra, Mangala, Nakshatra, Graha, Rashi), use natural transliteration in target script.\n"
        f"- Output ONLY the translated JSON array — no markdown, no commentary."
    )
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"cache_{kind}_{lang}",
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    raw = await chat.send_message(UserMessage(text=json.dumps(payload, ensure_ascii=False, indent=2)))
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]
    translated_slim = json.loads(text)

    # Merge translated values back into the full source items, preserving non-translatable fields
    by_id = {it["id"]: it for it in translated_slim}
    out = []
    for item in source:
        tr = by_id.get(item["id"], {})
        merged = {**item}
        for k in spec["translate"] + spec["translate_list"]:
            if k in tr:
                merged[k] = tr[k]
        out.append(merged)
    return out


async def invalidate(db, kind: Optional[str] = None, lang: Optional[str] = None):
    q = {}
    if kind:
        q["kind"] = kind
    if lang:
        q["lang"] = lang
    await db.translations_cache.delete_many(q)
