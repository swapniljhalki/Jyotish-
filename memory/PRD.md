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

## Prioritised Backlog
- **P1**: Real email delivery (Resend) — currently mocked
- **P1**: Real payment (Stripe) — currently mocked
- **P2**: Auto-generate OG share-card PNG for `/r/:token` (social link previews)
- **P2**: Vimshottari Dasha (planetary periods) calculation & timeline view
- **P3**: Transit alerts (daily Gochar based on stored birth chart)
- **P3**: Multi-lingual support (Hindi / Tamil / Telugu)

## Test Credentials
See `/app/memory/test_credentials.md`.
