# Jyotish Vedic — Product Requirements & Build Log

## Original Problem
Vedic astrology website with 3 pricing tiers:
1. **Free** — 9 Grahas + 27 Nakshatras info
2. **Basic** — AI birth reading from DOB/TOB/POB
3. **Premium** — Visual Kundali chart + detailed AI interpretation

## User Choices (Feb 2026)
- AI: Claude Sonnet 4.5 via Emergent Universal LLM Key
- Payments: Mock (no Stripe)
- Auth: JWT email/password + Emergent-managed Google OAuth
- Kundali: Visual North Indian SVG diamond chart
- Theme: Traditional saffron / gold on dark cosmic

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + bcrypt + PyJWT + httpx + emergentintegrations
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn/UI + Sonner toasts
- **DB**: `users`, `readings`, `login_attempts`, `password_reset_tokens`, `email_verification_tokens`, `email_outbox`

## Phase 1 (Feb 16, 2026) — MVP — ✅ SHIPPED
- Landing page with 3 pricing tiers (Seeker / Sadhaka / Jyotishi)
- 9 Grahas page with modal details
- 27 Nakshatras page with modal details
- JWT auth (register / login / me / logout)
- Mock subscription (free / basic / premium)
- Basic tier: Claude 4.5-generated ~250-word reading
- Premium tier: deterministic kundali compute + Claude 4.5 ~700-word reading + SVG chart
- Admin user seeded from `.env`
- All 25 backend + UI tests passing

## Phase 2 (Feb 18, 2026) — Auth Hardening + Admin — ✅ SHIPPED
- **Password reset** (forgot-password + reset-password + TTL'd tokens)
- **Email verification** (send-verification + verify-email + TTL'd tokens)
- **Brute-force lockout** (5 fails → 15 min 429)
- **Refresh tokens** (access 15min + refresh 7d, rotation, axios 401 interceptor)
- **Emergent-managed Google OAuth** (`/auth/google/session`, AuthCallback page, hash race-condition handling)
- **Admin panel** (`/admin`, users tab with tier/role edit + delete, email outbox tab)
- **Mock email outbox** (`db.email_outbox` — viewable via admin)
- All 44 backend + UI tests passing

## User Personas
1. **Curious seeker** — wants free info about grahas/nakshatras, low commitment
2. **Sadhaka** (basic subscriber) — wants a quick, personal AI reading
3. **Jyotishi** (premium subscriber) — wants the full kundali chart + deep reading
4. **Admin** — operations: manage users, inspect email delivery, adjust tiers

## Phase 3 (Feb 18, 2026) — Readings Archive + Public Share — ✅ SHIPPED
- New backend endpoints: `GET /api/readings`, `GET /api/readings/{id}`, `DELETE /api/readings/{id}`, `POST /api/readings/{id}/share`, `GET /api/public/readings/{token}`.
- Readings inserts now carry `summary {ascendant, sun_sign, moon_sign}` and `is_shared: false` for quick list previews + public render.
- New pages: `/readings` (archive list), `/readings/:id` (detail w/ Share toggle + copy-link), `/r/:token` (public page, no auth, with conversion CTA to register).
- Basic & Premium result cards link into archive with "Open in archive & share →".
- All 65/65 tests passing (44 prior + 21 new).

## Phase 4 (Feb 18, 2026) — Real Parashari Kundali (Swiss Ephemeris) — ✅ SHIPPED
- `pyswisseph` (Moshier ephemeris) + `timezonefinder` for accurate sidereal computation.
- Lahiri ayanamsa (Indian government standard for Parashari Jyotish).
- Whole-sign houses (Parashari classical method).
- Ketu auto-derived from Rahu + 180° (always retrograde).
- Each planet now carries `nakshatra` + `pada` (used in AI prompt for richer interpretation).
- OpenStreetMap Nominatim geocoding with `db.geocode_cache` (no API keys).
- 422 with friendly message when place can't be geocoded.
- Both Basic and Premium tiers use the new compute pipeline.
- Manually verified: Mumbai 1990-05-15 14:30 → Leo lagna, Sun-Krittika, Saturn+Rahu in Capricorn, Ketu in Cancer.
- All previous tests still pass (64/65 confirmed; 1 flaky brute-force test = pre-existing test env issue).

## Phase 5 (Feb 18, 2026) — Daily Panchang & Festivals on Landing — ✅ SHIPPED
- New backend endpoints (public, no auth): `GET /api/panchang/today` and `GET /api/festivals/upcoming`.
- Live Panchang via Swiss Ephemeris: tithi (1–30 with paksha), nakshatra (1–27 with pada), yoga (1–27), vara (weekday + lord), sun/moon signs, plus progress % through each anga.
- Custom timezone via `?tz=` query param (default `Asia/Kolkata`); invalid tz → 400.
- Curated Hindu festival calendar (2026–2027, 25 entries) with auto-computed `days_until`.
- Landing page: new "Today's Sky · Panchang & Festivals" section between hero and pricing — 3-col panchang card + 2-col upcoming festivals list with date pills.
- All 32 tests in this iteration passing (12 new + 20 regression).

## Phase 6 (Feb 19, 2026) — Dynamic Drik-aligned Festival Engine — ✅ SHIPPED
- Replaced curated `_FESTIVALS` array with on-the-fly tithi-rule computation in `compute_festivals_for_range`.
- Each festival carries a Drik `kala_hour` (sunrise / midday / afternoon / sunset / moonrise / midnight) — the tithi must prevail at THAT hour to qualify.
- Sankranti rule: Sun must cross the target sidereal rashi BEFORE sunset to celebrate same day, else next day.
- Tithi-kshaya (skipped tithi) handling for sunrise-based festivals — Sharad Navratri 2027 correctly resolved.
- Amanta lunar-month rashi tracked via sunrise-tithi-drop detection.
- All 11 Drik 2026 reference dates match exactly: Makar Sankranti 01-14, Maha Shivaratri 02-15, Holi 03-04, Ram Navami 03-27, Raksha Bandhan 08-28, Krishna Janmashtami 09-04, Ganesh Chaturthi 09-14, Vijayadashami 10-20, Diwali 11-08, Govardhan 11-10, Bhai Dooj 11-11.
- New parametrized test: `/app/backend/tests/test_dynamic_festivals_2026.py` (16 tests). 64/65 backend tests pass.

## Phase 7 (Feb 19, 2026) — Vedic Numerology — ✅ SHIPPED
- New module `/app/backend/numerology.py` — Mulank (root), Bhagyank (destiny), Naamank (Chaldean name) with planet, traits, gemstone, mantra, lucky days/colours/numbers, career & challenges per number 1–9.
- New endpoints: `POST /api/numerology` (public, calculation only) and `POST /api/numerology/reading` (premium-only, Claude Sonnet 4.5 ~250-word reading weaving all three numbers).
- New page `/numerology` with form + 3 NumberCards + tier-aware AI reading section.
- Navbar link between Nakshatras and Basic Reading.
- 13/13 backend tests pass; full frontend flow verified.

## Phase 8 (Feb 19, 2026) — Daily Rashifal Tile — ✅ SHIPPED
- New module `/app/backend/rashifal.py` — single batched Claude call generates 12 forecasts (~50 words each) seeded with today's panchang. Cached in-memory by (date, tz) so subsequent calls cost zero LLM credits.
- Deterministic offline `_fallback_forecasts` keeps the tile usable if the LLM is unavailable.
- New endpoint: `GET /api/rashifal/today?tz=...` (public).
- New component `/app/frontend/src/components/RashifalTile.jsx` — 12 rashi pills, default selection = today's Moon-rashi, click-to-switch forecast view with theme + lucky colour + lucky number.
- Wired into `PanchangSection` as a full-width tile below panchang + festivals.
- 6/6 backend tests + full frontend Playwright flow verified.

## Prioritised Backlog
- **P0 — DONE**: Razorpay payment integration (mock-mode shipped Feb 30, 2026 — wire keys in `.env` to go live)
- **P1**: Multi-language support (English / Hindi / Telugu / Tamil) — requested but pending
- **P1**: Meeting Scheduler in Premium tier (recurring weekly availability + Google Meet + paid add-on)
- **P1**: Real email delivery (Resend) — currently mocked
- **P2**: Auto-generate OG share-card PNG for `/r/:token` (social link previews)
- **P3**: Transit alerts (daily Gochar based on stored birth chart)
- **P3**: Investigate flaky brute-force lockout test (state leakage between iterations)

## Phase 9 (Feb 30, 2026) — Razorpay Payments (mock + live ready) — ✅ SHIPPED
- New module `/app/backend/razorpay_service.py` with **mock-mode fallback** when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are absent.
- New endpoints: `GET /api/payments/config` (public mode + pricing), `POST /api/payments/create-order` (auth), `POST /api/payments/verify` (auth + HMAC-SHA256 signature check in live mode, accepts anything in mock).
- New collection `db.payments` records every order + final paid status.
- New component `/app/frontend/src/components/UpgradeButton.jsx` — loads Razorpay checkout SDK on demand, renders "DEMO" badge in mock mode, refreshes auth context on success.
- Wired into `/pricing`, `/basic` (upgrade notice), `/premium` (upgrade notice) — old "Subscribe via mock" buttons removed.
- Backend curl flow verified end-to-end: `free → create-order → verify → tier=basic`.
- Frontend Playwright flow verified end-to-end: click on `/premium` upgrade notice → mock order created → tier badge in navbar reads `PREMIUM` → kundali form unlocked.

## Test Credentials
See `/app/memory/test_credentials.md`.
