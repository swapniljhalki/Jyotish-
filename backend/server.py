from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets
import hashlib
import json
import logging
import asyncio
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta, date as date_type, time as time_type
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from astrology_data import GRAHAS, NAKSHATRAS, get_graha, get_nakshatra
from kundali import compute_chart_from_local
from geocode import geocode_place
from panchang import compute_panchang, get_upcoming_festivals
from numerology import compute_numerology
from num_dasha import compute_numerology_dasha
from rashifal import get_daily_rashifal
from razorpay_service import (
    create_order as rzp_create_order,
    create_custom_order as rzp_create_custom_order,
    verify_signature as rzp_verify_signature,
    verify_webhook_signature as rzp_verify_webhook_signature,
    is_live as rzp_is_live,
    PRICING as RZP_PRICING,
)
from email_service import send_email
from translation_cache import get_or_translate as i18n_translate
from scheduler import (
    CONSULTATION,
    DEFAULT_RULES,
    compute_slots,
    stub_meet_url,
    google_oauth_configured,
    google_auth_url,
    exchange_code_for_tokens,
    refresh_access_token,
    create_calendar_event_with_meet,
    extract_meet_url,
)
from fastapi.responses import RedirectResponse

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
    # SEC-003: `secure=True` restricts cookies to HTTPS. Production runs behind
    # an HTTPS ingress; local dev also runs behind the platform proxy over HTTPS.
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=True,
        samesite="lax", max_age=ACCESS_TTL_MIN * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh, httponly=True, secure=True,
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
    # SEC hardening: explicit allowlist from env (comma-separated); no wildcard
    # in production. Whitespace tolerated around commas.
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---
class RegisterIn(BaseModel):
    email: EmailStr
    # SEC hardening: enforce a minimum password length at the model layer so
    # registration cannot use short/weak secrets.
    password: str = Field(min_length=8)
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
    lang: Optional[str] = "en"


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    # SEC hardening — same 8-char minimum as registration.
    new_password: str = Field(min_length=8)


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
        origin = os.environ.get("FRONTEND_URL", "").rstrip("/")
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
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
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
    origin = os.environ.get("FRONTEND_URL", "").rstrip("/")
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


# --- Subscription (self-service only for the free tier; paid tiers require Razorpay) ---
@api.post("/subscribe")
async def subscribe(body: SubscribeIn, user: dict = Depends(get_current_user)):
    if body.tier != "free":
        raise HTTPException(
            status_code=403,
            detail="Paid tiers require payment — use the Razorpay checkout.",
        )
    await db.users.update_one({"id": user["id"]}, {"$set": {"tier": body.tier}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return public_user(updated)


# --- Razorpay payment flow ---
class PaymentCreateIn(BaseModel):
    tier: str  # "basic" or "premium"


class PaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str = ""
    tier: str


@api.get("/payments/config")
async def payments_config():
    """Public — used by frontend to decide which payment UX to render."""
    return {
        "provider": "razorpay",
        "mode": "live" if rzp_is_live() else "mock",
        "pricing": {
            tier: {
                "label": p["label"],
                "amount_paise": p["amount_paise"],
                "amount_inr": p["amount_paise"] / 100,
                "currency": "INR",
            }
            for tier, p in RZP_PRICING.items()
        },
    }


@api.post("/payments/create-order")
async def payments_create_order(body: PaymentCreateIn, user: dict = Depends(get_current_user)):
    if body.tier not in RZP_PRICING:
        raise HTTPException(status_code=400, detail="Unknown tier")
    try:
        # Razorpay's SDK does a blocking HTTPS call — offload so the event
        # loop doesn't stall under concurrent checkout traffic.
        order = await asyncio.to_thread(rzp_create_order, body.tier, user["id"])
    except Exception as e:
        logger.exception("Razorpay create_order failed for user=%s tier=%s", user.get("id"), body.tier)
        raise HTTPException(status_code=502, detail=f"Razorpay error: {e}")

    # Record pending payment
    await db.payments.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "order_id": order["order_id"],
        "tier": body.tier,
        "amount_paise": order["amount"],
        "currency": order["currency"],
        "mode": order["mode"],
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "order_id": order["order_id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "tier": body.tier,
        "label": order["label"],
        "mode": order["mode"],
        "key_id": order.get("key_id"),
        "prefill": {
            "name": user.get("name", ""),
            "email": user.get("email", ""),
        },
    }


@api.post("/payments/verify")
async def payments_verify(body: PaymentVerifyIn, user: dict = Depends(get_current_user)):
    # The order must have been created by this user, and the tier being claimed
    # must match what was paid for (prevents paying ₹99 and claiming premium).
    payment = await db.payments.find_one({"order_id": body.razorpay_order_id, "user_id": user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Order not found")
    if payment["tier"] != body.tier:
        raise HTTPException(status_code=400, detail="Tier mismatch for this order")

    if not rzp_verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Signature mismatch")

    # Upgrade the user's tier permanently
    await db.users.update_one({"id": user["id"]}, {"$set": {"tier": payment["tier"]}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})

    # Record successful payment
    await db.payments.update_one(
        {"order_id": body.razorpay_order_id, "user_id": user["id"]},
        {"$set": {
            "status": "paid",
            "payment_id": body.razorpay_payment_id,
            "signature": body.razorpay_signature,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {**public_user(updated), "tier": payment["tier"], "payment_status": "success"}


async def _webhook_handle_captured(entity: dict, payment: dict | None, order_id: str, payment_id: str | None) -> None:
    """Mark payment paid + upgrade the user's tier. Idempotent across
    concurrent /payments/verify + webhook races (both set status=paid)."""
    notes = entity.get("notes", {}) or {}
    tier = (payment or {}).get("tier") or notes.get("tier")
    user_id = (payment or {}).get("user_id") or notes.get("user_id")

    if tier and user_id and tier in RZP_PRICING:
        await db.users.update_one({"id": user_id}, {"$set": {"tier": tier}})

    now_iso = datetime.now(timezone.utc).isoformat()
    if payment:
        await db.payments.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": "paid",
                "payment_id": payment_id,
                "paid_at": now_iso,
                "via_webhook": True,
            }},
        )
    else:
        # No prior /create-order record (rare) — log it anyway for audit.
        await db.payments.insert_one({
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "payment_id": payment_id,
            "user_id": user_id,
            "tier": tier,
            "amount_paise": entity.get("amount"),
            "currency": entity.get("currency", "INR"),
            "mode": "live",
            "status": "paid",
            "via_webhook": True,
            "created_at": now_iso,
            "paid_at": now_iso,
        })


async def _webhook_handle_failed(entity: dict, payment: dict | None, order_id: str, payment_id: str | None) -> None:
    """Mark payment failed. If no order record exists we simply ignore — a
    failed payment for an order we never issued isn't ours to worry about."""
    if not payment:
        return
    await db.payments.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "failed",
            "payment_id": payment_id,
            "failed_at": datetime.now(timezone.utc).isoformat(),
            "failure_reason": entity.get("error_description", ""),
        }},
    )


@api.post("/payments/webhook")
async def payments_webhook(request: Request):
    """Razorpay webhook — backend-to-backend payment confirmation safety net.

    If the user closes the browser before /payments/verify fires, Razorpay still
    POSTs `payment.captured` here, and we upgrade their tier from the order
    notes (which include user_id + tier).

    Setup: Razorpay Dashboard → Settings → Webhooks → add
      URL: https://<your-domain>/api/payments/webhook
      Secret: copy into RAZORPAY_WEBHOOK_SECRET env var
      Events: payment.captured, payment.failed
    """
    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not rzp_verify_webhook_signature(raw, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        payload = json.loads(raw.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {}) or {}
    order_id = entity.get("order_id")
    payment_id = entity.get("id")

    if not order_id:
        return {"ok": True, "ignored": True}

    payment = await db.payments.find_one({"order_id": order_id})

    if event == "payment.captured":
        await _webhook_handle_captured(entity, payment, order_id, payment_id)
    elif event == "payment.failed":
        await _webhook_handle_failed(entity, payment, order_id, payment_id)

    return {"ok": True, "event": event}


# =============================================================================
# Consultation Scheduler — Phase 10
# =============================================================================

class AvailabilityRule(BaseModel):
    day: int          # 0=Mon .. 6=Sun
    start: str        # "HH:MM"
    end: str          # "HH:MM"


class AvailabilityIn(BaseModel):
    weekly_rules: list[AvailabilityRule]
    slot_minutes: int = 30
    tz: str = "Asia/Kolkata"


class BookingIn(BaseModel):
    slot_start_utc: str       # ISO datetime
    customer_name: str
    customer_phone: Optional[str] = ""
    notes: Optional[str] = ""


class BookingConfirmIn(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str = ""


async def _get_scheduler_config() -> dict:
    doc = await db.scheduler_config.find_one({"id": "config"}, {"_id": 0})
    if not doc:
        doc = {
            "id":           "config",
            "weekly_rules": DEFAULT_RULES,
            "slot_minutes": CONSULTATION["duration_min"],
            "tz":           CONSULTATION["tz"],
        }
        await db.scheduler_config.insert_one(dict(doc))
        doc.pop("_id", None)
    return doc


async def _get_google_credentials() -> Optional[dict]:
    """Return {access_token, refresh_token, expiry} or None when astrologer hasn't connected."""
    doc = await db.app_config.find_one({"id": "google_calendar"}, {"_id": 0})
    if not doc or not doc.get("refresh_token"):
        return None
    expiry = doc.get("expiry")
    now = datetime.now(timezone.utc)
    if not expiry or datetime.fromisoformat(expiry) <= now + timedelta(seconds=60):
        # Refresh access token
        try:
            fresh = await refresh_access_token(doc["refresh_token"])
        except Exception as e:
            logger.warning(f"Google token refresh failed: {e} — clearing stale credentials.")
            await db.app_config.update_one(
                {"id": "google_calendar"},
                {"$set": {"access_token": None, "expiry": None, "needs_reconnect": True, "refresh_error": str(e)[:200]}},
            )
            return None
        new_expiry = (now + timedelta(seconds=int(fresh.get("expires_in", 3500)))).isoformat()
        await db.app_config.update_one(
            {"id": "google_calendar"},
            {"$set": {"access_token": fresh["access_token"], "expiry": new_expiry, "needs_reconnect": False}},
        )
        return {**doc, "access_token": fresh["access_token"], "expiry": new_expiry}
    return doc


@api.get("/scheduler/config")
async def scheduler_get_config():
    cfg = await _get_scheduler_config()
    return {
        "weekly_rules":     cfg["weekly_rules"],
        "slot_minutes":     cfg["slot_minutes"],
        "tz":               cfg["tz"],
        "price_paise":      CONSULTATION["amount_paise"],
        "price_inr":        CONSULTATION["amount_paise"] / 100,
        "duration_minutes": cfg["slot_minutes"],
        "label":            CONSULTATION["label"],
        "google_connected": (await _get_google_credentials()) is not None,
        "payment_mode":     "live" if rzp_is_live() else "mock",
    }


@api.put("/scheduler/availability")
async def scheduler_set_availability(body: AvailabilityIn, _: dict = Depends(require_admin)):
    if body.slot_minutes not in (15, 30, 45, 60):
        raise HTTPException(status_code=400, detail="slot_minutes must be 15/30/45/60")
    rules = [r.dict() for r in body.weekly_rules]
    for r in rules:
        if not (0 <= r["day"] <= 6):
            raise HTTPException(status_code=400, detail="day must be 0..6 (Mon..Sun)")
    await db.scheduler_config.update_one(
        {"id": "config"},
        {"$set": {"weekly_rules": rules, "slot_minutes": body.slot_minutes, "tz": body.tz}},
        upsert=True,
    )
    return await scheduler_get_config()


@api.get("/scheduler/slots")
async def scheduler_slots(weeks: int = 4):
    weeks = max(1, min(8, weeks))
    cfg = await _get_scheduler_config()

    horizon_end = datetime.now(timezone.utc) + timedelta(days=weeks * 7 + 1)
    cursor = db.bookings.find(
        {"status": {"$in": ["pending", "paid"]}, "slot_start_utc": {"$lte": horizon_end.isoformat()}},
        {"_id": 0, "slot_start_utc": 1},
    )
    booked = {b["slot_start_utc"] async for b in cursor}

    slots = compute_slots(
        weekly_rules=cfg["weekly_rules"],
        slot_minutes=cfg["slot_minutes"],
        weeks_ahead=weeks,
        tz_name=cfg["tz"],
        booked_starts_utc=booked,
    )
    return {"slots": slots, "tz": cfg["tz"], "slot_minutes": cfg["slot_minutes"]}


@api.post("/scheduler/book")
async def scheduler_book(body: BookingIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    cfg = await _get_scheduler_config()
    duration = cfg["slot_minutes"]

    # Validate slot start
    try:
        start_utc = datetime.fromisoformat(body.slot_start_utc.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid slot_start_utc")
    if start_utc <= datetime.now(timezone.utc) + timedelta(minutes=30):
        raise HTTPException(status_code=400, detail="Slot must be at least 30 minutes in the future")
    end_utc = start_utc + timedelta(minutes=duration)
    start_iso = start_utc.isoformat()

    # Check not already booked
    clash = await db.bookings.find_one(
        {"slot_start_utc": start_iso, "status": {"$in": ["pending", "paid"]}},
        {"_id": 0, "id": 1},
    )
    if clash:
        raise HTTPException(status_code=409, detail="That slot was just taken — please pick another.")

    # Create a Razorpay order for the consultation fee (independent of any tier pricing).
    try:
        order = await asyncio.to_thread(
            rzp_create_custom_order,
            amount_paise=CONSULTATION["amount_paise"],
            label=CONSULTATION["label"],
            user_id=user["id"],
            receipt_prefix="rcpt_consult",
            notes={"booking_slot": start_iso},
        )
    except Exception as e:
        logger.exception("Razorpay create_custom_order failed for user=%s slot=%s", user.get("id"), start_iso)
        raise HTTPException(status_code=502, detail=f"Razorpay error: {e}")

    booking_id = str(uuid.uuid4())
    booking = {
        "id":              booking_id,
        "user_id":         user["id"],
        "user_email":      user["email"],
        "customer_name":   body.customer_name.strip(),
        "customer_phone":  (body.customer_phone or "").strip(),
        "notes":           (body.notes or "").strip(),
        "slot_start_utc":  start_iso,
        "slot_end_utc":    end_utc.isoformat(),
        "duration_min":    duration,
        "amount_paise":    CONSULTATION["amount_paise"],
        "currency":        CONSULTATION["currency"],
        "status":          "pending",
        "order_id":        order["order_id"],
        "payment_mode":    order["mode"],
        "meet_url":        None,
        "calendar_event_id": None,
        "created_at":      datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(dict(booking))
    booking.pop("_id", None)

    return {
        "booking":  booking,
        "order": {
            "order_id": order["order_id"],
            "amount":   CONSULTATION["amount_paise"],
            "currency": CONSULTATION["currency"],
            "mode":     order["mode"],
            "key_id":   order.get("key_id"),
            "label":    CONSULTATION["label"],
            "prefill":  {"name": body.customer_name, "email": user["email"], "contact": body.customer_phone or ""},
        },
    }


@api.post("/scheduler/confirm")
async def scheduler_confirm(body: BookingConfirmIn, user: dict = Depends(get_current_user)):
    if not rzp_verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Signature mismatch")

    booking = await db.bookings.find_one({"id": body.booking_id, "user_id": user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["order_id"] != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch")
    if booking["status"] == "paid":
        return booking  # already confirmed (idempotent)

    # Try to create a real Google Calendar event with Meet
    meet_url = None
    event_id = None
    creds = await _get_google_credentials()
    astrologer_email = os.environ.get("ASTROLOGER_EMAIL", "")
    if creds:
        try:
            event = await create_calendar_event_with_meet(
                access_token=creds["access_token"],
                summary=f"Vedic Consultation — {booking['customer_name']}",
                description=(
                    f"Booked via Satish Numero World.\n\n"
                    f"Customer: {booking['customer_name']}\n"
                    f"Email: {booking['user_email']}\n"
                    f"Phone: {booking['customer_phone'] or '—'}\n\n"
                    f"Notes:\n{booking['notes'] or '(none)'}\n"
                ),
                start_iso_utc=booking["slot_start_utc"],
                end_iso_utc=booking["slot_end_utc"],
                attendee_emails=list({booking["user_email"], astrologer_email} - {""}),
            )
            meet_url = extract_meet_url(event)
            event_id = event.get("id")
        except Exception as e:
            logger.warning(f"Google Calendar event creation failed: {e} — falling back to stub link.")

    if not meet_url:
        meet_url = stub_meet_url()

    updates = {
        "status":            "paid",
        "payment_id":        body.razorpay_payment_id,
        "signature":         body.razorpay_signature,
        "paid_at":           datetime.now(timezone.utc).isoformat(),
        "meet_url":          meet_url,
        "calendar_event_id": event_id,
    }
    await db.bookings.update_one({"id": body.booking_id}, {"$set": updates})

    # Notify both parties via outbox
    try:
        await send_email(
            to=booking["user_email"],
            subject="Your Vedic Consultation is confirmed",
            body=(
                f"Namaste {booking['customer_name']},\n\n"
                f"Your 1:1 consultation is confirmed for {booking['slot_start_utc']} (UTC).\n"
                f"Join here: {meet_url}\n\n"
                f"— Satish Numero World"
            ),
        )
        if astrologer_email:
            await send_email(
                to=astrologer_email,
                subject=f"New booking — {booking['customer_name']}",
                body=(
                    f"New 1:1 booking for {booking['slot_start_utc']} (UTC).\n"
                    f"Client: {booking['customer_name']} <{booking['user_email']}> "
                    f"({booking['customer_phone'] or 'no phone'})\n"
                    f"Notes: {booking['notes'] or '(none)'}\n"
                    f"Meet: {meet_url}\n"
                ),
            )
    except Exception as e:
        logger.warning(f"Booking confirmation emails failed: {e}")

    return {**booking, **updates}


@api.get("/scheduler/my-bookings")
async def scheduler_my_bookings(user: dict = Depends(get_current_user)):
    cursor = db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("slot_start_utc", -1).limit(50)
    return {"bookings": [b async for b in cursor]}


@api.get("/scheduler/all-bookings")
async def scheduler_all_bookings(_: dict = Depends(require_admin)):
    cursor = db.bookings.find({}, {"_id": 0}).sort("slot_start_utc", -1).limit(200)
    return {"bookings": [b async for b in cursor]}


# --- Google OAuth (admin one-time hookup) ------------------------------------

@api.get("/scheduler/oauth/start")
async def scheduler_oauth_start(_: dict = Depends(require_admin)):
    if not google_oauth_configured():
        raise HTTPException(status_code=400, detail="Google OAuth not configured on the server (missing client id/secret).")
    state = secrets.token_urlsafe(16)
    await db.app_config.update_one(
        {"id": "google_oauth_state"},
        {"$set": {"state": state, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"authorization_url": google_auth_url(state)}


@api.get("/scheduler/oauth/callback")
async def scheduler_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    target = "/admin?tab=scheduler"
    if error or not code:
        return RedirectResponse(url=f"{target}&oauth=error&msg={error or 'no_code'}")

    saved = await db.app_config.find_one({"id": "google_oauth_state"}, {"_id": 0})
    if not saved or saved.get("state") != state:
        return RedirectResponse(url=f"{target}&oauth=error&msg=state_mismatch")

    try:
        tokens = await exchange_code_for_tokens(code)
    except Exception:
        return RedirectResponse(url=f"{target}&oauth=error&msg=token_exchange_failed")

    refresh = tokens.get("refresh_token")
    if not refresh:
        return RedirectResponse(url=f"{target}&oauth=error&msg=no_refresh_token")

    now = datetime.now(timezone.utc)
    expiry = (now + timedelta(seconds=int(tokens.get("expires_in", 3500)))).isoformat()
    await db.app_config.update_one(
        {"id": "google_calendar"},
        {"$set": {
            "id":            "google_calendar",
            "refresh_token": refresh,
            "access_token":  tokens.get("access_token"),
            "expiry":        expiry,
            "scope":         tokens.get("scope", ""),
            "connected_at":  now.isoformat(),
        }},
        upsert=True,
    )
    return RedirectResponse(url=f"{target}&oauth=success")


@api.post("/scheduler/oauth/disconnect")
async def scheduler_oauth_disconnect(_: dict = Depends(require_admin)):
    await db.app_config.delete_one({"id": "google_calendar"})
    return {"ok": True}


# --- Free tier content ---
@api.get("/grahas")
async def list_grahas(lang: str = "en"):
    data = await i18n_translate(db, "grahas", lang, GRAHAS)
    return {"grahas": data}


# =============================================================================
# Global place autocomplete (OpenStreetMap Nominatim proxy)
# =============================================================================
# In-process LRU cache so repeated lookups of the same query are instant.
_geo_cache: dict[str, tuple[float, list]] = {}
_GEO_TTL_SEC = 60 * 60 * 24  # 24h


@api.get("/geo/search")
async def geo_search(q: str, limit: int = 8, lang: str = "en"):
    """Type-ahead global place search powered by Komoot's Photon (built on top of
    OpenStreetMap + Elasticsearch). Photon is purpose-built for autocomplete and
    handles prefix matching ("Mumb" → "Mumbai") far better than vanilla Nominatim.

    Returns a slim list of {label, name, country, lat, lon, type} entries.
    Cached in-process for 24h to keep the upstream free service happy.
    """
    import httpx
    q = (q or "").strip()
    if len(q) < 2:
        return {"results": []}

    key = f"{lang}::{limit}::{q.lower()}"
    now = datetime.now(timezone.utc).timestamp()
    cached = _geo_cache.get(key)
    if cached and (now - cached[0]) < _GEO_TTL_SEC:
        return {"results": cached[1]}

    params = {
        "q":     q,
        "limit": str(max(1, min(15, limit * 2))),  # over-fetch so we can filter
        "lang":  (lang or "en") if lang in ("en", "de", "fr", "it") else "en",
    }
    headers = {
        "User-Agent": "SatishNumeroWorld/1.0 (https://kundali-chart-1.preview.emergentagent.com)",
    }
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://photon.komoot.io/api/",
                params=params,
                headers=headers,
            )
        r.raise_for_status()
        rows = r.json().get("features", [])
    except Exception as e:
        logger.warning(f"geo_search failed for q={q!r}: {e}")
        return {"results": []}

    # Rank: cities > towns > villages > rest. Drop non-settlement noise.
    PLACE_RANK = {
        "city": 0, "town": 1, "village": 2, "municipality": 3,
        "hamlet": 4, "county": 5, "state": 6, "country": 7,
        "administrative": 8, "suburb": 9, "neighbourhood": 10,
    }
    settlement_classes = {"place", "boundary"}

    results = []
    for f in rows:
        p = (f.get("properties") or {})
        geom = (f.get("geometry") or {}).get("coordinates") or [0, 0]
        lon, lat = geom[0], geom[1]
        name = p.get("name") or ""
        state = p.get("state") or ""
        country = p.get("country") or ""
        osm_value = (p.get("osm_value") or "").lower()
        osm_key = (p.get("osm_key") or "").lower()

        if osm_key not in settlement_classes:
            continue
        if osm_value not in PLACE_RANK:
            # Skip rare/unsettlement types but allow administrative regions
            continue

        bits = []
        seen = set()
        for b in (name, state, country):
            if b and b.lower() not in seen:
                seen.add(b.lower())
                bits.append(b)
        label = ", ".join(bits)
        if not label:
            continue
        results.append({
            "label":   label,
            "name":    name,
            "state":   state,
            "country": country,
            "lat":     float(lat),
            "lon":     float(lon),
            "type":    osm_value,
            "class":   osm_key,
            "osm_id":  p.get("osm_id"),
            "_rank":   PLACE_RANK[osm_value],
        })

    results.sort(key=lambda r: r["_rank"])
    deduped = []
    seen_labels = set()
    for r in results:
        key2 = r["label"].lower()
        if key2 in seen_labels:
            continue
        seen_labels.add(key2)
        r.pop("_rank", None)
        deduped.append(r)
    results = deduped[:limit]

    _geo_cache[key] = (now, results)
    return {"results": results}


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
async def rashifal_today(tz: str = "Asia/Kolkata", lang: str = "en"):
    try:
        panchang = compute_panchang(tz_name=tz)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid timezone: {e}")
    return await get_daily_rashifal(panchang, tz_name=tz, lang=lang)


# --- Visitor stats (lightweight on-page counter) ---
def _hash_ip(ip: str) -> str:
    """Privacy-preserving one-way IP hash."""
    salt = os.environ.get("VISITOR_HASH_SALT", "satish-numero-salt-v1")
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:16]


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@api.post("/stats/visit")
async def stats_visit(request: Request):
    """Increment visitor counters. Called once per browser session by the landing page."""
    today = datetime.now(timezone.utc).date().isoformat()
    ip_hash = _hash_ip(_client_ip(request))
    await db.site_stats.update_one(
        {"_id": "global"},
        {
            "$inc": {"total_views": 1, f"daily.{today}": 1},
            "$addToSet": {"unique_ips": ip_hash},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )
    return {"ok": True}


@api.get("/stats/visitors")
async def stats_visitors():
    doc = await db.site_stats.find_one({"_id": "global"}) or {}
    today = datetime.now(timezone.utc).date().isoformat()
    return {
        "total_views": int(doc.get("total_views", 0)),
        "unique_visitors": len(doc.get("unique_ips", [])),
        "today_views": int(doc.get("daily", {}).get(today, 0)),
    }


# --- Numerology (calculation: free / public; AI reading: premium-only) ---
class NumerologyIn(BaseModel):
    full_name: str
    date_of_birth: str  # YYYY-MM-DD
    lang: Optional[str] = "en"


class ChaldeanNameIn(BaseModel):
    full_name: str


def _parse_dob(dob_str: str) -> date_type:
    try:
        return date_type.fromisoformat(dob_str)
    except ValueError:
        raise HTTPException(status_code=422, detail="date_of_birth must be YYYY-MM-DD")


class MobileIn(BaseModel):
    mobile_number: str


def _reduce_to_single(n: int) -> int:
    n = abs(n)
    while n > 9:
        n = sum(int(d) for d in str(n))
    return n if n != 0 else 9


@api.post("/numerology/mobile")
async def numerology_mobile(body: MobileIn):
    digits = [int(c) for c in (body.mobile_number or "") if c.isdigit()]
    if len(digits) < 6:
        raise HTTPException(
            status_code=422,
            detail="mobile_number must contain at least 6 digits",
        )
    total = sum(digits)
    single = _reduce_to_single(total)

    from numerology import NUMBER_PROFILE
    profile = NUMBER_PROFILE[single]

    # Digit frequency — useful traditional insight
    freq = {str(d): digits.count(d) for d in range(0, 10)}
    missing = sorted(int(d) for d, c in freq.items() if c == 0 and d != "0")
    dominant = max(range(1, 10), key=lambda d: digits.count(d))

    return {
        "mobile_number": body.mobile_number,
        "digits_used": "".join(str(d) for d in digits),
        "digit_sum": total,
        "mobile_number_ank": {
            "number": single,
            "label": "Mobile Number Ank",
            "derivation": f"Sum of digits = {total} → {single}",
            **profile,
        },
        "frequency": freq,
        "dominant_digit": dominant,
        "missing_digits": missing,
    }


@api.post("/numerology")
async def numerology_calc(body: NumerologyIn):
    name = (body.full_name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="full_name is required")
    return compute_numerology(_parse_dob(body.date_of_birth), name)


@api.post("/numerology/chaldean-name")
async def numerology_chaldean_name(body: ChaldeanNameIn):
    """Letter-by-letter Chaldean name numerology — for the Premium Numerology page."""
    name = (body.full_name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="full_name is required")

    from numerology import CHALDEAN_MAP, NUMBER_PROFILE

    letters = []
    total = 0
    for ch in name.upper():
        if ch in CHALDEAN_MAP:
            val = CHALDEAN_MAP[ch]
            letters.append({"letter": ch, "value": val})
            total += val
        elif ch == " ":
            letters.append({"letter": " ", "value": None, "space": True})
        else:
            letters.append({"letter": ch, "value": None})

    single = _reduce_to_single(total) if total > 0 else 0
    profile = NUMBER_PROFILE[single] if single else {}

    return {
        "full_name": name,
        "letters": letters,
        "compound_total": total,
        "name_number": {
            "number": single,
            "label": "Naamank (Chaldean Name Number)",
            "derivation": f"Compound total = {total} → {single}",
            **profile,
        },
    }


@api.post("/numerology/reading")
async def numerology_reading(body: NumerologyIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    name = (body.full_name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="full_name is required")
    profile = compute_numerology(_parse_dob(body.date_of_birth), name)
    profile["dasha"] = compute_numerology_dasha(_parse_dob(body.date_of_birth), profile["mulank"]["number"])

    cur = profile["dasha"]["current"]
    cur_md_n = cur.get("mahadasha")
    cur_ad_n = cur.get("antardasha")
    cur_pd_n = cur.get("pratyantardasha")

    system = (
        "You are a Vedic numerologist (ank-jyotishi) writing a personal reading for a modern "
        "audience. Use a warm, encouraging but honest tone. Reference traditional terminology "
        "(Mulank, Bhagyank, Naamank, ruling graha, Mahadasha, Antardasha, Pratyantardasha) "
        "with brief translations. Aim for ~280 words in 5 short sections with Markdown headings."
        + _lang_instruction(body.lang)
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
        f"({profile['naamank'].get('planet_english','—')}).\n"
        f"Currently running Numerology Dasha: Mahadasha of number {cur_md_n}, "
        f"Antardasha of {cur_ad_n}, Pratyantardasha of {cur_pd_n}.\n\n"
        f"Cover, with brief Markdown headings: (1) Core nature from Mulank, "
        f"(2) Life path & destiny from Bhagyank, (3) Public/professional vibration from "
        f"Naamank, (4) The current Mahadasha/Antardasha period and what it asks of you, "
        f"(5) One practical remedial mantra/colour/day to harmonise these vibrations."
    )
    advice = await _ask_claude(system, user_msg, f"numerology-{user['id']}")

    return {**profile, "advice": advice}


@api.get("/grahas/{graha_id}")
async def graha_detail(graha_id: str, lang: str = "en"):
    g = get_graha(graha_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graha not found")
    if lang != "en":
        translated = await i18n_translate(db, "grahas", lang, GRAHAS)
        for t in translated:
            if t["id"] == graha_id:
                return t
    return g


@api.get("/nakshatras")
async def list_nakshatras(lang: str = "en"):
    data = await i18n_translate(db, "nakshatras", lang, NAKSHATRAS)
    return {"nakshatras": data}


@api.get("/nakshatras/{nid}")
async def nakshatra_detail(nid: int, lang: str = "en"):
    n = get_nakshatra(nid)
    if not n:
        raise HTTPException(status_code=404, detail="Nakshatra not found")
    if lang != "en":
        translated = await i18n_translate(db, "nakshatras", lang, NAKSHATRAS)
        for t in translated:
            if t["id"] == nid:
                return t
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
    """Geocode place + compute Parashari chart (Swiss Ephemeris, Lahiri, whole-sign).
    Also attaches a Vedic numerology overview (Mulank / Bhagyank / Naamank) so
    the Premium reading can render both astrology + numerology summaries side by side."""
    dob, tob, pob = _parse_inputs(body)
    loc = await geocode_place(db, pob)
    if not loc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not locate '{pob}'. Please use a more specific place (e.g. 'Mumbai, India').",
        )
    chart = compute_chart_from_local(
        dob.year, dob.month, dob.day,
        tob.hour, tob.minute,
        loc["lat"], loc["lon"],
        loc["display_name"],
    )
    # Enrich with Vedic numerology (Mulank/Bhagyank/Naamank + planet profiles).
    # Uses the user's supplied full_name for Naamank; Mulank/Bhagyank are DOB-only.
    chart["numerology"] = compute_numerology(dob, (body.full_name or "").strip())
    return chart


def _ask_claude_blocking(system: str, user_msg: str, session_id: str) -> str:
    """Runs the LLM call in its own event loop — executed via asyncio.to_thread so
    long generations can never block the main server loop."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=session_id,
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    return asyncio.run(chat.send_message(UserMessage(text=user_msg)))


async def _ask_claude(system: str, user_msg: str, session_id: str) -> str:
    try:
        return await asyncio.to_thread(_ask_claude_blocking, system, user_msg, session_id)
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")


LANG_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "te": "Telugu",
    "ta": "Tamil",
}


def _lang_instruction(lang: Optional[str]) -> str:
    """Return a system-prompt suffix instructing Claude to respond in the user's language."""
    code = (lang or "en").lower()
    if code == "en" or code not in LANG_NAMES:
        return ""
    return (
        f" CRITICAL: Write the ENTIRE response in {LANG_NAMES[code]}. "
        f"Sanskrit/Vedic terms (kundali, graha, nakshatra, rashi, bhava, dasha, antardasha) "
        f"should be written in the native script of {LANG_NAMES[code]} (e.g. कुंडली, నక్షత్రం, கிரகம்). "
        f"Keep all Markdown headings, line breaks, and structure exactly as instructed, but translate all text content."
    )


# --- Basic tier ---
@api.post("/astrology/basic")
async def astrology_basic(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "basic")
    chart = await _build_chart(body)
    system, user_msg, nakshatra_report, basic_chart, summary = _basic_prompts(body, chart)
    advice = await _ask_claude(system, user_msg, f"basic-{user['id']}")
    reading_id = str(uuid.uuid4())
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "basic",
        "inputs": body.model_dump(), "advice": advice,
        "summary": summary,
        "chart": basic_chart,
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "id": reading_id,
        "ascendant": chart["ascendant_english"],
        "ascendant_sanskrit": chart["ascendant"],
        "moon_sign": summary["moon_sign"],
        "sun_sign":  summary["sun_sign"],
        "nakshatra_report": nakshatra_report,
        "advice": advice,
        "chart": basic_chart,
    }


def _compute_nakshatra_report(chart: dict):
    """Return a nakshatra-report dict driven by the Moon's placement, or None."""
    moon = next((p for p in chart["planets"] if p["code"] == "Mo"), None)
    nak_meta = get_nakshatra(moon["nakshatra_index"]) if moon else None
    if not (moon and nak_meta):
        return None
    return {
        "name":        nak_meta["name"],
        "sanskrit":    nak_meta["sanskrit"],
        "pada":        moon["nakshatra_pada"],
        "deity":       nak_meta["deity"],
        "symbol":      nak_meta["symbol"],
        "ruler":       nak_meta["ruler"],
        "range":       nak_meta["range"],
        "gana":        nak_meta["gana"],
        "quality":     nak_meta["quality"],
        "description": nak_meta["description"],
    }


def _basic_prompts(body: "AstroIn", chart: dict):
    """Build the system/user prompt for a Basic-tier reading plus the
    chart/summary/nakshatra payload that gets persisted and returned."""
    nakshatra_report = _compute_nakshatra_report(chart)

    sun_rashi  = next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Su")
    moon_rashi = next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Mo")
    nak_context = (
        f"Moon's Nakshatra: {nakshatra_report['name']} ({nakshatra_report['sanskrit']}), "
        f"pada {nakshatra_report['pada']}, ruled by {nakshatra_report['ruler']}, "
        f"deity {nakshatra_report['deity']}, symbol {nakshatra_report['symbol']}, "
        f"quality {nakshatra_report['quality']}."
        if nakshatra_report else ""
    )

    system = (
        "You are a senior Vedic astrologer (Jyotishi) writing a thoughtful, detailed reading "
        "for a modern audience. Reference the given placements — including the Moon's nakshatra "
        "and its deity / symbol — where they meaningfully shape the personality, life path or "
        "remedies. Use warm, encouraging but honest language. Use traditional Vedic terminology "
        "(rashi, graha, bhava, nakshatra) with brief plain-English translations. Be specific to "
        "the placements provided, never generic. Aim for ~500–600 words. Structure with the "
        "exact Markdown ## section headings asked below; keep each section to 2–4 short "
        "paragraphs."
        + _lang_instruction(body.lang)
    )
    user_msg = (
        f"Provide a DETAILED Vedic astrological reading for:\n"
        f"- Name: {body.full_name or 'Seeker'}\n"
        f"- Date of birth: {body.date_of_birth}\n"
        f"- Time of birth: {body.time_of_birth}\n"
        f"- Place of birth: {body.place_of_birth}\n\n"
        f"Ascendant (Lagna): {chart['ascendant_english']} ({chart['ascendant']}).\n"
        f"Sun in {sun_rashi}, Moon in {moon_rashi}.\n"
        f"{nak_context}\n\n"
        f"Write the reading with these exact sections, in this order:\n"
        f"## Overall Personality\n"
        f"## Strengths\n"
        f"## Areas of Growth\n"
        f"## Career & Dharma\n"
        f"## Wealth & Finances\n"
        f"## Relationships & Marriage\n"
        f"## Health & Vitality\n"
        f"## Spiritual Path\n"
        f"## Current Focus & Remedies\n\n"
        f"End with a short closing blessing in Sanskrit with English translation."
    )

    summary = {
        "ascendant": chart["ascendant_english"],
        "sun_sign":  sun_rashi,
        "moon_sign": moon_rashi,
    }
    # Basic tier: include Lagna + Chandra Rashi + Navamsha charts and the
    # Moon's nakshatra report. Vimshottari dasha and numerology dasha remain
    # Premium-exclusive.
    basic_chart = {
        k: v for k, v in chart.items()
        if k not in ("dasha", "numerology_dasha", "mulank")
    }
    if nakshatra_report:
        basic_chart["nakshatra_report"] = nakshatra_report

    return system, user_msg, nakshatra_report, basic_chart, summary


# Async variant — Claude can exceed the edge gateway's 60–100 s timeout for the
# ~600-word reading, so the frontend starts the job and polls until it's done.
@api.post("/astrology/basic/start")
async def astrology_basic_start(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "basic")
    chart = await _build_chart(body)
    system, user_msg, nakshatra_report, basic_chart, summary = _basic_prompts(body, chart)
    reading_id = str(uuid.uuid4())
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "basic",
        "inputs": body.model_dump(), "chart": basic_chart, "advice": "",
        "status": "processing",
        "summary": summary,
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def _generate():
        try:
            advice = await _ask_claude(system, user_msg, f"basic-{user['id']}")
            await db.readings.update_one(
                {"id": reading_id}, {"$set": {"advice": advice, "status": "done"}}
            )
        except Exception as e:
            logging.exception("Basic reading generation failed")
            await db.readings.update_one(
                {"id": reading_id}, {"$set": {"status": "failed", "error": str(e)}}
            )

    asyncio.create_task(_generate())
    return {
        "id": reading_id,
        "status": "processing",
        "chart": basic_chart,
        "ascendant": chart["ascendant_english"],
        "ascendant_sanskrit": chart["ascendant"],
        "sun_sign":  summary["sun_sign"],
        "moon_sign": summary["moon_sign"],
        "nakshatra_report": nakshatra_report,
    }


@api.get("/astrology/basic/status/{reading_id}")
async def astrology_basic_status(reading_id: str, user: dict = Depends(get_current_user)):
    r = await db.readings.find_one({"id": reading_id, "user_id": user["id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Reading not found")
    chart = r.get("chart") or {}
    summary = r.get("summary") or {}
    return {
        "id": r["id"],
        "status": r.get("status", "done"),
        "chart": chart,
        "advice": r.get("advice"),
        "ascendant": chart.get("ascendant_english") or summary.get("ascendant"),
        "ascendant_sanskrit": chart.get("ascendant"),
        "sun_sign":  summary.get("sun_sign"),
        "moon_sign": summary.get("moon_sign"),
        "nakshatra_report": chart.get("nakshatra_report"),
    }


# Streaming variant — the ~500-word Vedic reading takes 30-90s to fully generate.
# Instead of making the user stare at a spinner, we send the chart in the very
# first SSE event (arrives in ~1-2s) and then stream Claude's tokens as they're
# produced, so the "Detailed Reading" section fills in progressively — the user
# starts reading within a second or two.
@api.post("/astrology/basic/stream")
async def astrology_basic_stream(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "basic")
    chart = await _build_chart(body)
    system, user_msg, nakshatra_report, basic_chart, summary = _basic_prompts(body, chart)
    reading_id = str(uuid.uuid4())
    inputs_dump = body.model_dump()
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "basic",
        "inputs": inputs_dump, "chart": basic_chart, "advice": "",
        "status": "processing",
        "summary": summary,
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def event_stream():
        # 1) chart event — lets the frontend render Ascendant / Moon sign /
        #    Nakshatra / D1 / D9 charts immediately, in parallel with token streaming.
        chart_payload = {
            "id": reading_id,
            "chart": basic_chart,
            "ascendant": chart["ascendant_english"],
            "ascendant_sanskrit": chart["ascendant"],
            "sun_sign":  summary["sun_sign"],
            "moon_sign": summary["moon_sign"],
            "nakshatra_report": nakshatra_report,
        }
        yield f"event: chart\ndata: {json.dumps(chart_payload)}\n\n"

        # 2) token deltas from Claude via litellm's async streaming
        #    (emergentintegrations 0.1.0 doesn't expose stream_message yet, but
        #    it uses litellm under the hood — we call the same proxy setup here
        #    with stream=True to get token-by-token deltas.)
        import litellm
        from emergentintegrations.llm.chat import get_integration_proxy_url

        emergent_key = os.environ["EMERGENT_LLM_KEY"]
        params = {
            "model": "claude-sonnet-4-5-20250929",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user_msg},
            ],
            "api_key": emergent_key,
            "api_base": get_integration_proxy_url() + "/llm",
            "custom_llm_provider": "openai",
            "stream": True,
        }

        collected = []
        try:
            response = await litellm.acompletion(**params)
            async for chunk in response:
                # litellm chunk shape: choices[0].delta.content (may be None)
                delta = None
                if chunk and getattr(chunk, "choices", None):
                    ch0 = chunk.choices[0]
                    if getattr(ch0, "delta", None) and getattr(ch0.delta, "content", None):
                        delta = ch0.delta.content
                if delta:
                    collected.append(delta)
                    yield f"event: delta\ndata: {json.dumps({'text': delta})}\n\n"
        except Exception as e:
            logging.exception("Basic streaming reading failed")
            await db.readings.update_one(
                {"id": reading_id}, {"$set": {"status": "failed", "error": str(e)}}
            )
            yield f"event: error\ndata: {json.dumps({'message': 'The reading could not be generated. Please try again.'})}\n\n"
            return

        # 3) persist the completed reading + done marker
        advice_full = "".join(collected)
        await db.readings.update_one(
            {"id": reading_id},
            {"$set": {"advice": advice_full, "status": "done"}},
        )
        yield f"event: done\ndata: {json.dumps({'id': reading_id})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Critical: disable proxy buffering so tokens arrive one at a time,
            # not batched into one big chunk by nginx/Cloudflare.
            "X-Accel-Buffering": "no",
        },
    )


# --- Premium tier ---
def _premium_prompts(body: "AstroIn", chart: dict):
    planet_lines = "\n".join(
        f"- {p['name']}: {p['rashi_english']} ({p['rashi']}) "
        f"{p['degree']}°, house {p['house']}, nakshatra {p.get('nakshatra','—')}"
        f" pada {p.get('nakshatra_pada','')}"
        + (f" — STATES: {', '.join(p.get('states', []))}" if p.get('states') else "")
        for p in chart["planets"]
    )

    dasha = chart.get("dasha", {}).get("current") or {}
    dasha_line = (
        f"Current Vimshottari Dasha: Mahadasha of {dasha.get('mahadasha','—')}, "
        f"Antardasha of {dasha.get('antardasha','—')}, "
        f"Pratyantardasha of {dasha.get('pratyantardasha','—')}."
    )

    system = (
        "You are a senior Vedic astrologer (Jyotishi) writing a detailed premium reading. "
        "Reference the specific planetary placements given — including the outer modern grahas "
        "Uranus and Neptune when their placements meaningfully shape the personality, "
        "career or spiritual path (treat them as auxiliary indicators, never overriding the "
        "classical Parashari nine grahas). When a planet's STATES include Retrograde (vakri), "
        "Combust (asta), Exalted (uchcha), Debilitated (neecha) or Vargottam, weave the "
        "implications of those states into your interpretation — they are central to a "
        "classical reading. When the current Vimshottari Dasha is provided, dedicate the "
        "'Current Focus & Remedies' section to interpreting that dasha period (mahadasha "
        "lord's themes flavoured by the antardasha lord). Use traditional Vedic terminology "
        "with brief translations. Be insightful, specific and warm. Aim for ~550–700 words. "
        "Structure with clear Markdown-style headings."
        + _lang_instruction(body.lang)
    )
    user_msg = (
        f"Generate a DETAILED Vedic kundali interpretation.\n\n"
        f"Native: {body.full_name or 'Seeker'}\n"
        f"DOB: {body.date_of_birth} | TOB: {body.time_of_birth} | POB: {body.place_of_birth}\n"
        f"Ascendant (Lagna): {chart['ascendant_english']} ({chart['ascendant']})\n\n"
        f"Planetary placements:\n{planet_lines}\n\n"
        f"{dasha_line}\n\n"
        f"Write the reading with these sections, each 2–4 sentences:\n"
        f"## Overall Personality\n## Career & Dharma\n## Wealth & Finances\n"
        f"## Relationships & Marriage\n## Health & Vitality\n## Spiritual Path\n"
        f"## Current Focus & Remedies\n\n"
        f"End with a short closing blessing in Sanskrit with English translation."
    )
    return system, user_msg


def _premium_summary(chart: dict) -> dict:
    return {
        "ascendant": chart["ascendant_english"],
        "sun_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Su"),
        "moon_sign": next(p["rashi_english"] for p in chart["planets"] if p["code"] == "Mo"),
    }


@api.post("/astrology/premium")
async def astrology_premium(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    chart = await _build_chart(body)
    chart["nakshatra_report"] = _compute_nakshatra_report(chart)
    system, user_msg = _premium_prompts(body, chart)
    advice = await _ask_claude(system, user_msg, f"premium-{user['id']}")
    reading_id = str(uuid.uuid4())
    summary = _premium_summary(chart)
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "premium",
        "inputs": body.model_dump(), "chart": chart, "advice": advice,
        "summary": summary,
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "id": reading_id,
        "chart": chart,
        "advice": advice,
        "ascendant": chart["ascendant_english"],
        "ascendant_sanskrit": chart["ascendant"],
        "sun_sign": summary["sun_sign"],
        "moon_sign": summary["moon_sign"],
    }


# Async variant — long LLM generations (especially Hindi/Telugu/Tamil) can exceed
# the ingress timeout (~100s), so the frontend starts the job and polls for status.
@api.post("/astrology/premium/start")
async def astrology_premium_start(body: AstroIn, user: dict = Depends(get_current_user)):
    require_tier(user, "premium")
    chart = await _build_chart(body)
    chart["nakshatra_report"] = _compute_nakshatra_report(chart)
    reading_id = str(uuid.uuid4())
    await db.readings.insert_one({
        "id": reading_id, "user_id": user["id"], "tier": "premium",
        "inputs": body.model_dump(), "chart": chart, "advice": "",
        "status": "processing",
        "summary": _premium_summary(chart),
        "is_shared": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    async def _generate():
        try:
            system, user_msg = _premium_prompts(body, chart)
            advice = await _ask_claude(system, user_msg, f"premium-{user['id']}")
            await db.readings.update_one(
                {"id": reading_id}, {"$set": {"advice": advice, "status": "done"}}
            )
        except Exception as e:
            logging.exception("Premium reading generation failed")
            await db.readings.update_one(
                {"id": reading_id}, {"$set": {"status": "failed", "error": str(e)}}
            )

    asyncio.create_task(_generate())
    summary = _premium_summary(chart)
    return {
        "id": reading_id,
        "status": "processing",
        "chart": chart,
        "ascendant": chart["ascendant_english"],
        "ascendant_sanskrit": chart["ascendant"],
        "sun_sign": summary["sun_sign"],
        "moon_sign": summary["moon_sign"],
    }


@api.get("/astrology/premium/status/{reading_id}")
async def astrology_premium_status(reading_id: str, user: dict = Depends(get_current_user)):
    r = await db.readings.find_one({"id": reading_id, "user_id": user["id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Reading not found")
    chart = r.get("chart") or {}
    summary = r.get("summary") or {}
    return {
        "id": r["id"],
        "status": r.get("status", "done"),
        "chart": chart,
        "advice": r.get("advice"),
        "ascendant": chart.get("ascendant_english") or summary.get("ascendant"),
        "ascendant_sanskrit": chart.get("ascendant"),
        "sun_sign": summary.get("sun_sign"),
        "moon_sign": summary.get("moon_sign"),
    }


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


# --- Premium: Tarot 3-card spread + AI interpretation ------------------ #
class TarotIn(BaseModel):
    question: Optional[str] = None
    language: Optional[str] = "en"


@api.post("/astrology/tarot/reading")
async def astrology_tarot(body: TarotIn, user: dict = Depends(get_current_user)):
    """Draw a 3-card Past · Present · Future spread from the Major Arcana and
    generate a personalised interpretation via Claude. Premium tier only."""
    require_tier(user, "premium")
    from tarot import draw_three_card_spread

    spread = draw_three_card_spread()
    question = (body.question or "").strip()

    card_lines = "\n".join(
        f"- {c['position'].upper()}: {c['name']} ({c['orientation']}) — "
        f"{c['meaning']} · Keywords: {', '.join(c['keywords'])}"
        for c in spread
    )
    system = (
        "You are a wise, warm Vedic tarot reader trained in the Rider-Waite tradition. "
        "Interpret a 3-card spread (Past · Present · Future) drawn from the Major Arcana. "
        "Speak directly to the seeker in second person. Weave the three cards into a single "
        "flowing narrative — the past feeding the present, the present shaping the future. "
        "Honour reversed cards by naming their shadow lesson. Do NOT re-list the card meanings; "
        "synthesise them. Close with a short, empowering line of guidance. "
        "Use Markdown ## for the three section headings only. Keep total length under 320 words."
        + _lang_instruction(body.language)
    )
    user_msg = (
        f"Seeker's question: {question or '(no specific question — a general life reading)'}\n\n"
        f"The cards drawn:\n{card_lines}\n\n"
        f"Give a warm, personal interpretation."
    )
    interpretation = await _ask_claude(system, user_msg, f"tarot-{user['id']}")

    return {
        "spread": spread,
        "question": question,
        "interpretation": interpretation,
    }


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


@admin_api.get("/readings")
async def admin_list_readings(admin: dict = Depends(require_admin)):
    """List all readings across all users (admin view)."""
    readings = await db.readings.find({}, {"_id": 0, "advice": 0}).sort("created_at", -1).to_list(1000)
    user_ids = list({r["user_id"] for r in readings if r.get("user_id")})
    users_cursor = db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "email": 1, "name": 1})
    users_by_id = {u["id"]: u async for u in users_cursor}
    for r in readings:
        u = users_by_id.get(r.get("user_id"), {})
        r["user_email"] = u.get("email")
        r["user_name"] = u.get("name")
    return {"readings": readings}


@admin_api.get("/readings/{reading_id}")
async def admin_get_reading(reading_id: str, admin: dict = Depends(require_admin)):
    """Fetch a single reading (admin, cross-user) including the full advice."""
    r = await db.readings.find_one({"id": reading_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Reading not found")
    user = await db.users.find_one({"id": r.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
    if user:
        r["user_email"] = user.get("email")
        r["user_name"] = user.get("name")
    return r


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

    # Primary admin — fail-fast at startup if password env is missing (no source-code fallback).
    # SEC-001 fix: never bake credentials into source; require deployment to set them explicitly.
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_pw = os.environ.get("ADMIN_PASSWORD")
    if not admin_email or not admin_pw:
        raise RuntimeError(
            "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment. "
            "No default is provided — this is a hardening requirement (SEC-001)."
        )
    await _seed_admin(admin_email, admin_pw, "Admin")

    # SEC-001 cleanup: remove any legacy `readings-admin@vedic.com` account that
    # was previously seeded with a hard-coded default password. Its role &
    # functionality are subsumed by the primary admin above.
    try:
        legacy = await db.users.find_one({"email": "readings-admin@vedic.com"})
        if legacy:
            await db.users.delete_one({"email": "readings-admin@vedic.com"})
            logger.info("Removed legacy readings-admin@vedic.com account (SEC-001 cleanup).")
    except Exception as e:
        logger.warning(f"legacy readings-admin cleanup: {e}")


async def _seed_admin(email: str, password: str, name: str):
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": email, "name": name,
            "password_hash": hash_password(password),
            "tier": "premium", "role": "admin",
            "email_verified": True, "auth_provider": "email",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {email}")
        return
    # Backfill: ensure role=admin + email_verified
    updates = {}
    if existing.get("role") != "admin":
        updates["role"] = "admin"
    if not existing.get("email_verified"):
        updates["email_verified"] = True
    if "auth_provider" not in existing:
        updates["auth_provider"] = "email"
    # SEC-001: keep the stored password in sync with the env-configured secret so
    # rotating `ADMIN_PASSWORD` in deployment actually rotates the admin login.
    if not verify_password(password, existing["password_hash"]):
        updates["password_hash"] = hash_password(password)
        logger.info(f"Admin password rotated to match env for: {email}")
    if updates:
        await db.users.update_one({"id": existing["id"]}, {"$set": updates})


@app.on_event("shutdown")
async def shutdown_event():
    mongo.close()


# --- Scheduled meetings (Calendly bookings captured client-side) ---
class ScheduledMeetingIn(BaseModel):
    event_uri: str
    invitee_uri: Optional[str] = None
    event_type_name: Optional[str] = None
    scheduled_at: Optional[str] = None  # client-supplied; ISO8601 when meeting starts (if known)
    raw_payload: Optional[dict] = None


@api.post("/scheduled-meetings")
async def create_scheduled_meeting(
    body: ScheduledMeetingIn,
    user: dict = Depends(get_current_user),
):
    """Persist a Calendly booking captured by the BookConsultation page.
    Future iteration: enrich via Calendly API (using CALENDLY_API_TOKEN) to
    fetch the actual meeting start time, location, and cancellation URL."""
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user.get("name"),
        "event_uri": body.event_uri,
        "invitee_uri": body.invitee_uri,
        "event_type_name": body.event_type_name,
        "scheduled_at": body.scheduled_at,
        "status": "active",
        "source": "calendly_embed",
        "raw_payload": body.raw_payload,
        "booked_at": datetime.now(timezone.utc).isoformat(),
    }
    # Idempotency: don't double-insert the same event_uri for this user
    existing = await db.scheduled_meetings.find_one({
        "user_id": user["id"],
        "event_uri": body.event_uri,
    })
    if existing:
        return {"id": existing["id"], "deduped": True}
    await db.scheduled_meetings.insert_one(doc)
    return {"id": doc["id"], "deduped": False}


@api.get("/scheduled-meetings/me")
async def my_scheduled_meetings(user: dict = Depends(get_current_user)):
    cursor = db.scheduled_meetings.find({"user_id": user["id"]}).sort("booked_at", -1)
    items = []
    async for d in cursor:
        items.append({
            "id": d["id"],
            "event_uri": d.get("event_uri"),
            "invitee_uri": d.get("invitee_uri"),
            "event_type_name": d.get("event_type_name"),
            "scheduled_at": d.get("scheduled_at"),
            "status": d.get("status", "active"),
            "booked_at": d.get("booked_at"),
        })
    return {"items": items, "count": len(items)}


app.include_router(api)
app.include_router(admin_api)
