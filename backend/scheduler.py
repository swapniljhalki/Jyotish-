"""Consultation scheduler — availability rules, slot generation, Google Calendar + Meet.

Storage model:
* `db.scheduler_config` — single doc id="config" holding the astrologer's weekly availability.
* `db.bookings`         — one row per consultation booking (pending → paid → confirmed).
* `db.app_config`       — id="google_calendar" holds the astrologer's OAuth refresh_token
                          once they connect their Google account once.

The Google integration is an *optional add-on*: when the refresh token is missing we
generate a stub `meet.google.com/xxx-xxxx-xxx` link so the UI/booking flow remains
testable end-to-end. The moment the astrologer completes `/api/scheduler/oauth/start`
the system flips to real Meet links automatically.
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo

import httpx

# --- Pricing & defaults -------------------------------------------------------
CONSULTATION = {
    "label":        "1:1 Consultation",
    "duration_min": 30,
    "amount_paise": 99900,          # ₹999
    "currency":     "INR",
    "tz":           "Asia/Kolkata",
}

DEFAULT_RULES = [
    {"day": 1, "start": "10:00", "end": "12:00"},  # Mon
    {"day": 1, "start": "16:00", "end": "18:00"},
    {"day": 3, "start": "10:00", "end": "12:00"},  # Wed
    {"day": 5, "start": "16:00", "end": "19:00"},  # Fri
]

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# --- Slot generation ---------------------------------------------------------

def _parse_hhmm(s: str) -> tuple[int, int]:
    h, m = s.split(":")
    return int(h), int(m)


def compute_slots(
    weekly_rules: list[dict],
    slot_minutes: int,
    weeks_ahead: int,
    tz_name: str,
    booked_starts_utc: set[str],
    now_utc: Optional[datetime] = None,
) -> list[dict]:
    """Return all available 30-min slots over the next `weeks_ahead` weeks.

    Each slot: {start_utc, end_utc, start_local, end_local, tz, weekday}
    Past-now slots and already-booked starts are excluded.
    """
    tz = ZoneInfo(tz_name)
    now_utc = now_utc or datetime.now(timezone.utc)
    now_local = now_utc.astimezone(tz)
    today_local = now_local.date()
    horizon = today_local + timedelta(days=weeks_ahead * 7)

    by_day: dict[int, list[dict]] = {}
    for r in weekly_rules:
        by_day.setdefault(int(r["day"]), []).append(r)

    out: list[dict] = []
    d = today_local
    while d <= horizon:
        rules = by_day.get(d.weekday(), [])
        for r in rules:
            sh, sm = _parse_hhmm(r["start"])
            eh, em = _parse_hhmm(r["end"])
            cursor = datetime(d.year, d.month, d.day, sh, sm, tzinfo=tz)
            end    = datetime(d.year, d.month, d.day, eh, em, tzinfo=tz)
            while cursor + timedelta(minutes=slot_minutes) <= end:
                start_utc = cursor.astimezone(timezone.utc)
                end_utc   = start_utc + timedelta(minutes=slot_minutes)
                # Skip if it has already passed (with a 30-min buffer so people can't book a slot starting "now")
                if start_utc > now_utc + timedelta(minutes=30) and start_utc.isoformat() not in booked_starts_utc:
                    out.append({
                        "start_utc":   start_utc.isoformat(),
                        "end_utc":     end_utc.isoformat(),
                        "start_local": cursor.isoformat(),
                        "end_local":   (cursor + timedelta(minutes=slot_minutes)).isoformat(),
                        "tz":          tz_name,
                        "weekday":     WEEKDAY_NAMES[cursor.weekday()],
                        "date":        cursor.date().isoformat(),
                    })
                cursor += timedelta(minutes=slot_minutes)
        d += timedelta(days=1)
    return out


# --- Stub Meet link ----------------------------------------------------------

def stub_meet_url() -> str:
    """Generate a placeholder Google Meet–style link when real API isn't connected."""
    alpha = "abcdefghijklmnopqrstuvwxyz"
    def chunk(n): return "".join(secrets.choice(alpha) for _ in range(n))
    return f"https://meet.google.com/{chunk(3)}-{chunk(4)}-{chunk(3)}"


# --- Google OAuth & Calendar -------------------------------------------------

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"


def google_oauth_configured() -> bool:
    return bool(os.environ.get("GOOGLE_CALENDAR_CLIENT_ID")) and bool(os.environ.get("GOOGLE_CALENDAR_CLIENT_SECRET"))


def google_auth_url(state: str) -> str:
    redirect_uri = os.environ["SCHEDULER_REDIRECT_URI"]
    params = {
        "client_id":     os.environ["GOOGLE_CALENDAR_CLIENT_ID"],
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         SCOPES,
        "access_type":   "offline",
        "prompt":        "consent",
        "include_granted_scopes": "true",
        "state":         state,
    }
    from urllib.parse import urlencode
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    redirect_uri = os.environ["SCHEDULER_REDIRECT_URI"]
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     os.environ["GOOGLE_CALENDAR_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CALENDAR_CLIENT_SECRET"],
            "redirect_uri":  redirect_uri,
            "grant_type":    "authorization_code",
        })
    r.raise_for_status()
    return r.json()


async def refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(GOOGLE_TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id":     os.environ["GOOGLE_CALENDAR_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CALENDAR_CLIENT_SECRET"],
            "grant_type":    "refresh_token",
        })
    r.raise_for_status()
    return r.json()


async def create_calendar_event_with_meet(
    *,
    access_token: str,
    summary: str,
    description: str,
    start_iso_utc: str,
    end_iso_utc: str,
    attendee_emails: list[str],
) -> dict:
    """Insert a Google Calendar event on the authenticated user's primary calendar,
    with auto-generated Meet conference. Returns the event resource (incl. hangoutLink)."""
    request_id = uuid.uuid4().hex
    body = {
        "summary":     summary,
        "description": description,
        "start":       {"dateTime": start_iso_utc, "timeZone": "UTC"},
        "end":         {"dateTime": end_iso_utc,   "timeZone": "UTC"},
        "attendees":   [{"email": e} for e in attendee_emails],
        "conferenceData": {
            "createRequest": {
                "requestId":             request_id,
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {"useDefault": True},
    }
    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    params = {"conferenceDataVersion": 1, "sendUpdates": "all"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, params=params, json=body, headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json",
        })
    r.raise_for_status()
    return r.json()


def extract_meet_url(event: dict) -> Optional[str]:
    """Pull the Meet URL out of a Calendar API event response."""
    if event.get("hangoutLink"):
        return event["hangoutLink"]
    cd = event.get("conferenceData", {})
    for ep in cd.get("entryPoints", []):
        if ep.get("entryPointType") == "video":
            return ep.get("uri")
    return None
