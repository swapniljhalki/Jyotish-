from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date as date_type, time as time_type
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, Field, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from astrology_data import GRAHAS, NAKSHATRAS, get_graha, get_nakshatra
from kundali import compute_chart

# --- logging ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- mongo ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# --- jwt ---
JWT_ALGO = "HS256"

def _secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGO)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=False,
        samesite="lax", max_age=7 * 24 * 3600, path="/",
    )

# --- app ---
app = FastAPI(title="Vedic Astrology API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    tier: str
    created_at: str

class SubscribeIn(BaseModel):
    tier: str  # "free" | "basic" | "premium"

class AstroIn(BaseModel):
    date_of_birth: str  # YYYY-MM-DD
    time_of_birth: str  # HH:MM
    place_of_birth: str
    full_name: Optional[str] = None


# --- auth helpers ---
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        hdr = request.headers.get("Authorization", "")
        if hdr.startswith("Bearer "):
            token = hdr[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_tier(user: dict, min_tier: str):
    order = {"free": 0, "basic": 1, "premium": 2}
    if order.get(user.get("tier", "free"), 0) < order[min_tier]:
        raise HTTPException(status_code=403, detail=f"This requires the {min_tier.capitalize()} tier. Please upgrade.")


# --- health ---
@api.get("/")
async def root():
    return {"message": "Vedic Astrology API", "ok": True}


# --- auth endpoints ---
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "tier": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {
        "id": user_id, "email": email, "name": doc["name"],
        "tier": "free", "created_at": doc["created_at"], "token": token,
    }


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "tier": user.get("tier", "free"), "created_at": user["created_at"], "token": token,
    }


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# --- subscription (mock) ---
@api.post("/subscribe")
async def subscribe(body: SubscribeIn, user: dict = Depends(get_current_user)):
    if body.tier not in ("free", "basic", "premium"):
        raise HTTPException(status_code=400, detail="Invalid tier")
    await db.users.update_one({"id": user["id"]}, {"$set": {"tier": body.tier}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


# --- free tier content ---
@api.get("/grahas")
async def list_grahas():
    return {"grahas": GRAHAS}


@api.get("/grahas/{graha_id}")
async def graha_detail(graha_id: str):
    g = get_graha(graha_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graha not found")
    return g


@api.get("/nakshatras")
async def list_nakshatras():
    return {"nakshatras": NAKSHATRAS}


@api.get("/nakshatras/{nid}")
async def nakshatra_detail(nid: int):
    n = get_nakshatra(nid)
    if not n:
        raise HTTPException(status_code=404, detail="Nakshatra not found")
    return n


# --- AI helpers ---
def _parse_inputs(body: AstroIn):
    try:
        dob = date_type.fromisoformat(body.date_of_birth)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date_of_birth (YYYY-MM-DD)")
    try:
        hh, mm = body.time_of_birth.split(":")
        tob = time_type(int(hh), int(mm))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid time_of_birth (HH:MM)")
    pob = body.place_of_birth.strip()
    if not pob:
        raise HTTPException(status_code=422, detail="Place of birth required")
    return dob, tob, pob


async def _ask_claude(system: str, user_msg: str, session_id: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    try:
        return await chat.send_message(UserMessage(text=user_msg))
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")


# --- basic tier ---
@api.post("/astrology/basic")
async def astrology_basic(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "basic")
    dob, tob, pob = _parse_inputs(body)
    chart = compute_chart(dob, tob, pob)

    system = (
        "You are an experienced Vedic astrologer (Jyotishi) writing for a modern audience. "
        "Use warm, encouraging but honest language. Reference traditional terms (rashi, graha, bhava, "
        "nakshatra) where natural and briefly translate them. Keep output to ~250 words, formatted "
        "in short paragraphs with tasteful section headings."
    )
    user_msg = (
        f"Provide a BASIC Vedic astrological reading for:\n"
        f"- Name: {body.full_name or 'Seeker'}\n"
        f"- Date of birth: {body.date_of_birth}\n"
        f"- Time of birth: {body.time_of_birth}\n"
        f"- Place of birth: {pob}\n\n"
        f"Ascendant (Lagna): {chart['ascendant_english']} ({chart['ascendant']}).\n"
        f"Sun in {next(p['rashi_english'] for p in chart['planets'] if p['code']=='Su')}, "
        f"Moon in {next(p['rashi_english'] for p in chart['planets'] if p['code']=='Mo')}.\n\n"
        f"Cover: (1) core personality, (2) strengths, (3) areas for growth, "
        f"(4) one practical remedy (mantra / daily practice). Finish with a short blessing."
    )
    advice = await _ask_claude(system, user_msg, f"basic-{user['id']}")

    reading_id = str(uuid.uuid4())
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "basic",
        "inputs": body.model_dump(), "advice": advice,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "id": reading_id,
        "ascendant": chart["ascendant_english"],
        "ascendant_sanskrit": chart["ascendant"],
        "moon_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Mo"),
        "sun_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Su"),
        "advice": advice,
    }


# --- premium tier ---
@api.post("/astrology/premium")
async def astrology_premium(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    dob, tob, pob = _parse_inputs(body)
    chart = compute_chart(dob, tob, pob)

    planet_lines = "\n".join(
        f"- {p['name']}: {p['rashi_english']} ({p['rashi']}) "
        f"{p['degree']}°, house {p['house']}{' (R)' if p['retrograde'] else ''}"
        for p in chart["planets"]
    )

    system = (
        "You are a senior Vedic astrologer (Jyotishi) writing a detailed premium reading. "
        "Reference the specific planetary placements given. Use traditional Vedic terminology with "
        "brief translations. Be insightful, specific and warm. Aim for ~550–700 words. "
        "Structure with clear Markdown-style headings."
    )
    user_msg = (
        f"Generate a DETAILED Vedic kundali interpretation.\n\n"
        f"Native: {body.full_name or 'Seeker'}\n"
        f"DOB: {body.date_of_birth} | TOB: {body.time_of_birth} | POB: {pob}\n"
        f"Ascendant (Lagna): {chart['ascendant_english']} ({chart['ascendant']})\n\n"
        f"Planetary placements:\n{planet_lines}\n\n"
        f"Write the reading with these sections, each 2–4 sentences:\n"
        f"## Overall Personality\n## Career & Dharma\n## Wealth & Finances\n"
        f"## Relationships & Marriage\n## Health & Vitality\n## Spiritual Path\n"
        f"## Current Focus & Remedies\n\n"
        f"End with a short closing blessing in Sanskrit with English translation."
    )
    advice = await _ask_claude(system, user_msg, f"premium-{user['id']}")

    reading_id = str(uuid.uuid4())
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "premium",
        "inputs": body.model_dump(), "chart": chart, "advice": advice,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": reading_id, "chart": chart, "advice": advice}


# --- startup ---
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.readings.create_index("user_id")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vedic.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "name": "Admin",
            "password_hash": hash_password(admin_pw), "tier": "premium", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {admin_email}")


@app.on_event("shutdown")
async def shutdown_event():
    client.close()


app.include_router(api)
