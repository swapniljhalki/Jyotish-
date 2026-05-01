from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets
import logging
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta, date as date_type, time as time_type
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header
from pydantic import BaseModel, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from astrology_data import GRAHAS, NAKSHATRAS, get_graha, get_nakshatra
from kundali import compute_chart_from_local
from geocode import geocode_place
from panchang import compute_panchang, get_upcoming_festivals
from numerology import compute_numerology
from rashifal import get_daily_rashifal
from email_service import send_email

# --- logging ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- mongo ---
mongo_url = os.environ["MONGO_URL"]
mongo = AsyncIOMotorClient(mongo_url)
db = mongo[os.environ["DB_NAME"]]

# --- jwt ---
JWT_ALGO = "HS256"
ACCESS_TTL_MIN = 15
REFRESH_TTL_DAYS = 7
LOCKOUT_THRESHOLD = 5
LOCKOUT_WINDOW_MIN = 15
RESET_TOKEN_TTL_HOURS = 1
VERIFY_TOKEN_TTL_HOURS = 24

EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _encode(payload: dict) -> str:
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGO)


def create_access_token(user_id: str, email: str) -> str:
    return _encode({
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "type": "access",
    })


def create_refresh_token(user_id: str) -> str:
    return _encode({
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
        "type": "refresh",
    })


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=False,
        samesite="lax", max_age=ACCESS_TTL_MIN * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh, httponly=True, secure=False,
        samesite="lax", max_age=REFRESH_TTL_DAYS * 24 * 3600, path="/",
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def public_user(u: dict) -> dict:
    """Scrub sensitive fields for API response."""
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "tier": u.get("tier", "free"),
        "role": u.get("role", "user"),
        "email_verified": u.get("email_verified", False),
        "auth_provider": u.get("auth_provider", "email"),
        "created_at": u["created_at"],
    }


# --- app ---
app = FastAPI(title="Vedic Astrology API")
api = APIRouter(prefix="/api")
admin_api = APIRouter(prefix="/api/admin")

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


class SubscribeIn(BaseModel):
    tier: str


class AstroIn(BaseModel):
    date_of_birth: str
    time_of_birth: str
    place_of_birth: str
    full_name: Optional[str] = None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


class VerifyEmailIn(BaseModel):
    token: str


class AdminUserPatch(BaseModel):
    tier: Optional[str] = None
    role: Optional[str] = None


class ShareIn(BaseModel):
    enabled: bool


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
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_tier(user: dict, min_tier: str):
    order = {"free": 0, "basic": 1, "premium": 2}
    if order.get(user.get("tier", "free"), 0) < order[min_tier]:
        raise HTTPException(status_code=403, detail=f"This requires the {min_tier.capitalize()} tier. Please upgrade.")


# --- brute-force helpers ---
async def check_lockout(identifier: str):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_WINDOW_MIN)).isoformat()
    count = await db.login_attempts.count_documents({
        "identifier": identifier, "ts": {"$gte": cutoff}, "success": False,
    })
    if count >= LOCKOUT_THRESHOLD:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {LOCKOUT_WINDOW_MIN} minutes.",
        )


async def record_attempt(identifier: str, success: bool):
    await db.login_attempts.insert_one({
        "identifier": identifier, "success": success,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    if success:
        await db.login_attempts.delete_many({"identifier": identifier, "success": False})


def _ident(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"{ip}:{email.lower()}"


# --- health ---
@api.get("/")
async def root():
    return {"message": "Vedic Astrology API", "ok": True}


# --- Auth: register ---
@api.post("/auth/register")
async def register(body: RegisterIn, request: Request, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": user_id, "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "tier": "free", "role": "user",
        "email_verified": False,
        "auth_provider": "email",
        "created_at": now,
    }
    await db.users.insert_one(doc.copy())

    # Fire verification email
    await _issue_verification(email, request)

    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {**public_user(doc), "access_token": access}


# --- Auth: login ---
@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = _ident(request, email)
    await check_lockout(ident)
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await record_attempt(ident, False)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await record_attempt(ident, True)
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {**public_user(user), "access_token": access}


# --- Auth: refresh ---
@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user["id"], user["email"])
    new_refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, new_refresh)
    return {"access_token": access}


# --- Auth: logout ---
@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# --- Auth: forgot / reset password ---
@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordIn, request: Request):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    # Always respond 200 to avoid email enumeration; only emit token if user exists.
    if user and user.get("auth_provider", "email") == "email":
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_TTL_HOURS)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"],
            "expires_at": expires, "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        origin = request.headers.get("origin") or ""
        link = f"{origin}/reset-password?token={token}"
        await send_email(
            db, to=email, kind="password_reset",
            subject="Reset your Jyotish Vedic password",
            body=f"Hi {user['name']},\n\nReset your password via this link (valid {RESET_TOKEN_TTL_HOURS}h):\n{link}\n\nIf you did not request this, ignore it.",
        )
    return {"ok": True, "message": "If that email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn):
    rec = await db.password_reset_tokens.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used reset token")
    exp = rec["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    await db.users.update_one(
        {"id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


# --- Auth: email verification ---
async def _issue_verification(email: str, request: Request):
    user = await db.users.find_one({"email": email})
    if not user or user.get("email_verified"):
        return
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=VERIFY_TOKEN_TTL_HOURS)
    await db.email_verification_tokens.insert_one({
        "token": token, "user_id": user["id"],
        "expires_at": expires, "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    origin = request.headers.get("origin") or ""
    link = f"{origin}/verify-email?token={token}"
    await send_email(
        db, to=email, kind="email_verification",
        subject="Verify your Jyotish Vedic email",
        body=f"Hi {user['name']},\n\nConfirm your email (valid {VERIFY_TOKEN_TTL_HOURS}h):\n{link}",
    )


@api.post("/auth/send-verification")
async def send_verification(request: Request, user: dict = Depends(get_current_user)):
    if user.get("email_verified"):
        return {"ok": True, "already_verified": True}
    await _issue_verification(user["email"], request)
    return {"ok": True}


@api.post("/auth/verify-email")
async def verify_email(body: VerifyEmailIn):
    rec = await db.email_verification_tokens.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or used verification token")
    exp = rec["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_verification_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


# --- Auth: Emergent-managed Google OAuth ---
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api.post("/auth/google/session")
async def google_session(response: Response, x_session_id: str = Header(None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            r = await client.get(
                EMERGENT_AUTH_SESSION_URL,
                headers={"X-Session-ID": x_session_id},
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = r.json()
    email = data["email"].lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")

    existing = await db.users.find_one({"email": email})
    if existing:
        update = {"name": name, "picture": picture, "email_verified": True}
        if not existing.get("auth_provider"):
            update["auth_provider"] = "google"
        await db.users.update_one({"id": existing["id"]}, {"$set": update})
        user = await db.users.find_one({"id": existing["id"]}, {"_id": 0, "password_hash": 0})
    else:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id, "email": email, "name": name, "picture": picture,
            "tier": "free", "role": "user",
            "email_verified": True,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user.copy())

    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {**public_user(user), "access_token": access}


# --- Subscription (mock) ---
@api.post("/subscribe")
async def subscribe(body: SubscribeIn, user: dict = Depends(get_current_user)):
    if body.tier not in ("free", "basic", "premium"):
        raise HTTPException(status_code=400, detail="Invalid tier")
    await db.users.update_one({"id": user["id"]}, {"$set": {"tier": body.tier}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return public_user(updated)


# --- Free tier content ---
@api.get("/grahas")
async def list_grahas():
    return {"grahas": GRAHAS}


@api.get("/panchang/today")
async def panchang_today(tz: str = "Asia/Kolkata"):
    try:
        return compute_panchang(tz_name=tz)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid timezone: {e}")


@api.get("/festivals/upcoming")
async def festivals_upcoming(limit: int = 6):
    limit = max(1, min(20, limit))
    return {"festivals": get_upcoming_festivals(limit=limit)}


@api.get("/rashifal/today")
async def rashifal_today(tz: str = "Asia/Kolkata"):
    try:
        panchang = compute_panchang(tz_name=tz)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid timezone: {e}")
    return await get_daily_rashifal(panchang, tz_name=tz)


# --- Numerology (calculation: free / public; AI reading: premium-only) ---
class NumerologyIn(BaseModel):
    full_name: str
    date_of_birth: str  # YYYY-MM-DD


def _parse_dob(dob_str: str) -> date_type:
    try:
        return date_type.fromisoformat(dob_str)
    except ValueError:
        raise HTTPException(status_code=422, detail="date_of_birth must be YYYY-MM-DD")


@api.post("/numerology")
async def numerology_calc(body: NumerologyIn):
    name = (body.full_name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="full_name is required")
    return compute_numerology(_parse_dob(body.date_of_birth), name)


@api.post("/numerology/reading")
async def numerology_reading(body: NumerologyIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    name = (body.full_name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="full_name is required")
    profile = compute_numerology(_parse_dob(body.date_of_birth), name)

    system = (
        "You are a Vedic numerologist (ank-jyotishi) writing a personal reading for a modern "
        "audience. Use a warm, encouraging but honest tone. Reference traditional terminology "
        "(Mulank, Bhagyank, Naamank, ruling graha) with brief translations. Aim for ~250 words "
        "in 4 short sections with Markdown headings."
    )
    user_msg = (
        f"Provide a Vedic numerology reading for:\n"
        f"- Name: {name}\n"
        f"- Date of birth: {body.date_of_birth}\n\n"
        f"Mulank (Root): {profile['mulank']['number']} — ruled by {profile['mulank']['planet']} "
        f"({profile['mulank']['planet_english']}).\n"
        f"Bhagyank (Destiny): {profile['bhagyank']['number']} — ruled by {profile['bhagyank']['planet']} "
        f"({profile['bhagyank']['planet_english']}).\n"
        f"Naamank (Name): {profile['naamank']['number']} — ruled by "
        f"{profile['naamank'].get('planet','—')} "
        f"({profile['naamank'].get('planet_english','—')}).\n\n"
        f"Cover, with brief Markdown headings: (1) Core nature from Mulank, "
        f"(2) Life path & destiny from Bhagyank, (3) Public/professional vibration from "
        f"Naamank, (4) One practical remedial mantra/colour/day to harmonise these vibrations."
    )
    advice = await _ask_claude(system, user_msg, f"numerology-{user['id']}")

    return {**profile, "advice": advice}


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


async def _build_chart(body: AstroIn) -> dict:
    """Geocode place + compute Parashari chart (Swiss Ephemeris, Lahiri, whole-sign)."""
    dob, tob, pob = _parse_inputs(body)
    loc = await geocode_place(db, pob)
    if not loc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not locate '{pob}'. Please use a more specific place (e.g. 'Mumbai, India').",
        )
    return compute_chart_from_local(
        dob.year, dob.month, dob.day,
        tob.hour, tob.minute,
        loc["lat"], loc["lon"],
        loc["display_name"],
    )


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


# --- Basic tier ---
@api.post("/astrology/basic")
async def astrology_basic(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "basic")
    chart = await _build_chart(body)

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
        f"- Place of birth: {body.place_of_birth}\n\n"
        f"Ascendant (Lagna): {chart['ascendant_english']} ({chart['ascendant']}).\n"
        f"Sun in {next(p['rashi_english'] for p in chart['planets'] if p['code']=='Su')}, "
        f"Moon in {next(p['rashi_english'] for p in chart['planets'] if p['code']=='Mo')}.\n\n"
        f"Cover: (1) core personality, (2) strengths, (3) areas for growth, "
        f"(4) one practical remedy (mantra / daily practice). Finish with a short blessing."
    )
    advice = await _ask_claude(system, user_msg, f"basic-{user['id']}")
    reading_id = str(uuid.uuid4())
    summary = {
        "ascendant": chart["ascendant_english"],
        "sun_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Su"),
        "moon_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Mo"),
    }
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "basic",
        "inputs": body.model_dump(), "advice": advice,
        "summary": summary,
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "id": reading_id,
        "ascendant": chart["ascendant_english"],
        "ascendant_sanskrit": chart["ascendant"],
        "moon_sign": summary["moon_sign"],
        "sun_sign": summary["sun_sign"],
        "advice": advice,
    }


# --- Premium tier ---
@api.post("/astrology/premium")
async def astrology_premium(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    chart = await _build_chart(body)

    planet_lines = "\n".join(
        f"- {p['name']}: {p['rashi_english']} ({p['rashi']}) "
        f"{p['degree']}°, house {p['house']}, nakshatra {p.get('nakshatra','—')}"
        f" pada {p.get('nakshatra_pada','')}{' (R)' if p['retrograde'] else ''}"
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
        f"DOB: {body.date_of_birth} | TOB: {body.time_of_birth} | POB: {body.place_of_birth}\n"
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
    summary = {
        "ascendant": chart["ascendant_english"],
        "sun_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Su"),
        "moon_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Mo"),
    }
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "premium",
        "inputs": body.model_dump(), "chart": chart, "advice": advice,
        "summary": summary,
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": reading_id, "chart": chart, "advice": advice}


# --- Readings: list / fetch / delete / share ---
def _public_reading(r: dict) -> dict:
    """Sanitise a reading for public (unauthenticated) view — strips inputs / PII."""
    out = {
        "id": r["id"],
        "tier": r["tier"],
        "created_at": r["created_at"],
        "advice": r.get("advice"),
        "author_name": (r.get("inputs") or {}).get("full_name") or "A Seeker",
    }
    if r["tier"] == "premium":
        out["chart"] = r.get("chart")
    else:
        # derive basic display fields from chart-like data if present, else leave out
        pass
    # Basic-tier readings don't store chart but they do have ascendant/sun/moon in advice context
    # We'll also recompute lagna/sun/moon from the inputs at save-time — but to avoid compute here,
    # we store a small summary on creation below.
    if "summary" in r:
        out["summary"] = r["summary"]
    return out


@api.get("/readings")
async def list_readings(user: dict = Depends(get_current_user)):
    items = await db.readings.find(
        {"user_id": user["id"]},
        {"_id": 0, "inputs": 0},  # hide raw inputs in list view (PII)
    ).sort("created_at", -1).to_list(100)
    # Strip the long `advice` to a preview snippet
    for it in items:
        ad = it.get("advice") or ""
        it["advice_preview"] = (ad[:220] + "…") if len(ad) > 220 else ad
        it.pop("advice", None)
    return {"readings": items}


@api.get("/readings/{reading_id}")
async def get_reading(reading_id: str, user: dict = Depends(get_current_user)):
    r = await db.readings.find_one({"id": reading_id, "user_id": user["id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Reading not found")
    return r


@api.delete("/readings/{reading_id}")
async def delete_reading(reading_id: str, user: dict = Depends(get_current_user)):
    result = await db.readings.delete_one({"id": reading_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reading not found")
    return {"ok": True}


@api.post("/readings/{reading_id}/share")
async def toggle_share(reading_id: str, body: ShareIn, user: dict = Depends(get_current_user)):
    r = await db.readings.find_one({"id": reading_id, "user_id": user["id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Reading not found")
    if body.enabled:
        token = r.get("share_token") or secrets.token_urlsafe(16)
        await db.readings.update_one(
            {"id": reading_id},
            {"$set": {"is_shared": True, "share_token": token}},
        )
        return {"is_shared": True, "share_token": token}
    else:
        await db.readings.update_one(
            {"id": reading_id},
            {"$set": {"is_shared": False}},
        )
        return {"is_shared": False}


@api.get("/public/readings/{share_token}")
async def public_reading(share_token: str):
    r = await db.readings.find_one(
        {"share_token": share_token, "is_shared": True},
        {"_id": 0},
    )
    if not r:
        raise HTTPException(status_code=404, detail="Reading not found or no longer shared")
    return _public_reading(r)


# --- Admin endpoints ---
@admin_api.get("/users")
async def admin_list_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"users": [public_user(u) for u in users]}


@admin_api.patch("/users/{user_id}")
async def admin_patch_user(user_id: str, body: AdminUserPatch, admin: dict = Depends(require_admin)):
    updates = {}
    if body.tier is not None:
        if body.tier not in ("free", "basic", "premium"):
            raise HTTPException(status_code=400, detail="Invalid tier")
        updates["tier"] = body.tier
    if body.role is not None:
        if body.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = body.role
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.users.update_one({"id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return public_user(u)


@admin_api.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@admin_api.get("/emails")
async def admin_list_emails(admin: dict = Depends(require_admin)):
    emails = await db.email_outbox.find({}, {"_id": 0}).sort("sent_at", -1).to_list(200)
    return {"emails": emails}


# --- startup ---
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.readings.create_index("user_id")
    try:
        await db.readings.create_index("share_token", unique=True, sparse=True)
    except Exception as e:
        logger.warning(f"readings.share_token index: {e}")
    try:
        await db.login_attempts.create_index("identifier")
    except Exception as e:
        logger.warning(f"login_attempts index: {e}")
    try:
        await db.password_reset_tokens.create_index("token", unique=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"password_reset_tokens index: {e}")
    try:
        await db.email_verification_tokens.create_index("token", unique=True)
        await db.email_verification_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"email_verification_tokens index: {e}")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vedic.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "name": "Admin",
            "password_hash": hash_password(admin_pw),
            "tier": "premium", "role": "admin",
            "email_verified": True, "auth_provider": "email",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {admin_email}")
    else:
        # Ensure existing admin has role + email_verified (backfill for older users)
        updates = {}
        if existing.get("role") != "admin":
            updates["role"] = "admin"
        if not existing.get("email_verified"):
            updates["email_verified"] = True
        if "auth_provider" not in existing:
            updates["auth_provider"] = "email"
        if updates:
            await db.users.update_one({"id": existing["id"]}, {"$set": updates})


@app.on_event("shutdown")
async def shutdown_event():
    mongo.close()


app.include_router(api)
app.include_router(admin_api)
