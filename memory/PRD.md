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

## Phase 10 (Feb–Mar 2026) — Scheduler, i18n, Light Theme, Free Unlock, Photon PoB — ✅ SHIPPED
- See change-log entries for: Google Meet Scheduler, i18n (EN/HI/TE/TA), Sacred Ivory & Temple Gold light theme, payments disabled / Free Unlock mode, global Place-of-Birth autocomplete (Photon).

## Phase 11 (Feb 6, 2026) — Expanded Kundali Modal — ✅ SHIPPED
- New `/app/frontend/src/components/ExpandedKundaliModal.jsx`: ornate North-Indian frame (green outer border + saffron-gold petal frame with cusped arches, central swastika, "॥ शुभं भवतु ॥" footer) matching the user's reference image.
- `/app/frontend/src/pages/PremiumTier.jsx` wired: D1 Lagna, Chandra Rashi, and D9 Navamsha chart cards are now clickable triggers (with `Maximize2` hint icon + "Click to expand" caption) that open the modal with the correct chart data and ascendant.
- Smoke-tested end-to-end via Playwright (login → cast Kundali → open all three expanded modals → close) — all three modals render the correct chart with the ornate frame.

## Test Credentials
See `/app/memory/test_credentials.md`.

## June 11, 2026 — Basic Tier Kundali Generator
- `/api/astrology/basic` now computes and returns the D1 (Lagna) chart (premium-only divisions — chandra, navamsha, dasha, numerology_dasha — stripped) and stores it on the reading document.
- BasicTier.jsx shows: clickable D1 KundaliChart card (opens ExpandedKundaliModal, same ornate frame as Premium), Planetary Positions table (Graha/Rashi/°/House/Nakshatra), plus the existing AI summary.
- Test IDs: `basic-expand-kundali-d1`, `basic-planet-table`.
- Verified end-to-end via curl + Playwright screenshot (testuser@vedic.com).

## June 11, 2026 — Tier Feature Descriptions Updated
- Sadhaka (Basic) tier now lists: Everything in Seeker, Basic Vedic Kundali (Birth Chart).
- Jyotishi (Premium) tier now lists: Everything in Sadhaka, Kundali Lagna Chart, Chandra Rashi Chart, Navamsha Chart, Vedic Numerology Mahadasha, Chaldean Name Numerology, Mobile Number Numerology.
- Applied on both Pricing page and Landing page tier cards, translated in all 4 languages (en/hi/te/ta) via locale JSONs (`pricing.tier_*.f1-f7`, `landing.tier_*_f1-f7`).

## June 11, 2026 — Print & Download PDF for readings
- Added Print + Download PDF buttons above Basic and Premium reading results (`ResultActions.jsx`, test IDs `basic|premium-print-btn`, `basic|premium-download-pdf-btn`).
- PDF export via html-to-image (handles inline SVG kundali charts + Indic scripts) + jsPDF multi-page A4 slicing (`/app/frontend/src/lib/exportPdf.js`).
- Print uses window.print() with @media print CSS in index.css (`.printable-area` / `.no-print`).
- Verified e2e: PDFs downloaded on both tiers, content inspected (chart, table, reading render correctly).

## June 11, 2026 — Premium charts layout change
- D1 Lagna, Chandra Rashi and Navamsha D9 charts no longer render side-by-side; they now stack one below the other in a large (max-w-640px) expanded format on the Premium results page.
- KundaliChart gained a `large` prop; click-to-expand modal behavior retained.

## June 12, 2026 — Birth details summary above charts
- New `BirthDetailsSummary.jsx` shows Name, Date of Birth, Time of Birth, Place of Birth (as user submitted) above the Kundali Lagna chart on both Basic and Premium results.
- Included in print/PDF export (inside printable area). Test IDs: `basic-birth-details`, `premium-birth-details`.

## June 12, 2026 — Zodiac image background
- All pages (.cosmic-bg) now use the user-provided zodiac wheel GIF (`/app/frontend/src/assets/zodiac-bg.gif`) as a fixed, full-cover background.
- A translucent ivory veil (rgba(253,251,247,0.82)) sits over the image so all existing dark typography stays readable. Veil opacity is the tuning knob if user wants the image more/less prominent.

## June 12, 2026 — Premium reading layout
- Detailed Reading now renders full-width below the Planetary Positions table (was side-by-side); removed max-h-800px/overflow scrollbar so the entire reading shows.

## June 12, 2026 — LIVE Razorpay payments enabled
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (LIVE keys) added to backend/.env. /api/payments/config → mode "live".
- Sadhaka ₹99, Jyotishi ₹999 one-time unlocks via Razorpay checkout (UPI/cards/netbanking). Phone modal collects contact before checkout.
- Free unlock removed: UpgradeButton PAYMENTS_DISABLED/FREE_TIER_UNLOCK flags deleted; POST /api/subscribe now 403s for paid tiers (free downgrade only).
- /api/payments/verify hardened: order must belong to user, claimed tier must match order tier, HMAC signature verified.
- Pricing page note updated ("One-time payment · secured by Razorpay").
- NOTE: 1:1 consultation bookings also use Razorpay → now live charging too.
- PENDING (user said "hold on"): webhook endpoint + RAZORPAY_WEBHOOK_SECRET for payment.captured edge cases (browser closed before verify).

## June 12, 2026 — Darker chart fonts
- KundaliChart house/rashi numbers: pale gold #D4AF37 @0.8 → bold #6B4308, size 10→11. "Asc" label #FF9933 → bold #9A3E00. Applies to D1/Chandra/Navamsha inline charts and expanded modal (shared component).

## June 12, 2026 — Basic tier layout
- Kundali Lagna chart now renders large (640px) with Planetary Positions table stacked below it (was 2-col side-by-side).

## June 12, 2026 — SNW logo watermark on PDF pages
- User's SNW logo saved at /app/frontend/src/assets/snw-logo.jpg.
- exportPdf.js stamps the logo (centered, 55% width, 8% opacity) on EVERY page of downloaded Basic/Premium PDFs.
- Browser print (window.print) also shows the watermark on each printed page via fixed-position `.print-watermark` (print-only CSS).
- Verified: 3-page Basic PDF inspected, watermark present on all pages.

## June 12, 2026 — PDF/print report fixes
- ROOT CAUSE (print): `.glass-card` backdrop-filter triggers a Chrome print bug that DROPS elements crossing a page break — the Planetary Positions table vanished entirely from printed output. Fixed by flattening cards (no backdrop-filter/translucency) inside `.printable-area` in @media print; also forced overflow:visible on table wrappers in print.
- Download PDFs now capture at a fixed ≥1024px width so tables are never clipped behind scrollbars (covers mobile downloads).
- Verified: print PDF now contains full planetary table + Asc/Sun/Moon values; download PDF shows summary values and the complete table flowing across pages.

## June 12, 2026 — Complete UI translations (en/hi/te/ta)
- Root cause of "text stays in English": ~60 hardcoded English strings in BasicTier, PremiumTier, ResultActions, BirthDetailsSummary, NumberCard, Pricing.
- Added new `result` i18n namespace + extended `premium_numerology` + `pricing.pay_note` in all 4 locale files; wired every hardcoded string through t().
- Covers: result labels (Ascendant/Sun/Moon), chart titles, planetary table headers, Detailed Reading, Print/Download PDF buttons, birth details labels, numerology dasha copy, Chaldean & Mobile numerology sections, NumberCard field labels, pricing payment note.
- Verified live in Hindi (Basic flow) and Telugu (Premium + Pricing).

## June 12, 2026 — Native Vedic names + premium stability fixes
- New `/app/frontend/src/lib/vedicNames.js`: planets, 12 rashis, 27 nakshatras, planet states localized in hi/te/ta (fallback English). Wired into Basic/Premium tables, summary values, chart ascendant labels, expanded modal, PlanetStates chips.
- CRITICAL FIX: LLM calls were blocking the FastAPI event loop (server frozen during every generation — caused intermittent 502s/hangs). _ask_claude now runs via asyncio.to_thread.
- CRITICAL FIX: Premium readings in Hindi/Telugu took 116–126s > ~100s gateway timeout → always failed. Added POST /api/astrology/premium/start (+ background generation) and GET /api/astrology/premium/status/{id}; PremiumTier polls every 3s. Old sync endpoint retained.
- Auth resilience: axios default timeout 120s; /auth/me 15s timeout + 1 retry (no more infinite "consulting the stars" on a stalled request).
- NOTE: several search_replace edits silently failed this session — always grep-verify after batch edits.
- Verified e2e: Hindi Basic (native table), Telugu Premium (సూర్యుడు/వృషభం/కృత్తిక + Telugu reading via polling).

## June 12, 2026 — Footer cleanup
- Removed the "Learn" column (Nine Grahas / 27 Nakshatras / Houses & Bhavas) from the global footer; layout reflows to 2 columns.

## June 12, 2026 — Testimonials page
- New public page /testimonials (`Testimonials.jsx`) with 5 client testimonials (Rachana, Thomas, Priraj, Madhavi, R.P) in ornate quote cards with 5-star ratings.
- "Testimonials" nav link added to top navbar on every page (translated in en/hi/te/ta via nav.testimonials; page header via testimonials.* keys). Quotes kept in original English.

## June 13, 2026 — Production payments 500 diagnosis + hardening
- PROD ISSUE: /api/payments/create-order → 500 "Razorpay error: Authentication failed" in production while preview works with identical keys → production env has stale/corrupted RAZORPAY_KEY_SECRET.
- deployment_agent scan: PASS, no code-level deploy blockers.
- Hardening: razorpay_service.py now reads keys via _key() (strips whitespace + stray quotes from env injection); Razorpay values in backend/.env unquoted. Preview re-verified: live order created post-change.
- USER ACTION: redeploy; if still failing, contact Emergent Support to verify RAZORPAY_* env vars on the deployment.


## Feb 18, 2026 — Markdown rendering for AI advice (P1 fix)
- ROOT CAUSE: AI-generated readings (Claude Sonnet 4.5) include Markdown syntax (`##` headings, `**bold**`, lists). The original UI rendered `result.advice` as raw text inside a `whitespace-pre-wrap` div, so users saw literal `##` and `**` symbols in both the reading pages and exported PDFs.
- FIX: Installed `react-markdown` + `remark-gfm`. New shared component `/app/frontend/src/components/AdviceMarkdown.jsx` renders the advice with cohesive Cormorant-Garamond headings, dark-brown body text and gold-accented blockquotes/strong/em that match the Starbucks-style light theme.
- Component declarations are top-level (not nested in render) for stable React identity.
- Wired into 6 surfaces: `BasicTier.jsx`, `PremiumTier.jsx`, `ReadingDetail.jsx` (basic + premium paths), `Admin.jsx`, `PublicReading.jsx` (basic + premium paths), `Numerology.jsx`.
- `ReadingsList.jsx` preview line strips `#`/`*`/`` ` `` so the 2-line italic preview stays clean without full markdown rendering.
- Added `.printable-area .advice-markdown ...` CSS rules in `index.css` so the dark-brown heading/strong/em colors survive the global `text-zinc-*` override when captured by html-to-image for PDF export.
- Verified live in `/admin → All Readings → View` modal: section headings ("Relationships & Marriage", "Health & Vitality", "Spiritual Path") now render as styled headings; body paragraphs flow cleanly.

## Pending / Backlog
- P2 — Rotating testimonial strip on landing page.
- P2 — Start/poll background pattern for Basic Tier AI reading (mirror Premium implementation) to prevent gateway timeouts on slow generation days.
- Refactor — split `/app/backend/server.py` (~1900 lines) into `/routes` + `/models`; remove legacy `/api/scheduler/*` routes (Calendly fully replaces them).

## Feb 20, 2026 — Premium PDF layout aligned with Basic tier (P0)
- User request: "Please use the same pdf format for premium tier as it is for basic tier."
- Applied in `/app/frontend/src/pages/PremiumTier.jsx`:
  - Wrapped the entire printable result in a single outer `premium-card p-8 md:p-12 printable-area` (was `space-y-8` with per-section `premium-card` islands).
  - Added `<GaneshaBanner />` invocation at the top of the report — matches Basic's opening flourish.
  - Reordered sections to mirror Basic: Cover → Nakshatra Report → Lagna chart → Planetary Positions → Chandra chart → Navamsha chart → Vimshottari Mahadasha → AI Advice.
  - Updated `[data-pdf-page]` anchors for paired-page pagination — P1: Cover + Nakshatra · P2: Lagna + Planets · P3: Chandra + Navamsha · P4: Vimshottari · P5-6: Advice.
  - Converted per-section wrappers from `premium-card` to `glass-card` (consistent inner styling since outer is now the single premium-card).
  - Removed the "Detailed Reading" divider label above the advice section (Basic doesn't have one).
- PDF verified: 6 pages, 2.58 MB.

## Feb 20, 2026 — Premium PDF forced to exact 5-page layout (P0 follow-up)
- User request: PDF must be exactly — P1 Ganesha+details+nakshatra, P2 lagna+planets, P3 chandra+navamsha, P4 vimshottari, P5 full reading; full page utilized; no section split across pages.
- Root cause: ~700-word AI advice at default line-height 1.8 / body 0.98rem overflowed Page 5 → Page 6.
- Fix: Added `compact` variant to `AdviceMarkdown.jsx` (body 0.78rem, line-height 1.4, tighter heading/paragraph margins, table & list padding shrunk). Wired `<AdviceMarkdown compact>` only in `PremiumTier.jsx` — Basic keeps the spacious default styling.
- Verified: Premium PDF now = exactly 5 pages (2.2 MB). All 9 advice subsections (Overall Personality, Career & Dharma, Wealth & Finances, Relationships & Marriage, Health & Vitality, Spiritual Path, Current Focus, Remedies, Closing Blessing) fit on the single reading page. No section is split.

## Feb 20, 2026 — Premium PDF Page 4 utilization fix (P0)
- User request: "from page 1 to 4 please utilize full page for content, do not split on 2 pages."
- Root cause: Page 4 (Vimshottari) had only a 9-row table filling ~50% of the page, leaving significant blank space in the lower half.
- Fix in `/app/frontend/src/pages/PremiumTier.jsx`:
  - Added an introductory paragraph explaining the Vimshottari system above the "Currently running" line.
  - Added a **Planetary Themes** 3×3 grid below the table.
- Verified: P4 now well-filled on a single page, no overflow.

## Feb 20, 2026 — Numerology Overview section added to Premium (P0)
- User request: "In premium tier, below kundali reading, please insert a section to provide basic numerology advice such as Mulank, Bhagyank, Namank."
- Backend (`/app/backend/server.py::_build_chart`): enriched chart response with `numerology` block via existing `compute_numerology(dob, full_name)`.
- Frontend (`/app/frontend/src/pages/PremiumTier.jsx`): new section between AI advice and Numerology Dasha — 3-card grid (Root, Destiny, Name) each showing planet, derivation, traits, gemstone, colors, days, mantra, career.

## Feb 20, 2026 — Sitewide font legibility upgrade (P0)
- User request: "Please make all fonts darker and legible."
- Changes:
  - `/app/frontend/src/index.css`: body & `.font-body` weight 450 → 500 for solid strokes across the app.
  - Sitewide sed replacements across `/app/frontend/src`:
    - Muted brown `#8B5E1A` → `#5C3A09` (used across accent labels, meta lines, form hints).
    - Divider/eyebrow gold text `text-[#D4AF37]` (119 refs) → `text-[#B8860B]` (darker goldenrod, high contrast on cream).
    - Legacy dark-theme grays: `text-zinc-300/400/500/600` → `text-zinc-700/800/900` (leftover Tailwind tokens on the light theme).
- Verified via screenshots: landing hero paragraph, section eyebrows ("SIDEREAL VEDIC JYOTISH", "PREMIUM TIER · JYOTISHI"), form labels, and body copy all render darker with stronger contrast while keeping the warm gold aesthetic.

## Feb 20, 2026 — Tarot Reading feature added to Premium (P0)
- User request: "In premium tier, after mobile number numerology section, add a tarot reading feature."
- Backend:
  - New `/app/backend/tarot.py`: 22 Major Arcana cards (Rider-Waite tradition) with upright/reversed meanings + keywords. `draw_three_card_spread(seed=None)` returns unique random 3 cards each with independent orientation for Past/Present/Future positions.
  - New endpoint `POST /api/astrology/tarot/reading` (Premium-tier only): accepts optional `question` + `language`, draws the spread, calls Claude Sonnet 4.5 for a woven interpretation (~320 words, honors reversed shadows, respects the user's language).
- Frontend (`/app/frontend/src/pages/PremiumTier.jsx`):
  - New "Tarot Reading — Past · Present · Future" section placed after Mobile Number Numerology.
  - Optional question textarea → "Draw Cards" button ("Shuffling the deck…" while loading).
  - Three parchment-styled cards with gold border showing position, card name (rotated 180° when reversed with maroon accent), Roman-numeral index, keyword pills, classical meaning, and position meaning.
  - AI interpretation rendered below via `<AdviceMarkdown>`, with the user's question echoed as an italic quote.
- Verified end-to-end with curl + screenshot: cards drawn (The Empress upright / The World upright / Judgement reversed) → 12s Claude response → all three cards visible with correct orientations + full interpretation ("Honour the completion, then listen…").

## Feb 20, 2026 — Two collapsible reports in Premium tier (P0)
- User request: Group the Premium result into two collapsible sections — (1) Vedic Astrology Report and (2) Vedic Numerology Report.
- Added `<CollapsibleSection>` helper (chevron-rotating gold-bordered header, `max-height:0` when closed but keeps children mounted so `exportPdf`'s `neutralizeOverflow` can still capture them if the user downloads with a section collapsed).
- **Section 1 — Vedic Astrology Report**: user details · Nakshatra · Lagna/Chandra/Navamsha charts · Planetary positions · Vimshottari Mahadasha · Personalised AI reading. PDF button → `Vedic-Astrology-Report.pdf`.
- **Section 2 — Vedic Numerology Report**: Mulank/Bhagyank/Naamank cards · Lo Shu Grid · Current Numerology Dasha · full 81-year Mahadasha timeline. PDF button → `Vedic-Numerology-Report.pdf`.
- Chaldean, Mobile Numerology, and Tarot remain as separate standalone sections below.

## Feb 20, 2026 — Vedic Numerology Report PDF layout (P0 follow-up)
- User request: Format Numerology Report PDF as — P1 Ganesha + Mulank/Bhagyank/Naamank + Lo Shu Grid · P2 81-year Mahadasha timeline (no row-cut mid-content) · P3 Current Numerology Dasha state.
- Changes:
  - Added `<GaneshaBanner />` at the top of the numerology printable-area (parallel to Astrology Report).
  - Reordered sections: cover (overview cards + Lo Shu grid packed on P1) → 81-year timeline (`data-pdf-page="numerology-mahadasha"` starts fresh P2) → Current Dasha state (`data-pdf-page="numerology-dasha-current"` starts fresh P3).
  - Removed `no-print` from the 81-year timeline so it now appears in the PDF.
- New pagination primitive in `/app/frontend/src/lib/exportPdf.js`: `[data-pdf-soft-break]` attribute — soft page-break hints. Unlike hard `[data-pdf-page]` markers, soft-breaks are only used when the natural slice boundary would otherwise fall mid-content. When defaultEnd would cut inside content and a soft-break is nearby, the slicer cuts at the last soft-break instead — keeping entire rows intact across pages.
- Applied `data-pdf-soft-break="md"` to each outer Mahadasha row wrapper in `/app/frontend/src/components/NumDashaTimeline.jsx`. This gives the pagination logic per-row break candidates so the 81-year timeline never splits a Mahadasha row across two pages.
- Verified end-to-end: PDF regenerated (3 pages, 1.09 MB, down from 22 pages/2.34 MB in the failed intermediate). AI structural analysis confirms P1 has Ganesha + all three number cards + Lo Shu; P2 holds the full 81-year Mahadasha timeline with drilled Rahu/Ketu levels; P3 has the current-state Dasha table intact.

## Feb 20, 2026 — Ganesha banner artwork replaced (P0)
- User request: "Please replace ganesha banner in all pdf reports with the attached image" (uploaded a black-and-white ornate line-art of Lord Ganesha in a mandala frame).
- Swapped `/app/frontend/src/assets/ganesha.jpg` with the new 63KB artwork. Since `GaneshaBanner.jsx` imports from that single path, the new image now appears in every report that uses the banner — Basic Tier PDF, Premium Vedic Astrology Report, and Premium Vedic Numerology Report.
- Verified via screenshot: the new banner (elegant black line-art on cream) renders correctly above the user details cover.

## Feb 20, 2026 — PDF watermark relocated so it never overlaps text (P0)
- User request: In the Vedic Numerology Report, ensure all text is clearly visible with no content overlap, including when the report spans multiple pages.
- Root cause: The SNW brand mark stamped onto each page slice in `/app/frontend/src/lib/exportPdf.js` was drawn at 55% of page width, centered — which put it directly behind timeline rows and body copy on Page 2 of the Numerology Report.
- Fix: Relocated the stamp to the **bottom-right corner** at **28% width** (about half the previous footprint) with an additional 40% dimming (~0.024 effective alpha). Preserves the brand presence on every page without ever sitting behind reading content.
- Verified: PDF regenerated; each page rendered as an image + visually inspected. Page 2 timeline, Page 3 current-state table, and Page 1 Lo Shu grid all now have zero overlap with the watermark. Astrology Report + Basic Tier PDF benefit from the same change.

## Feb 20, 2026 — Vedic Numerology Report expanded to 5-page layout (P0)
- User request: Format Numerology Report PDF as — P1 Ganesha + User Details + Mulank/Bhagyank/Naamank; P2 Numerology Chart + Current Dasha; P3 81-year Mahadasha timeline; P4 Chaldean Name Numerology; P5 Mobile Number Numerology.
- Changes in `/app/frontend/src/pages/PremiumTier.jsx`:
  - Added a compact user-details block ("Numerology Report For {name}", DATE/TIME/PLACE) at the top of Page 1 (parallel to the Astrology Report cover).
  - Reordered pagination markers so Lo Shu Grid starts P2 and packs with Current Dasha State; Mahadasha timeline starts P3.
  - **Moved** the Chaldean Name Numerology and Mobile Number Numerology sections from below-the-collapsibles into the numerology printable-area (inside the Vedic Numerology Report collapsible). Each is now wrapped in a `<section data-pdf-page={result ? "chaldean-numerology" : undefined}>` — the marker is only emitted when a result exists, so the exporter never creates a blank page for an un-submitted section.
  - Marked the intro headers + form elements with `no-print` so the PDF captures only the result cards (letter grid, Naamank profile, mobile ank profile, digit composition) — not empty input textboxes.
- Verified end-to-end with an automated flow that computes Chaldean + Mobile then downloads the PDF. Rendered each page as PNG + inspected. Exactly 5 pages, every element cleanly on its designated page with no overlap.

## Feb 20, 2026 — Numerology Report intro-paragraph spacing bug fix (P0)
- User bug: Intro paragraph below "Mulank · Bhagyank · Naamank" was appearing to overlap with the 3-card grid below (same complaint for the Mahadasha section's intro overlapping the current-state banner).
- Fix in `/app/frontend/src/pages/PremiumTier.jsx`:
  - Both intro paragraphs bumped from `mb-6`/`mb-5` → `mb-10 leading-relaxed`.
  - Content below (3-card grid on P1; `<NumDashaTimeline />` on P3) now wrapped in `<div className="pt-2">` for extra top-padding.
- Verified by testing agent (`/app/test_reports/iteration_8.json`, success rate 100%): confirmed a ~40px vertical gap between the intro paragraph and following content, both in the live on-screen render and in Pages 1 & 3 of the downloaded PDF.

## Feb 20, 2026 — 40px gap between Dasha summary banner and Mahadasha rows (P0)
- User request: In `Vedic Numerology Report` PDF, add 40px vertical separation between the Mahadasha/Antardasha/Pratyantardasha/Daily-Dasha summary boxes and the Mahadasha rows table below.
- Fix: `/app/frontend/src/components/NumDashaTimeline.jsx` — current-dasha banner grid `mb-2` → `mb-10` (40px in Tailwind).

## Feb 20, 2026 — Mahadasha table no longer breaks across pages (P0)
- User bug: After adding the 40px gap, the last 3 Mahadasha rows (Rahu 2071 · Budha 2075 · Shukra 2080) spilled onto a new PDF page with heavy whitespace — table broken abruptly.
- Fix in `/app/frontend/src/components/NumDashaTimeline.jsx`:
  - Row button vertical padding `py-2` → `py-1` (halved per row).
  - Root row list `space-y-1` → `space-y-0` (removed inter-row gap).
- Net effect: full 81-year Mahadasha table (all 20+ rows including drilled Rahu antardashas + Ketu pratyantardashas) now fits on ONE PDF page. Verified via regenerated PDF Page 3 image — Shukra 1990 through Ketu 2093 all visible on the same page; no orphan rows spilling to a next page.










- User request: "In premium tier please add vedic numerology chart by taking input of date of birth provided from user details section on top of page."
- Backend (`/app/backend/numerology.py`): added `compute_lo_shu_grid(dob)`.
  - Returns 3×3 grid in classic layout: `4-9-2 / 3-5-7 / 8-1-6`.
  - Counts DOB digits (zeros excluded per Vedic convention) + reinforces with Mulank + Bhagyank.
  - Exposes `present` / `missing` numbers + `arrows_present` / `arrows_missing` — checking all 8 classical arrows (3 rows / 3 columns / 2 diagonals) with each labelled (e.g. "Plane of Will", "Plane of Prosperity") and strength/weakness interpretation.
  - Bug fix: `counts` dict uses string keys so BSON-serialization for MongoDB storage succeeds.
- Backend (`_build_chart`): `numerology` payload now includes `lo_shu`.
- Frontend (`PremiumTier.jsx`): rendered below the Mulank/Bhagyank/Naamank cards inside the Numerology Overview section:
  - Visual 3×3 grid: filled cells show the digit repeated per count (e.g. "99" for two 9s) in bold gold; empty cells faded. `×count` badge for repeats.
  - Right column lists "Present Numbers · Strengths" and "Missing Numbers · Growth Areas" with the meaning of each cell.
  - Below: two coloured boxes — "Completed Arrows · Karmic Gifts" and "Missing Arrows · Karmic Lessons".
- Verified end-to-end: Ravi Kumar 1990-05-15 → grid `[0,2,0][1,2,0][0,2,1]`, present 1/3/5/6/9, missing 2/4/7/8, arrow 9-5-1 (Plane of Will) complete. PDF (6 pages, 2.85 MB) — Lo Shu grid, arrows, and interpretations all render on Page 6 with no cutoff.

## Feb 20, 2026 — Vedic Numerology Chart (Lo Shu Grid) added (P0)

## Feb 27, 2026 — Code Review Cleanup (P2 tech debt)
Applied fixes from the automated code quality review:

**Backend**
- `tarot.py`: switched from seedable `random.Random` to `secrets.SystemRandom` when `seed=None` (production). Seeded calls (`draw_three_card_spread(seed=42)`) still use `random.Random(seed)` so tests remain reproducible.
- `server.py`: refactored `payments_webhook` (was 82 LOC, cx=17) into three functions — `payments_webhook` (dispatch), `_webhook_handle_captured`, `_webhook_handle_failed`. Signature verification and idempotency preserved (verified via 400-on-bad-sig test).
- `tests/`: replaced hardcoded `"admin123"` password literals in 5 test files with `os.environ.get("ADMIN_PASSWORD", "test1234")` — aligns with `.env` and lets CI rotate the seed password without code changes. Removed 1 unused variable in `test_security_fixes.py`. Fixed 6 `== True/False` → identity checks. Fixed 6 F541 f-strings.

**Frontend**
- Escaped 15 JSX apostrophe/quote entities across About, BookConsultation, ForgotPassword, MyBookings, ReadingsList, PanchangSection, UpgradeButton — Vercel/CRA prod builds no longer emit `react/no-unescaped-entities` errors.
- Added `rel="noreferrer"` to two `target="_blank"` links (MyBookings meet-join, SchedulerAdmin external URL).
- Removed 5 unused `eslint-disable` directives (BirthForm, Navbar, PlaceOfBirthInput, Pricing, VerifyEmail). Cleaned up unused `payMode` state in Pricing.jsx.
- `Navbar.jsx`: extracted the `navItems.filter(...)` from JSX into a `useMemo(..., [user])` so the desktop+mobile menus don't re-filter on every render.
- `VerifyEmail.jsx`: added `refresh` to the `useEffect` deps (was suppressed with `eslint-disable-next-line`).

**Lint status after**
- Backend: 0 errors.
- Frontend: 3 errors remain — all inside `components/ui/calendar.jsx` and `components/ui/command.jsx`. These are shadcn library files (re-generated by the shadcn CLI) so we deliberately do not patch them.

**Not addressed (deferred — high-risk / large scope)**
- Refactor of `kundali.py::compute_chart_from_local` (182 LOC, cx=31), `panchang.py::compute_festivals_for_range` (111 LOC, cx=33), `num_dasha.py::compute_numerology_dasha` (125 LOC, cx=22). Each needs its own testing pass to guarantee identical planetary/festival/dasha output; recommended as a dedicated ticket.
- Split of `PremiumTier.jsx` (~1190 LOC) and `BasicTier.jsx` (~644 LOC) into sub-components — pure organisational change, will land alongside the server.py `/routes` refactor.

**Verified**
- `iteration_10.json` — 9/9 backend tests PASS, frontend spot-checks PASS. No functional regressions.

## Feb 27, 2026 — Basic tier: streaming AI reading (P0 UX)
Users no longer wait 30–90s for the "Detailed Reading" section to appear.

**Backend**
- Added `POST /api/astrology/basic/stream` — returns `text/event-stream` (SSE).
  - **Event 1 (`chart`)**: fired immediately after Swiss-Ephemeris chart is computed (~1s). Payload matches the previous `/basic/start` response so the frontend can render Ascendant / Sun / Moon / Nakshatra / D1 / D9 charts right away.
  - **Event N (`delta`)**: token deltas from Claude Sonnet 4.5, one JSON-encoded chunk per token. Uses `litellm.acompletion(stream=True)` under the hood (emergentintegrations 0.1.0 doesn't yet expose `stream_message`, but it's a thin wrapper around litellm so we call litellm directly with the same emergent-proxy setup).
  - **Event Last (`done` / `error`)**: persists the completed advice to `readings.advice` + `status: "done"`; on failure marks `status: "failed"`.
- `X-Accel-Buffering: no` header prevents nginx/Cloudflare from batching the SSE chunks.
- Old `POST /astrology/basic` (sync) and `POST /astrology/basic/start` + polling remain untouched so existing tests / mobile clients keep working.

**Frontend**
- `BasicTier.jsx::submit` — replaced the poll-every-3s loop with a `fetch()` + `ReadableStream.getReader()` SSE consumer.
  - Parses `event:` / `data:` framing manually (browser `EventSource` doesn't support POST bodies).
  - `chart` event → sets `result` (whole page renders instantly).
  - `delta` events → appends to `result.advice` via functional `setState` so React re-renders in place, giving a ChatGPT-style typewriter effect.
- Updated the pending-message to reflect the new UX (small pulsing dot, "words will appear as our Jyotishi AI writes them") — visible for ~1 second before the first tokens land.

**Measured latency (via ingress proxy)**
- **First `delta` event**: ~1s after form submit (vs 30–90s previously to see anything).
- **Steady rate**: ~2 tokens/s → whole 500-word reading streams in ~40–60s but the user is already reading within a second.

**Not touched**
- Premium tier still uses `/start` + polling — will migrate to streaming in a follow-up once we validate the UX on Basic.



## Feb 28, 2026 — Text-based jsPDF exports fully verified (Basic + Premium tiers)
- User request: "Please make pdf downloadable in each Basic and Premium tier."
- Prior session had written `/app/frontend/src/lib/pdfBuilders.js` but never validated it. iteration_11 test surfaced 4 field-mapping bugs; iteration_12 confirms all fixed.
- Fixes in `/app/frontend/src/lib/pdfBuilders.js`:
  - `drawSubjectHeader(doc, r, subtitle, y, inputs)` now takes an `inputs` arg (form-state from BasicTier/PremiumTier). Previously fell back to `r.inputs`/`r.summary` which SSE/polling payloads don't echo → name/DOB/TOB/POB rendered as dashes. Fixed.
  - `drawPlanetaryPositions()` now reads `p.degree` (backend's real field) with fallback to legacy `p.deg_in_sign`, and normalises planets shape (array **or** object). Previously the Degree column was universally "—".
  - `drawNumerologyCore()` now maps `entry.planet` + `entry.planet_english` → Name column and `entry.traits` → Essence column (with substring-dedupe for Ketu to avoid "Ketu (Ketu (South Node))"). Previously showed dashes/blanks.
  - `buildPremiumNumerologyPdf()` no longer falls back to `reading.advice` — it only emits the "AI Numerology Reading" section when a real `numerology_advice` field exists, so the Numerology PDF no longer duplicates the Astrology advice.
- `/app/frontend/src/components/ResultActions.jsx`: new `inputs` prop, forwarded to `builder(reading, inputs)`.
- `/app/frontend/src/pages/BasicTier.jsx` line 226 and `/app/frontend/src/pages/PremiumTier.jsx` lines 264 + 588 now pass `inputs={inputs}` from React state.
- Verified end-to-end via testing_agent (iteration_12): Basic PDF 4 pages / 94KB, Premium Astrology 6 pages / 119KB, Premium Numerology 4 pages / 106KB. SNW gilded banner + Ganesha invocation on page 1 of every PDF; "Page X of Y" footer on every page. All previously-broken fields now populate correctly.


## Feb 28, 2026 — Kundali charts embedded in Basic + Premium Astrology PDFs
- User request: "Please enhance the pdf by including kundali lagna chart, chandra rashi chart and navamsha chart."
- New primitives in `/app/frontend/src/lib/pdfBuilders.js`:
  - `drawKundaliDiagram(doc, chart, x, y, size)` — pure vector North-Indian diamond (jsPDF rect + lines + text + circle only, no image / html-to-image / DOM snapshot, zero CORS risk). Layout ratios match the on-screen `KundaliChart.jsx` component; asc pill anchored on house 1.
  - `drawKundaliChartsPage(doc, reading)` — inserts a dedicated "Vedic Kundali Charts" page: D1 Lagna centred at 100 mm on top, then Chandra Rashi + Navamsha side-by-side at 76 mm below, each with a title + Ascendant caption.
- Wired into `buildBasicPdf` and `buildPremiumAstroPdf` between the Nakshatra section and Planetary Positions. `buildPremiumNumerologyPdf` intentionally untouched (numerology-only report).
- Verified end-to-end (iteration_13): Basic PDF now 5 pages, Premium Astrology now 8 pages. Rendered page 3 to PNG — all 12 rashi numbers, planet codes (Su/Mo/Ma/Me/Ju/Ve/Sa/Ra/Ke), and Asc marker visible on every chart. No clipping, no errors.


## Feb 28, 2026 — Hybrid PDFs: text-based body + on-screen chart snapshots
- User request: "Can we ensure PDF is prepared as it is shown in all tiers" → user picked hybrid option (c).
- Added `html-to-image ^1.11.13` dependency.
- New helpers in `/app/frontend/src/lib/pdfBuilders.js`:
  - `snapshotByTestId(testId)` — captures a DOM element by data-testid to a PNG data-URL at 2× pixel-ratio on parchment background. Uses html-to-image's `filter` option to strip any `.no-print` node (removes "Click to expand" hover hints from the captured cards). Returns null on failure.
  - `drawSnapshot(doc, snap, x, y, maxW, maxH)` — scales+centres the PNG into a PDF bounding box preserving aspect ratio.
  - `drawKundaliChartsFromScreen(doc, reading, [d1Id, chandraId, navamshaId])` — dedicated page: D1 raster full-width on top, Chandra + Navamsha raster side-by-side below. Falls back to the vector-diamond `drawKundaliChartsPage()` if all snapshots fail.
  - `drawNumerologyGridsFromScreen(doc, num, y, containerTestId)` — raster snapshot of the on-screen Lo Shu + Vedic Planetary Chart pair. Falls back to vector `drawLoShu` + `drawVedicPlanetChart` autoTables if the container isn't on-screen.
- All three public builders are now `async`; `ResultActions.jsx` awaits them. Tables, subject header, planetary positions, Vimshottari mahadasha, numerology overview, and AI reading remain pure jsPDF text (fully selectable).
- Basic PDF ID triples: `basic-expand-kundali-{d1,chandra,navamsha}`. Premium Astrology: `expand-kundali-{d1,chandra,navamsha}`. Premium Numerology grids: `premium-numerology-charts`.
- Verified end-to-end (iteration_14): PDFs on all three tiers now embed raster snapshots of the on-screen chart cards on the diagram pages while keeping all body text selectable. All acceptance criteria pass. Only cosmetic follow-up ("Click to expand" hint inside snapshots) resolved by adding a `filter` predicate that drops nodes with class `no-print`.


## Feb 28, 2026 — PDFs formatted to match the user's reference sample
- User uploaded a reference PDF (`Vedic-Astrology-Report (1).pdf`) and asked to format the Vedic Astrology + Numerology reports to match its layout.
- Complete restructure of `/app/frontend/src/lib/pdfBuilders.js`:
  - **New cover page** (`drawAstroCoverPage`, `drawNumerologyCoverPage`): SNW brand band, Ganesha invocation, subject name, 3×2 metadata grid (DoB/ToB/PoB + Ascendant/Sun/Moon for astrology; + Mulank/Bhagyank/Naamank for numerology), Nakshatra summary block with English-only nakshatra name + PADA + attribute strip.
  - **New helpers**: `drawMetaBox` (auto-fits label size + charSpace so long labels like "BHAGYANK (DESTINY NUMBER)" don't clip), `drawFittedTitle` (measures text width and progressively drops charSpace then font size), `NUMEROLOGY_RULERS` map, `RASHI_SANSKRIT` map, `formatDob`.
  - **Page sequence** now mirrors reference: Page 1 = cover; Page 2 = KUNDALI LAGNA CHART · D1 + Planetary Positions autoTable; Page 3 = CHANDRA RASHI CHART + NAVAMSHA CHART · D9; Page 4 = VIMSHOTTARI MAHADASHA · 120-Year Cycle (intro paragraph + current-running line); Page 5+ = DETAILED VEDIC KUNDALI READING FOR <NAME> heading + AI advice.
  - **Planetary Positions table** now includes a NAVAMSHA column and a STATES column that lists all planetary states (Retrograde, Vargottam, Exalted, Debilitated) — pulled from backend `p.states` array.
  - **Vimshottari section** gains an intro paragraph and a "Currently running: X — Y — Z" line above the table.
  - **Numerology Mahadasha** now shows real planet-name Rulers derived from `m.number` via `NUMEROLOGY_RULERS` (previously showed em-dashes because backend doesn't echo the planet name per row).
  - **Markdown H1** (`# ...`) now renders as a subdued centered gold sub-heading; previously leaked as literal `# ` into the reading body.
  - **`drawKundaliChartsFromScreen`** now accepts a `layout` option (`"d1"` / `"chandra+navamsha"` / `"all"`) so a single helper serves both the page-2 (D1 + planetary table) and page-3 (Chandra + Navamsha stacked) layouts of the reference PDF.
  - **`drawFooter`** now stamps a subtle 14%-opacity SNW logo circular watermark on every content page (not the cover). Uses `doc.GState({opacity})` from jsPDF's graphics-state stack.
- Removed dead code: `drawCoverBanner`, `drawSubjectHeader`, `drawNakshatraSection` (all subsumed by the new cover flow).
- Added `snw-logo.jpg` import as the watermark source.
- Verified via testing agent (iteration_15 + iteration_16): all 5 bugs found in iteration_15 are fixed in iteration_16 with 100% pass on the retest scope and all requested regression checks. One remaining LOW cosmetic (long numerology cover labels + sub-tagline auto-fitting) subsequently addressed via `drawMetaBox` auto-shrink + `drawFittedTitle` on the tagline.


## Feb 28, 2026 (later) — Numerology-advice backend + cover overflow polish
- **Backend (`/app/backend/server.py`)**: Added `_premium_numerology_prompts(body, chart)` — a Claude prompt tuned for Jyotisha + Chaldean + Lo Shu numerology. Generates a ~600-word reading with sections `## Numerology Blueprint / Personality & Inner Nature / Career & Purpose / Wealth & Prosperity / Relationships & Bonds / Health & Vitality / Current Dasha Focus & Remedies`. Both `/astrology/premium` (sync) and `/astrology/premium/start` (async) now fire the astrology + numerology Claude calls **concurrently via `asyncio.gather(..., return_exceptions=True)`** — total wait time is unchanged (bounded by whichever call is slower). Reading document now stores `numerology_advice`; status endpoint echoes it back.
- **Frontend (`/app/frontend/src/lib/pdfBuilders.js`)**: No wiring change needed — `buildPremiumNumerologyPdf` already conditionally renders the "AI Numerology Reading" section from `reading.numerology_advice`. Now that the backend actually populates it, the Premium Numerology PDF grows from 4 → 6 pages.
- **Cover-page polish**: Tightened `drawMetaBox` label auto-fit threshold from `w-4` mm to `w-6` mm (with a slightly lower minimum font floor of 5.2 pt). Long labels like "BHAGYANK (DESTINY NUMBER)" now sit ~3 mm inside the box border on both sides instead of visually clipping the right edge.
- **Self-test verification (via screenshot tool)**: Premium Numerology PDF successfully downloaded — 6 pages, cover renders SATISH NUMERO WORLD band + Ganesha + "VEDIC NUMEROLOGY REPORT" title + subject name + all six meta-boxes (DOB/TOB/POB + MULANK 6 · Venus / BHAGYANK 3 · Jupiter / NAAMANK 7 · Ketu with trait sub-labels) + "A VEDIC NUMEROLOGY JOURNEY · BASED ON JYOTISHA + CHALDEAN + LO SHU TRADITIONS" tagline fully inside page margins.
- **Operational note**: During the retest the Emergent Universal LLM key hit its `15.001` budget cap. Both AI calls were correctly caught via `return_exceptions=True` and persisted as empty strings without crashing the reading. When the key is topped up (Profile → Universal Key → Add Balance / enable Auto Top-up) both readings resume generating in ~30 s each in parallel.


## Feb 28, 2026 (later) — Centered heading fix + bolder background watermark
- **True centering fix**: jsPDF's `align: "center"` measures glyph width WITHOUT accounting for `charSpace`, so any centred heading with letter-spacing ended up visually shifted a few mm to the left. New `drawCenteredText(doc, text, y, {charSpace})` helper computes the true rendered width (glyph + inter-char spacing) and positions the text at `(page.w - width) / 2`. Applied to all four flagged headings and any other charSpace-centred text on the covers:
  - "SATISH NUMERO WORLD" band (astro + numerology covers)
  - "NUMEROLOGY · ASTROLOGY · TAROT" tagline
  - "VEDIC KUNDALI REPORT" / "VEDIC NUMEROLOGY REPORT" titles
  - "NAKSHATRA REPORT · MOON'S STAR" section title
  - Kundali chart page heading + caption labels
  - "DETAILED PLANETARY READING" sub-title
  - `drawFittedTitle` now also uses the same true-width math.
- **Bolder background watermark**: SNW logo watermark now **60 mm** (was 22 mm) at **22 % opacity** (was 14 %), still positioned bottom-centre above the "Page X of N" footer. Visible as a clear background stamp on every content page while surrounding tables + reading text remain fully legible on top. Cover (page 1) skips the watermark so the SNW brand band on the cover isn't visually competing with a duplicate mark.
- Self-tested by regenerating a premium reading via ReadingDetail and rendering page 1 + page 2 to PNG — all 4 centred texts now sit exactly on the page's vertical axis; the enlarged 60 mm watermark appears clearly on content pages.


## Feb 28, 2026 (later) — Pricing page + bigger PDF watermark
- **Pricing page Sadhaka tier expanded**: added six new bullets under the existing 2 so the tier accurately reflects what it delivers — Nakshatra Report, Chandra Rashi Chart, Navamsha Chart, Basic Personal Reading, Chaldean Name Numerology, Mobile Number Numerology. English + Hindi i18n updated (`pricing.tier_sadhaka.f3` – `.f8` in `/app/frontend/src/i18n/locales/en.json` + `hi.json`). Rendered by `/app/frontend/src/pages/Pricing.jsx`. Verified live on preview.
- **PDF watermark 1.5×**: `drawFooter` watermark size **60 → 90 mm** and vertical position adjusted (`page.h - wmSize - 22`) so the enlarged stamp still fits comfortably above the "Page X of N" footer. Visually verified on page 2 of a downloaded reading — reads as a proper bold brand watermark on every content page while tables + reading text on top remain fully legible.


## Feb 28, 2026 (later) — Multi-language: English, Hindi, Telugu
- **i18n re-enabled** in `/app/frontend/src/i18n/index.js`: three languages (en/hi/te) with browser-language-detector + localStorage persistence under key `snw_lang`. `LANGUAGES` constant exported.
- **LanguagePicker** mounted in `/app/frontend/src/components/Navbar.jsx` — visible on md+ (top-right dropdown) and in the mobile drawer.
- **Locale coverage**: en.json / hi.json / te.json all cover 271 shared UI keys + 61 new `pdf.*` keys added this iteration for PDF label translation.
- **PDF translation** in `/app/frontend/src/lib/pdfBuilders.js`:
  - New `pickPdfLang(inputs, reading)` — prefers the reading's stored lang (so historical readings export in the language they were generated in), falls back to current UI language for pre-i18n / English readings.
  - New `bindLang(lang)` sets module-level translator `T = i18n.getFixedT(lang, "translation", "pdf")`. All hardcoded English strings replaced with `T(...)` calls (61 keys).
  - **Devanagari + Telugu font embedding**: Bundled `NotoSansDevanagari-Regular.ttf` (219 KB) + `NotoSansTelugu-Regular.ttf` (197 KB) under `/app/frontend/public/fonts/`. `activateScriptFontForLang(doc, lang)` lazy-fetches the TTF, base64-encodes it, registers via `doc.addFileToVFS` + `doc.addFont`. `FONT_CACHE` keeps the base64 across downloads.
  - **Per-string script detection**: Noto Sans Devanagari/Telugu TTFs from Google's static hosting have zero Latin coverage (verified via fonttools). So we keep `LAYOUT.fonts.body = "helvetica"` as default and use a `pickFontForText(text)` helper (regex on Unicode script ranges) at every draw site to switch the family only for strings that contain Devanagari/Telugu codepoints. Latin dynamic values (names, dates, place names, planet signs) keep helvetica so they render correctly.
  - **autoTable hook**: `tableFontHook(data)` attached via `didParseCell` on all 6 autoTable calls — automatically picks the right font per cell content so Hindi/Telugu column values render correctly next to Latin ones (e.g. "मार्गी" in the States column and "Leo" in the Rashi column of the same row).
  - Mid-dot separator (`·`, U+00B7) swapped for pipe (`|`) in every Hi/Te `pdf.*` string — the Noto Sans script subsets omit U+00B7 which was silently truncating tagline strings.
- **charSpace only for Latin**: Indic scripts have natural inter-glyph rhythm; the Latin-tuned charSpace values we use for uppercase headings distorted Devanagari. `drawCenteredText` and `drawFittedTitle` now zero out charSpace when the target script is Indic.
- **Self-tested**: Downloaded PDF from a saved reading in HI + TE. Every cover label, meta box, nakshatra block, section heading, table header (Graha/Rashi/etc.), Vimshottari intro paragraph, mahadasha table columns, page footer ("पृष्ठ 1 / 6" / "పేజీ 1 / 6") renders in the target script. Latin values (Ravi Kumar / 15 May 1990 / Mumbai / Leo etc.) remain crisp.

### Known non-goals for this iteration
- Sanskrit / Devanagari original nakshatra names on the cover (e.g. Uttara Ashadha's "उत्तर आषाढ़ा" from the backend `nak.sanskrit` field) are still dropped — backend sends the transliteration and we render only the English name. Fixable later by teaching `drawAstroCoverPage` to draw `nak.sanskrit` as a second line with the Devanagari font active.
- Chart planet codes (Su/Mo/Ma etc.) inside the kundali diamond snapshots stay English — they're baked into the on-screen React SVG that gets html-to-image snapshotted.
- AI advice text (`reading.advice`) — when the reading was originally generated in Hindi/Telugu by Claude, jsPDF now renders it correctly (via Noto Sans). Older English readings display English advice regardless of PDF language setting.



## Feb 12, 2026 — AI translation disclaimer banner
- Added `/app/frontend/src/components/TranslationDisclaimerBanner.jsx` — thin, dismissible banner shown at the very top of every page (mounted inside `Shell` in `/app/frontend/src/App.js` above the Navbar) warning users that translated UI + AI-generated content may not be fully accurate. Uses warm palette (`#FFF4E5` with `#FF8C00` accent) consistent with the app.
- Copy is fully localised — `disclaimer.label` / `disclaimer.translation` / `disclaimer.dismiss` added to en.json, hi.json, te.json and ta.json so the banner itself reads in the user's selected language.
- Dismissal persists via `sessionStorage` (key `snw_translation_disclaimer_dismissed`) — hidden for the rest of the tab session once closed, reappears in a fresh session.
- data-testid: `translation-disclaimer-banner`, `translation-disclaimer-dismiss`.
- Verified on landing page via screenshot: banner renders above Navbar with correct copy in English.


## Feb 12, 2026 (later) — Saved-reading on-demand translation
- **New endpoint `POST /api/readings/{id}/translate`** in `/app/backend/server.py`:
  - Body: `{lang: "hi"|"te"|"ta"|"en"}`.
  - Auth: user must own the reading.
  - If target == source (or already in `reading.translations.<lang>`) returns the cached copy instantly.
  - Otherwise splits `advice` + `numerology_advice` into paragraph-boundary chunks (`_split_into_chunks`, max 1800 chars per chunk) and fires all chunks in parallel to Claude Sonnet 4.5 via `_ask_claude` — reduces first-call latency below Cloudflare's 100 s edge timeout for the largest premium readings (~13 KB combined text).
  - Result is persisted at `readings.translations.<lang> = {advice, numerology_advice}` for permanent per-language caching.
- **`TranslateReadingIn` pydantic model** added next to `ShareIn`.
- **New helper `_split_into_chunks(text, max_chars)`** preserves Markdown paragraph boundaries so headings/lists never tear mid-chunk.
- **New frontend component `/app/frontend/src/components/ReadingTranslator.jsx`**:
  - Pill row showing the source language (with "original" tag) plus every other supported language (hi/te/ta).
  - Click → POST /translate → cache in local state + surface toast on error.
  - On mount, auto-requests translation into the current UI language if it differs from source (makes "switch site language then open saved reading" flow feel automatic).
  - Visual indicator: active view = solid saffron pill; already-cached (but not viewed) = small dot on pill.
  - Shows an "AI-translated — switch back for original" notice while a translation is active.
- **`ReadingDetail.jsx` integration**:
  - Holds `view` + `display` state (advice + numerology_advice currently shown).
  - Advice section reads from `display.advice` instead of `r.advice`.
  - `ResultActions` (both the main PDF button and the numerology-dasha PDF button) receive a merged reading with the translated text AND `inputs.lang = <view>` so `pickPdfLang` in pdfBuilders switches to the Noto Devanagari/Telugu font and renders the translated PDF in the target script.
- **Locale strings** added to en/hi/te/ta json for `translator.label`, `translator.original`, `translator.ai_notice`.
- **Verified**: Endpoint tested via curl — first uncached call to `hi` succeeded and cached the result; subsequent call returned in <25 ms with `cached: true`. Preview UI screenshot confirms the pill row + banner render correctly on the reading detail page.
- **Known caveat**: The Emergent LLM Key budget on this workspace was exhausted (`Current cost: 17.14, Max budget: 17.00`) so a fresh Telugu translation currently returns a 502 — user needs to top up the Universal Key balance (Profile → Universal Key → Add Balance) to test uncached calls further. Code path is verified — Hindi translation ran successfully before the budget cap.

### Data-testids added
- `reading-translator`, `translator-btn-en/hi/te/ta`, `translator-ai-notice`.


## Feb 12, 2026 (later still) — Simpler & shorter reading language
- Updated all three AI prompt builders in `/app/backend/server.py` (`_basic_prompts`, `_premium_prompts`, `_premium_numerology_prompts`) to enforce:
  - **8th-grade reading level English** — short common words, no poetic/flowery phrasing, sentences ≤ 15 words.
  - **Shorter word counts** — Basic: 500–600 → **250–320 words**. Premium astrology + Premium numerology: 550–700 → **320–400 words** each.
  - Each section reduced from "2–4 paragraphs" / "2–4 sentences" to **"2–3 short sentences"**.
  - Vedic terms still allowed but must include a brief 2–3 word plain-English meaning in brackets on first use.
- Also fixed a pre-existing syntax-error-inducing duplicate block at the end of server.py (leftover copy of the `/api/bookings` return statement below `app.include_router` calls) that had been silently blocking one hot-reload cycle.
- Backend confirmed healthy after change (curl `/api/auth/me` returns 401 as expected).
- Effect: every new Basic and Premium reading (and its PDF export) will use markedly simpler English and be roughly half the previous length. Existing saved readings are unchanged — user can re-generate if they want the shorter form.


## Feb 12, 2026 (later still) — Translation for the standalone Numerology report
- **New stateless `POST /api/translate` endpoint** in `/app/backend/server.py`. Body: `{text, lang, source_lang="en"}`. Chunks the input at paragraph boundaries and translates chunks in parallel via Claude Sonnet 4.5 to stay under Cloudflare's 100 s edge timeout for large readings. No DB persistence — used for reading pages that don't save to the archive.
- **`TranslateTextIn`** pydantic model added.
- **New `/app/frontend/src/components/LiveTextTranslator.jsx`**: sibling of `ReadingTranslator` but for non-persisted live text. Same UI (source pill + 3 target pills, saffron active state, cached-dot indicator, AI disclaimer notice, `data-testid` per pill). Local state cache — resets on source text change (e.g. user regenerates with a different name/DOB). Auto-fetches into current UI language when source text is set.
- **Wired into `/app/frontend/src/pages/Numerology.jsx`**: after the AI reading is generated, the `LiveTextTranslator` is rendered above the `AdviceMarkdown`, and the markdown reads from `display` (translator's onView payload) with fallback to the original `advice`. Source language is captured from `i18n.resolvedLanguage` at generation time so switching languages later triggers a proper translation (not another regeneration).
- **Also tightened `/numerology/reading` prompt** in `server.py` — now uses the same "SIMPLE, EVERYDAY English / 8th-grade reader / ≤15-word sentences" rules and reduced to **180–240 words** (from ~280), matching the Basic/Premium tone changes.
- **Verified end-to-end**: Playwright test — logged in as premium, filled Numerology form, generated reading, translator toolbar rendered with 4 pills, generated reading was in the new simpler style (visible in screenshot).
- **data-testids added**: `numerology-translator`, `numerology-translator-btn-{en/hi/te/ta}`, `numerology-translator-ai-notice`.


## Feb 12, 2026 (later still) — Admin credentials rotated to SNW admin
- Rotated `/app/backend/.env` `ADMIN_EMAIL` → `snw_admin@satishnumeroworld.com`, `ADMIN_PASSWORD` → `SNW_admin_0709` per user request. Existing `_seed_admin` startup logic automatically created the new admin and rotated its password.
- Deleted the legacy `admin@vedic.com` account from Mongo since it is superseded by the SNW admin.
- **Admin link visibility**: already gated by `user.role === "admin"` in `Navbar.jsx` — invisible on the landing page for unauthenticated visitors and regular users. No change needed.
- **All Readings page**: already implemented at `/admin?tab=readings` (Admin.jsx, `admin-tab-readings`). Uses `GET /api/admin/readings` which joins user email + name onto every reading. Verified live — logged in as new SNW admin, 318 readings from all users rendered in a single table with View drill-down.
- Also updated `/app/memory/test_credentials.md` with the new SNW admin credentials.
- ⚠️ **Production**: user must set the same `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars on the production deployment for the SNW admin to be created there. Just redeploy will NOT be enough unless those envs are updated in the Emergent production environment.


## Feb 15, 2026 — Admin reset for visitor counters
- **Executed the pending user request** ("reset the total user visits and unique seekers and today count to 0") by calling `POST /api/stats/reset` as the SNW admin. Verified: `{total_views: 0, unique_visitors: 0, today_views: 0}`.
- **Added a self-serve "Reset counters" button** in `/app/frontend/src/components/VisitorStats.jsx` so the admin can zero out the counters from the landing page anytime without needing curl:
  - Pill button (saffron hover, `RotateCcw` icon) rendered below the 3 stat tiles, visible only to `role === "admin"`.
  - Two-step confirm: browser `confirm()` + typed `RESET` prompt (matching the pattern used for the "Delete all readings" flow).
  - Optimistic local update to `{0,0,0}` on success, clears the session flag so the admin's next reload re-counts as a new visit.
  - `data-testid="admin-reset-visitor-stats-btn"`.
- **Verified end-to-end** — admin flow returns `200` and zeroes counters, non-admin gets `403` from `/api/stats/reset` (auth guard intact).
