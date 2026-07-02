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






