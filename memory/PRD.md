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

## Phase 10 (Feb 30, 2026) — Consultation Scheduler (Google Meet) — ✅ SHIPPED
- New module `/app/backend/scheduler.py` — recurring weekly availability rules, slot generator (4 weeks horizon, configurable), stub Meet URL fallback, Google OAuth (auth URL + code exchange + refresh), Calendar API event creation with `conferenceData.createRequest` (auto-generates Meet link), `sendUpdates="all"` so customer + astrologer both get invites.
- New endpoints under `/api/scheduler/*`: `config`, `availability` (PUT — admin), `slots`, `book` (premium), `confirm`, `my-bookings`, `all-bookings` (admin), `oauth/start` (admin), `oauth/callback`, `oauth/disconnect` (admin).
- Pricing: **₹999 / 30 min** (override per env later if needed).
- Tier-gated: only premium users can book. Stub-mode warning shown until astrologer connects Google.
- New pages: `/book` (BookConsultation), `/my-bookings` (MyBookings) + admin `Scheduler` tab (SchedulerAdmin component) with weekly rules editor, Google connect / disconnect, full bookings table.
- New env vars in `backend/.env`: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `ASTROLOGER_EMAIL`, `SCHEDULER_REDIRECT_URI`.
- End-to-end verified (Playwright): premium user picks slot → mock-pay → "Booking confirmed" card with Meet link + toast + email outbox entries. Admin scheduler tab loads, OAuth start URL returns valid Google authorization URL.

## Phase 11 (Feb 30, 2026) — Multi-language support (EN/HI/TE/TA) — ✅ SHIPPED
- `react-i18next` + `i18next-browser-languagedetector` integrated; per-user choice persists in `localStorage["snw_lang"]`.
- 4 locale JSON files at `/app/frontend/src/i18n/locales/{en,hi,te,ta}.json` (~250 strings each, generated by a one-shot Claude Sonnet 4.5 script `/app/backend/scripts/translate_locales.py`).
- Google Noto Sans fonts (Devanagari / Telugu / Tamil) bundled via `index.css`; `<html lang>` is auto-mirrored so CSS swaps the right script font.
- New navbar globe-icon picker (`/app/frontend/src/components/LanguagePicker.jsx`) with native-script labels.
- All major pages refactored to use `t()`: Navbar, Landing, Pricing, BasicTier, PremiumTier, Numerology, BookConsultation, MyBookings, Grahas, Nakshatras.
- AI endpoints accept a `lang` parameter and inject a language-instruction suffix into the Claude system prompt — `/astrology/basic`, `/astrology/premium`, `/numerology/reading`, `/rashifal/today`. Frontend passes `i18n.resolvedLanguage` on every call.
- Static encyclopedic content (GRAHAS, NAKSHATRAS) translates **on-demand and caches in MongoDB** via `/app/backend/translation_cache.py` — Hindi cache built (~56s first hit, instant after). Telugu/Tamil caches will fill once Emergent LLM budget is topped up; until then the UI falls back to English source gracefully (no errors).
- Razorpay `create_order` refactored: scheduler bookings now use a generic `create_custom_order(amount_paise, label, ...)` helper so consultation pricing is decoupled from any tier price (fixes test-agent flag from iteration 8).

## Phase 12 (Feb 30, 2026) — Light theme ("Sacred Ivory & Temple Gold") — ✅ SHIPPED
- Complete colour-scheme inversion via CSS-variable swap + a global re-skin block in `/app/frontend/src/index.css`. Single file touched for the entire theme flip (no component-level rewrites needed).
- New palette: ivory parchment background (`#FDFBF7`), deep-indigo ink text (`#1A1C29`), saffron primary (`#FF8C00`), temple-gold accent (`#D4AF37`), auspicious-red highlights (`#D9381E`).
- Reworked `cosmic-bg` to render the same 24-petal mandala + paisley + rangoli-dot patterns but in low-opacity gold/saffron ink on parchment.
- Cards: `.glass-card` is now translucent white + faint gold border + soft shadow; `.premium-card` is cream-to-warm-saffron gradient with double-line frame.
- Buttons: `.btn-saffron` becomes solid saffron pill with offset copper-frame hover; `.text-gold-gradient` darkened to copper→gold→saffron for legibility on ivory.
- Kundali chart re-skinned: deep-indigo lines on parchment (vs. previous white-on-dark).
- Navbar logo wrap fixed and nav labels tightened (`Basic Reading → Basic`, `Book 1:1 → 1:1`, `My Readings → Readings`, etc.) across all 4 languages so the row fits comfortably with the logged-in user chrome.
- All AI markdown readings (`prose-invert → prose`) so they render dark-on-light.

## Prioritised Backlog (updated)
- **P0**: Top up Emergent LLM budget so Telugu & Tamil grahas/nakshatras caches can populate (also unblocks AI readings in any language).
- **P1**: Astrologer to complete Google OAuth once via `/admin?tab=scheduler → Connect Google` for real Meet links.
- **P1**: Real email delivery via Resend (currently mocked outbox).
- **P2**: Server.py refactor (~1,600 lines → routers).
- **P2**: Translate the remaining secondary surface (PanchangSection, VisitorStats, Login/Register, Admin) — they still show English.
- **P2**: Auto-generate OG share-card PNG for `/r/:token`.
- **P3**: Daily Gochar transit alerts.
- **P3**: Investigate flaky brute-force lockout test.

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
