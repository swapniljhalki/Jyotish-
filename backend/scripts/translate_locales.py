"""One-shot script: translate en.json → hi/te/ta using Claude Sonnet 4.5 (Emergent key).
Run from /app:  python backend/scripts/translate_locales.py
"""
from __future__ import annotations
import asyncio
import json
import os
import sys
from pathlib import Path

# Make sure backend imports work
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / "backend" / ".env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore

LOCALES = ROOT / "frontend" / "src" / "i18n" / "locales"
EN_FILE = LOCALES / "en.json"

TARGETS = {
    "hi": "Hindi (Devanagari script)",
    "te": "Telugu",
    "ta": "Tamil",
}

PROMPT = """You are a professional translator specialising in Vedic astrology and Indian spiritual terminology.

Translate the following JSON object from English to {target}.

Rules:
- Preserve EVERY key exactly as-is (don't translate keys).
- Translate only the string VALUES.
- Keep ICU placeholders intact: {{name}}, {{price}}, {{minutes}}, {{count}}.
- Keep numerals, ₹ symbol, → arrows, and emoji exactly as-is.
- For Vedic terms (Kundali, Nakshatra, Graha, Jyotishi, Sadhaka, Seeker, Mulank, Bhagyank,
  Naamank, Panchang, Dasha, Yantra, Meet) — use the natural transliteration in the target script
  (e.g. कुंडली in Hindi, கடல்லி → கூண்டலி in Tamil). Don't force English.
- Tone: warm, devotional, classical — like a Vedic guru speaking to a sincere seeker.
- Output ONLY the translated JSON object, no markdown, no commentary.
"""

async def translate(payload: dict, target_label: str) -> dict:
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"translate_{target_label}",
        system_message=PROMPT.format(target=target_label),
    ).with_model("anthropic", "claude-sonnet-4-5")

    msg = UserMessage(text=json.dumps(payload, ensure_ascii=False, indent=2))
    raw = await chat.send_message(msg)
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


async def main():
    src = json.loads(EN_FILE.read_text(encoding="utf-8"))
    for code, label in TARGETS.items():
        print(f"[{code}] Translating to {label}…", flush=True)
        # Translate top-level namespace by namespace to keep responses small and reliable
        out = {}
        for ns, val in src.items():
            print(f"  · {ns}", flush=True)
            out[ns] = await translate(val, label)
        path = LOCALES / f"{code}.json"
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  → wrote {path}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
