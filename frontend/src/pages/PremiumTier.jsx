import { useState, useRef, useEffect } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import BirthForm from "../components/BirthForm";
import KundaliChart from "../components/KundaliChart";
import ExpandedKundaliModal from "../components/ExpandedKundaliModal";
import { Maximize2, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import PlanetStates from "../components/PlanetStates";
import NumDashaTimeline from "../components/NumDashaTimeline";
import NumDashaCurrentTable from "../components/NumDashaCurrentTable";
import NumberCard from "../components/NumberCard";
import UpgradeButton from "../components/UpgradeButton";
import ResultActions from "../components/ResultActions";
import ReadingCover from "../components/ReadingCover";
import AdviceMarkdown from "../components/AdviceMarkdown";
import GaneshaBanner from "../components/GaneshaBanner";
import snwLogo from "../assets/snw-logo.jpg";
import { localizePlanet, localizeRashi, localizeNakshatra } from "../lib/vedicNames";

/**
 * Lightweight collapsible section wrapper used to group the two premium
 * reports (Vedic Astrology & Vedic Numerology). Content is always in the DOM
 * so PDF capture (via html-to-image + `neutralizeOverflow`) still works even
 * when the user has visually collapsed the section — the exporter forces
 * `overflow: visible` / `max-height: none` during capture.
 */
function CollapsibleSection({ title, subtitle, testId, open, onToggle, children }) {
  return (
    <div className="mb-10" data-testid={testId}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`${testId}-toggle`}
        className="no-print w-full flex items-center justify-between gap-4 px-6 py-4 rounded-md text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#B8860B]/40"
        style={{
          background: "linear-gradient(90deg, rgba(184,134,11,0.10) 0%, rgba(212,175,55,0.04) 100%)",
          border: "1px solid rgba(184,134,11,0.35)",
        }}
      >
        <div>
          <div className="font-heading text-2xl md:text-3xl" style={{ color: "#14172B", fontWeight: 600 }}>
            {title}
          </div>
          {subtitle && (
            <div className="mt-1 font-body text-xs" style={{ color: "#5C3A09" }}>
              {subtitle}
            </div>
          )}
        </div>
        <ChevronDown
          className="w-6 h-6 shrink-0 transition-transform"
          style={{ color: "#B8860B", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        />
      </button>
      {/* Keep children mounted so PDF export can capture them; visually hide
          with max-height:0 + overflow:hidden when collapsed. */}
      <div
        style={{
          maxHeight: open ? "none" : 0,
          overflow: "hidden",
          transition: "opacity 0.25s ease",
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}

export default function PremiumTier() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState(null);
  const [inputs, setInputs] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Chaldean Name Numerology
  const [chaldeanName, setChaldeanName] = useState("");
  const [chaldeanResult, setChaldeanResult] = useState(null);
  const [chaldeanLoading, setChaldeanLoading] = useState(false);
  const [chaldeanErr, setChaldeanErr] = useState("");

  // Mobile Number Numerology
  const [mobile, setMobile] = useState("");
  const [mobileResult, setMobileResult] = useState(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileErr, setMobileErr] = useState("");

  // Tarot Reading (3-card Past · Present · Future spread + AI interpretation)
  const [tarotQuestion, setTarotQuestion] = useState("");
  const [tarotResult, setTarotResult] = useState(null);
  const [tarotLoading, setTarotLoading] = useState(false);
  const [tarotErr, setTarotErr] = useState("");

  // Auto-prefill the Chaldean Name field from the birth-form name whenever
  // the user submits a birth reading — but never clobber a manual edit.
  useEffect(() => {
    const nameFromForm = inputs?.full_name?.trim();
    if (nameFromForm && !chaldeanName) {
      setChaldeanName(nameFromForm);
    }
  }, [inputs?.full_name, chaldeanName]);


  // Expanded Kundali Modal
  const [expanded, setExpanded] = useState(null); // { title, ascendantLabel, ascendantName, chart, accentColor }
  const resultRef = useRef(null);
  const dashaRef  = useRef(null);
  const numerologyRef = useRef(null);
  const lang = i18n.resolvedLanguage;

  // Collapsible open-state for the two premium reports (both open by default)
  const [astroOpen, setAstroOpen] = useState(true);
  const [numOpen, setNumOpen]   = useState(true);

  const submit = async (values) => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      // Start generation server-side, then poll — long readings (esp. Hindi/Telugu)
      // can exceed the gateway timeout on a single request.
      const { data: start } = await api.post("/astrology/premium/start", { ...values, lang: i18n.resolvedLanguage });
      setInputs(values);
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data: st } = await api.get(`/astrology/premium/status/${start.id}`);
        if (st.status === "done") {
          setResult(st);
          return;
        }
        if (st.status === "failed") {
          throw new Error("The reading could not be generated. Please try again.");
        }
      }
      throw new Error("The reading is taking longer than expected. Check your Readings archive in a few minutes.");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitChaldean = async (e) => {
    e.preventDefault();
    setChaldeanErr("");
    setChaldeanResult(null);
    setChaldeanLoading(true);
    try {
      const { data } = await api.post("/numerology/chaldean-name", {
        full_name: chaldeanName,
      });
      setChaldeanResult(data);
    } catch (e2) {
      setChaldeanErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setChaldeanLoading(false);
    }
  };

  const submitMobile = async (e) => {
    e.preventDefault();
    setMobileErr("");
    setMobileResult(null);
    setMobileLoading(true);
    try {
      const { data } = await api.post("/numerology/mobile", { mobile_number: mobile });
      setMobileResult(data);
    } catch (e2) {
      setMobileErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setMobileLoading(false);
    }
  };

  const submitTarot = async (e) => {
    e.preventDefault();
    setTarotErr("");
    setTarotResult(null);
    setTarotLoading(true);
    try {
      const { data } = await api.post("/astrology/tarot/reading", {
        question: tarotQuestion,
        language: i18n.resolvedLanguage,
      });
      setTarotResult(data);
    } catch (e2) {
      setTarotErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setTarotLoading(false);
    }
  };

  const canRead = user && user.tier === "premium";

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]">
      <div className="sb-container sb-section">
        <div className="max-w-3xl mb-12 fade-up">
          <span className="sb-eyebrow">{t("premium.eyebrow")}</span>
          <h1 className="sb-h1">
            {t("premium.title_a")}{" "}
            <span className="italic font-medium" style={{ color: "#5C3A09" }}>{t("premium.title_b")}</span>
          </h1>
          <p className="sb-lead mt-6">
            {t("premium.intro")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/book" data-testid="premium-book-cta">
              <button className="sb-btn-outline text-sm py-2.5 px-5">
                Or book a 1:1 consultation →
              </button>
            </Link>
          </div>
        </div>

        {!canRead ? (
          <div className="sb-card-dark text-center max-w-2xl mx-auto fade-up" data-testid="premium-upgrade-notice">
            <div className="sb-eyebrow" style={{ color: "#D4AF37" }}>{t("premium.tier_required")}</div>
            <h3 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4 tracking-tight">{t("premium.unlock_title")}</h3>
            <p className="text-[15px] text-[#FDFBF7]/80 leading-relaxed mb-8 max-w-md mx-auto">
              {t("premium.unlock_blurb")}
            </p>
            {user ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <UpgradeButton tier="premium" data-testid="premium-upgrade-btn" />
                <Link to="/pricing?need=premium" className="text-[12px] font-medium tracking-wider uppercase text-[#B8860B] hover:text-[#FF8C00] transition-colors">
                  {t("common.compare_all_tiers")}
                </Link>
              </div>
            ) : (
              <Link to="/login">
                <button className="sb-btn-saffron" data-testid="premium-upgrade-btn">{t("common.sign_in_to_upgrade")}</button>
              </Link>
            )}
          </div>
        ) : (
          <div className="sb-card max-w-2xl mx-auto fade-up">
            <BirthForm onSubmit={submit} loading={loading} cta={t("premium.cta_cast")} testIdPrefix="premium" />
            {err && <div className="mt-4 text-sm text-red-600 font-medium" data-testid="premium-error">{err}</div>}
          </div>
        )}

        {result && (
          <div className="mt-10 fade-up">

          {/* ================= SECTION 1 — VEDIC ASTROLOGY REPORT ================= */}
          <CollapsibleSection
            title="Vedic Astrology Report"
            subtitle="User details · Nakshatra · Lagna & Navamsha charts · Planetary positions · Vimshottari Mahadasha · Personalised reading"
            testId="vedic-astrology-report"
            open={astroOpen}
            onToggle={() => setAstroOpen((v) => !v)}
          >
          <ResultActions targetRef={resultRef} filename="Vedic-Astrology-Report.docx" testIdPrefix="premium" />

          {/* On-screen result — also the PDF capture target. Matches the Basic
              tier layout: single outer premium-card, Ganesha invocation banner,
              paired-page pagination via [data-pdf-page] anchors. */}
          <div ref={resultRef} className="mt-4 premium-card p-8 md:p-12 printable-area" data-testid="premium-result">
            <img src={snwLogo} alt="" className="print-watermark" />

            {/* Decorative invocation banner — opens the report on page 1 */}
            <GaneshaBanner />

            {/* PAGE 1 — Cover: name + birth details + Ascendant/Sun/Moon */}
            <section data-pdf-page="cover" className="mb-8">
              <ReadingCover
                name={inputs?.full_name}
                dob={inputs?.date_of_birth}
                tob={inputs?.time_of_birth}
                pob={inputs?.place_of_birth}
                ascendant={localizeRashi(result.ascendant, lang)}
                ascendantSanskrit={result.ascendant_sanskrit}
                sunSign={localizeRashi(result.sun_sign, lang)}
                moonSign={localizeRashi(result.moon_sign, lang)}
                testIdPrefix="premium"
              />
            </section>

            {/* PAGE 1 (cont.) — Nakshatra Report packs with cover */}
            {result.chart?.nakshatra_report && (
              <section className="mb-8" data-testid="premium-nakshatra-report">
                <div className="glass-card p-6 md:p-8">
                  <div className="ornate-divider mb-5">
                    <span className="font-accent text-xs text-[#B8860B]">Nakshatra Report · Moon&apos;s Star</span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                    <div>
                      <div className="font-heading text-3xl md:text-4xl" style={{ color: "#2A1A05", fontWeight: 600 }}>
                        {result.chart.nakshatra_report.name}
                        <span className="ml-3 font-accent text-base" style={{ color: "#5C3A09" }}>
                          {result.chart.nakshatra_report.sanskrit}
                        </span>
                      </div>
                      <div className="text-[12px] mt-1 font-accent tracking-widest uppercase" style={{ color: "#5C3A09" }}>
                        Pada {result.chart.nakshatra_report.pada} · {result.chart.nakshatra_report.range}
                      </div>
                    </div>
                  </div>
                  <p className="font-body mb-5 leading-relaxed" style={{ color: "#2A1A05" }}>
                    {result.chart.nakshatra_report.description}
                  </p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-[13px] font-body">
                    {[
                      ["Deity",   result.chart.nakshatra_report.deity],
                      ["Symbol",  result.chart.nakshatra_report.symbol],
                      ["Ruler",   result.chart.nakshatra_report.ruler],
                      ["Gana",    result.chart.nakshatra_report.gana],
                      ["Quality", result.chart.nakshatra_report.quality],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="font-accent text-[9px] uppercase tracking-widest" style={{ color: "#5C3A09" }}>{k}</span>
                        <span style={{ color: "#2A1A05" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* PAGE 2 — Lagna D1 chart starts a fresh page */}
            <section data-pdf-page="lagna-chart" className="mb-8">
              <button
                type="button"
                onClick={() => setExpanded({
                  title: t("result.d1_title"),
                  ascendantLabel: t("result.ascendant_lagna"),
                  ascendantName: localizeRashi(result.chart.ascendant_english, lang),
                  chart: result.chart,
                  accentColor: "#D4AF37",
                })}
                className="glass-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 rounded-md"
                data-testid="expand-kundali-d1"
                aria-label="Expand Kundali Lagna Chart"
              >
                <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#B8860B] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#B8860B]">{t("result.d1_title")}</span>
                </div>
                <KundaliChart chart={result.chart} large />
                <div className="mt-4 text-center">
                  <div className="pdf-eyebrow">{t("result.ascendant_lagna")}</div>
                  <div className="font-heading text-2xl" style={{ color: "#5C3A09", fontWeight: 600 }}>
                    {localizeRashi(result.chart.ascendant_english, lang)}
                  </div>
                  <div className="no-print mt-1 font-accent text-[10px] text-[#C0392B] opacity-80 group-hover:opacity-100">{t("result.click_expand")}</div>
                </div>
              </button>
            </section>

            {/* PAGE 2 (cont.) — Planetary positions pack with Lagna */}
            <section className="mb-8">
              <div className="glass-card p-6">
                <div className="font-accent text-xs text-[#B8860B] mb-4">{t("result.planetary_positions")}</div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(212,175,55,0.2)]">
                      <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_graha")}</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_rashi")}</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">°</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_house")}</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_navamsha")}</TableHead>
                      <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_states")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.chart.planets.map((p) => (
                      <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                        <TableCell className="font-body text-zinc-100">
                          {localizePlanet(p.name, lang)}
                        </TableCell>
                        <TableCell className="font-body text-zinc-800">{localizeRashi(p.rashi_english, lang)}</TableCell>
                        <TableCell className="font-body text-zinc-700">{p.degree}°</TableCell>
                        <TableCell className="font-body" style={{ color: "#5C3A09", fontWeight: 600 }}>{p.house}</TableCell>
                        <TableCell className="font-body" style={{ color: "#6B3410" }}>{p.navamsha_sign_english ? localizeRashi(p.navamsha_sign_english, lang) : "—"}</TableCell>
                        <TableCell>
                          <PlanetStates states={p.states} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* PAGE 3 — Chandra Rashi Chart starts a fresh page */}
            {result.chart.chandra && (
              <section data-pdf-page="chandra-chart" className="mb-8">
                <button
                  type="button"
                  onClick={() => setExpanded({
                    title: t("result.chandra_title"),
                    ascendantLabel: t("result.chandra_lagna"),
                    ascendantName: localizeRashi(result.chart.chandra.ascendant_english, lang),
                    chart: result.chart.chandra,
                    accentColor: "#FF9933",
                  })}
                  className="glass-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF9933]/60 rounded-md"
                  data-testid="expand-kundali-chandra"
                  aria-label="Expand Chandra Rashi Chart"
                >
                  <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#FF9933] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  <div className="ornate-divider mb-4">
                    <span className="font-accent text-xs text-[#B8860B]">{t("result.chandra_title")}</span>
                  </div>
                  <KundaliChart chart={result.chart.chandra} large />
                  <div className="mt-4 text-center">
                    <div className="pdf-eyebrow">{t("result.chandra_lagna")}</div>
                    <div className="font-heading text-2xl" style={{ color: "#8B2500", fontWeight: 600 }}>
                      {localizeRashi(result.chart.chandra.ascendant_english, lang)}
                    </div>
                    <div className="no-print mt-1 font-accent text-[10px] text-[#C0392B] opacity-80 group-hover:opacity-100">{t("result.click_expand")}</div>
                  </div>
                </button>
              </section>
            )}

            {/* PAGE 3 (cont.) — Navamsha packs with Chandra */}
            {result.chart.navamsha && (
              <section className="mb-8">
                <button
                  type="button"
                  onClick={() => setExpanded({
                    title: t("result.navamsha_title"),
                    ascendantLabel: t("result.navamsha_asc"),
                    ascendantName: localizeRashi(result.chart.navamsha.ascendant_english, lang),
                    chart: result.chart.navamsha,
                    accentColor: "#D4AF37",
                  })}
                  className="glass-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 rounded-md"
                  data-testid="expand-kundali-navamsha"
                  aria-label="Expand Navamsha Chart D9"
                >
                  <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#B8860B] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  <div className="ornate-divider mb-4">
                    <span className="font-accent text-xs text-[#B8860B]">Navamsha Chart · D9</span>
                  </div>
                  <KundaliChart chart={result.chart.navamsha} large />
                  <div className="mt-4 text-center">
                    <div className="pdf-eyebrow">{t("result.navamsha_asc")}</div>
                    <div className="font-heading text-2xl" style={{ color: "#6B3410", fontWeight: 600 }}>
                      {localizeRashi(result.chart.navamsha.ascendant_english, lang)}
                    </div>
                    <div className="no-print mt-1 font-accent text-[10px] text-[#C0392B] opacity-80 group-hover:opacity-100">{t("result.click_expand")}</div>
                  </div>
                </button>
              </section>
            )}

            {/* PAGE 4 — Vimshottari Mahadasha timeline (120-year cycle) */}
            {result.chart?.dasha?.mahadashas && (
              <section data-pdf-page="vimshottari-dasha" className="mb-8" data-testid="premium-vimshottari">
                <div className="glass-card p-6 md:p-8">
                  <div className="ornate-divider mb-5">
                    <span className="font-accent text-xs text-[#B8860B]">Vimshottari Mahadasha · 120-Year Cycle</span>
                  </div>

                  <p className="font-body mb-4 text-sm leading-relaxed" style={{ color: "#2A1A05" }}>
                    The <strong>Vimshottari Mahadasha</strong> is Vedic astrology&apos;s master timeline: your 120-year lifespan divided into nine planetary periods
                    (Mahadashas), each unlocking a distinct chapter of karma. Your sequence is calculated from the Moon&apos;s Nakshatra at birth — determining which
                    planet rules each stage of your life and when.
                  </p>

                  {result.chart.dasha.current && (
                    <p className="font-body mb-5 text-sm" style={{ color: "#5C3A09" }}>
                      Currently running:{" "}
                      <strong style={{ color: "#2A1A05" }}>
                        {result.chart.dasha.current.mahadasha} Mahadasha
                      </strong>
                      {result.chart.dasha.current.antardasha && (
                        <>{" · "}<strong style={{ color: "#2A1A05" }}>{result.chart.dasha.current.antardasha} Antardasha</strong></>
                      )}
                      {result.chart.dasha.current.pratyantardasha && (
                        <>{" · "}<strong style={{ color: "#2A1A05" }}>{result.chart.dasha.current.pratyantardasha} Pratyantardasha</strong></>
                      )}
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[rgba(212,175,55,0.2)]">
                        <TableHead className="text-zinc-700 font-accent text-[10px]">Mahadasha Lord</TableHead>
                        <TableHead className="text-zinc-700 font-accent text-[10px]">Starts</TableHead>
                        <TableHead className="text-zinc-700 font-accent text-[10px]">Ends</TableHead>
                        <TableHead className="text-zinc-700 font-accent text-[10px]">Years</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.chart.dasha.mahadashas.map((md) => {
                        const isCurrent = md.lord === result.chart.dasha.current?.mahadasha;
                        return (
                          <TableRow
                            key={md.lord + md.start}
                            className="border-[rgba(212,175,55,0.1)]"
                            data-testid={`premium-dasha-${md.lord.toLowerCase()}`}
                            style={isCurrent ? { background: "rgba(255,140,0,0.06)" } : undefined}
                          >
                            <TableCell className="font-body" style={{ color: "#2A1A05", fontWeight: isCurrent ? 700 : 500 }}>
                              {md.lord}{isCurrent && <span className="ml-2 text-[10px] font-accent" style={{ color: "#B85C00" }}>· NOW</span>}
                            </TableCell>
                            <TableCell className="font-body" style={{ color: "#5C3A09" }}>
                              {new Date(md.start).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                            <TableCell className="font-body" style={{ color: "#5C3A09" }}>
                              {new Date(md.end).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </TableCell>
                            <TableCell className="font-body" style={{ color: "#6B3410" }}>
                              {md.years}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Planetary theme reference — companion context for the Vimshottari table */}
                  <div className="ornate-divider mt-8 mb-4">
                    <span className="font-accent text-xs text-[#B8860B]">Planetary Themes · What each period awakens</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { lord: "Sun",     sans: "Surya",   yrs: "6 yrs",  theme: "Authority, self-realization, leadership, health of father & spine." },
                      { lord: "Moon",    sans: "Chandra", yrs: "10 yrs", theme: "Emotion, comfort, receptivity, mother, mind & memory." },
                      { lord: "Mars",    sans: "Mangala", yrs: "7 yrs",  theme: "Courage, action, siblings, property disputes, surgery." },
                      { lord: "Rahu",    sans: "Rāhu",    yrs: "18 yrs", theme: "Ambition, foreign lands, obsession, sudden rise or shock." },
                      { lord: "Jupiter", sans: "Guru",    yrs: "16 yrs", theme: "Wisdom, dharma, children, teachers, prosperity, marriage." },
                      { lord: "Saturn",  sans: "Shani",   yrs: "19 yrs", theme: "Discipline, karma, endurance, service, delayed rewards." },
                      { lord: "Mercury", sans: "Budha",   yrs: "17 yrs", theme: "Intellect, communication, trade, education, adaptability." },
                      { lord: "Ketu",    sans: "Ketu",    yrs: "7 yrs",  theme: "Detachment, moksha, past-life karma, isolation, insight." },
                      { lord: "Venus",   sans: "Shukra",  yrs: "20 yrs", theme: "Love, luxury, artistry, spouse, comforts & sensory pleasure." },
                    ].map((p) => (
                      <div key={p.lord} className="rounded-md p-2.5" style={{ background: "rgba(139,94,26,0.05)", border: "1px solid rgba(139,94,26,0.12)" }}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-heading text-[13px]" style={{ color: "#2A1A05", fontWeight: 600 }}>{p.lord}</span>
                          <span className="font-accent text-[9px]" style={{ color: "#5C3A09" }}>{p.yrs}</span>
                        </div>
                        <div className="font-accent text-[8.5px] uppercase tracking-wider mb-1" style={{ color: "#5C3A09" }}>{p.sans}</div>
                        <p className="text-[10px] leading-snug font-body" style={{ color: "#5C3A09" }}>{p.theme}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* PAGE 5 — AI advice text.
                `compact` variant is required here: the reading is ~500-600
                words, which in the default (spacious) variant spans 2-3 PDF
                pages and blows past the 5-page target. Compact typography
                (0.78rem body, 1.4 line-height, tighter section margins) is
                purpose-built to keep the full reading on a single A4 page. */}
            <section data-pdf-page="advice">
              <AdviceMarkdown testId="premium-advice" compact>{result.advice}</AdviceMarkdown>
              <div className="no-print mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center">
                <Link to={`/readings/${result.id}`} className="text-[#FF9933] text-sm font-body hover:text-[#FFD700]" data-testid="premium-open-in-archive">
                  Open in archive & share →
                </Link>
              </div>
            </section>

          </div>
          </CollapsibleSection>

          {/* ================= SECTION 2 — VEDIC NUMEROLOGY REPORT ================= */}
          {(result.chart?.numerology || result.chart?.numerology_dasha) && (
          <CollapsibleSection
            title="Vedic Numerology Report"
            subtitle="Mulank · Bhagyank · Naamank · Lo Shu Grid · Current Dasha · 81-year Mahadasha"
            testId="vedic-numerology-report"
            open={numOpen}
            onToggle={() => setNumOpen((v) => !v)}
          >
          <ResultActions targetRef={numerologyRef} filename="Vedic-Numerology-Report.docx" testIdPrefix="premium-num" />
          <div ref={numerologyRef} className="mt-4 premium-card p-8 md:p-12 printable-area" data-testid="premium-numerology-report-result">
            <img src={snwLogo} alt="" className="print-watermark" />

            {/* Decorative invocation banner — opens Page 1 (parallel to Vedic Astrology Report) */}
            <GaneshaBanner />

            {/* PAGE 1 — Ganesha banner (above) + User Details + Mulank/Bhagyank/Naamank cards */}
            {result.chart?.numerology && (
              <section data-pdf-page="numerology-cover" data-testid="premium-numerology-overview">
                {/* User Details block — mirrors the Astrology Report cover but compact */}
                {inputs && (
                  <div className="mb-8 text-center">
                    <div className="font-accent text-[10px] uppercase tracking-widest mb-2" style={{ color: "#B8860B" }}>
                      Numerology Report For
                    </div>
                    <div className="font-heading text-3xl md:text-4xl" style={{ color: "#14172B", fontWeight: 600 }}>
                      {inputs.full_name || "Seeker"}
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[12px] font-body" style={{ color: "#2A1A05" }}>
                      {inputs.date_of_birth && <span><span className="font-accent text-[9px] uppercase tracking-widest mr-1" style={{ color: "#5C3A09" }}>Date</span>{inputs.date_of_birth}</span>}
                      {inputs.time_of_birth && <span><span className="font-accent text-[9px] uppercase tracking-widest mr-1" style={{ color: "#5C3A09" }}>Time</span>{inputs.time_of_birth}</span>}
                      {inputs.place_of_birth && <span><span className="font-accent text-[9px] uppercase tracking-widest mr-1" style={{ color: "#5C3A09" }}>Place</span>{inputs.place_of_birth}</span>}
                    </div>
                  </div>
                )}

                <div className="ornate-divider mb-5">
                  <span className="font-accent text-xs text-[#B8860B]">Mulank · Bhagyank · Naamank</span>
                </div>
                <p className="font-body text-sm mb-10 leading-relaxed" style={{ color: "#2A1A05" }}>
                  Vedic numerology extracts three foundational numbers from your birth data. Each is ruled by a specific
                  planet whose energy quietly colors your temperament, destiny, and public identity alongside your Kundali placements.
                </p>
                <div className="grid md:grid-cols-3 gap-4 pt-2">
                  {[
                    { key: "mulank",   entry: result.chart.numerology.mulank,   badge: "Root Number",    accent: "#B85C00" },
                    { key: "bhagyank", entry: result.chart.numerology.bhagyank, badge: "Destiny Number", accent: "#5C3A09" },
                    { key: "naamank",  entry: result.chart.numerology.naamank,  badge: "Name Number",    accent: "#5C3A09" },
                  ].filter((c) => c.entry?.number).map((c) => (
                    <div
                      key={c.key}
                      className="glass-card p-5"
                      data-testid={`premium-numerology-${c.key}`}
                    >
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-accent text-[9px] uppercase tracking-widest" style={{ color: c.accent }}>
                          {c.badge}
                        </span>
                        <span className="font-heading text-4xl" style={{ color: c.accent, fontWeight: 700, lineHeight: 1 }}>
                          {c.entry.number}
                        </span>
                      </div>
                      <div className="font-heading text-lg mb-1" style={{ color: "#2A1A05", fontWeight: 600 }}>
                        {c.entry.planet}
                        <span className="ml-2 font-body text-xs" style={{ color: "#5C3A09" }}>({c.entry.planet_english})</span>
                      </div>
                      <div className="text-[10.5px] font-body italic mb-3" style={{ color: "#5C3A09" }}>
                        {c.entry.derivation}
                      </div>
                      <p className="text-[12px] font-body leading-snug mb-3" style={{ color: "#2A1A05" }}>
                        {c.entry.traits}
                      </p>
                      <div className="space-y-1.5 text-[11px] font-body" style={{ color: "#2A1A05" }}>
                        {c.entry.gemstone && (
                          <div><span className="font-accent text-[9px] uppercase tracking-widest mr-1.5" style={{ color: "#5C3A09" }}>Gemstone</span>{c.entry.gemstone}</div>
                        )}
                        {c.entry.lucky_colors && (
                          <div><span className="font-accent text-[9px] uppercase tracking-widest mr-1.5" style={{ color: "#5C3A09" }}>Colors</span>{c.entry.lucky_colors.join(", ")}</div>
                        )}
                        {c.entry.lucky_days && (
                          <div><span className="font-accent text-[9px] uppercase tracking-widest mr-1.5" style={{ color: "#5C3A09" }}>Days</span>{c.entry.lucky_days.join(", ")}</div>
                        )}
                        {c.entry.mantra && (
                          <div><span className="font-accent text-[9px] uppercase tracking-widest mr-1.5" style={{ color: "#5C3A09" }}>Mantra</span><em>{c.entry.mantra}</em></div>
                        )}
                        {c.entry.career && (
                          <div><span className="font-accent text-[9px] uppercase tracking-widest mr-1.5" style={{ color: "#5C3A09" }}>Career</span>{c.entry.career}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {!result.chart.numerology.naamank?.number && (
                  <p className="mt-4 text-[11px] font-body italic" style={{ color: "#5C3A09" }}>
                    Naamank is calculated from your full name — enter one in the birth form to see it here.
                  </p>
                )}
              </section>
            )}

            {/* PAGE 2 — Vedic Numerology Chart · Lo Shu Grid starts a fresh page */}
            {result.chart?.numerology?.lo_shu && (
              <section data-pdf-page="numerology-chart" className="mt-10" data-testid="premium-lo-shu-grid">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#B8860B]">
                    Vedic Numerology Chart · Lo Shu Grid (Jeevan Ank Yantra)
                  </span>
                </div>
                <p className="font-body text-sm mb-5 leading-relaxed" style={{ color: "#2A1A05" }}>
                  Your date of birth digits, arranged in the ancient <em>Lo Shu magic square</em>. Numbers you carry are strengths;
                  empty cells are growth areas. Complete lines (&ldquo;arrows&rdquo;) reveal specific karmic gifts and lessons.
                </p>

                <div className="grid md:grid-cols-[auto,1fr] gap-8 items-start">
                  {/* The 3×3 grid */}
                  <div>
                    <div
                      className="grid grid-cols-3 rounded-md overflow-hidden"
                      style={{
                        width: 320,
                        border: "2px solid #5C3A09",
                        background: "#FDFBF7",
                      }}
                    >
                      {result.chart.numerology.lo_shu.grid.flat().map((cell, idx) => {
                        const filled = cell.count > 0;
                        return (
                          <div
                            key={cell.digit}
                            data-testid={`lo-shu-cell-${cell.digit}`}
                            className="relative flex flex-col items-center justify-center"
                            style={{
                              aspectRatio: "1 / 1",
                              borderRight: idx % 3 !== 2 ? "1px solid rgba(139,94,26,0.4)" : "none",
                              borderBottom: idx < 6 ? "1px solid rgba(139,94,26,0.4)" : "none",
                              background: filled ? "rgba(212,175,55,0.15)" : "rgba(139,94,26,0.03)",
                            }}
                          >
                            <div
                              className="font-heading"
                              style={{
                                fontSize: filled ? "2.4rem" : "1.6rem",
                                lineHeight: 1,
                                color: filled ? "#B85C00" : "rgba(139,94,26,0.35)",
                                fontWeight: filled ? 700 : 400,
                              }}
                            >
                              {filled
                                ? String(cell.digit).repeat(cell.count)
                                : cell.digit}
                            </div>
                            {filled && cell.count > 1 && (
                              <div
                                className="absolute top-1 right-2 font-accent text-[9px]"
                                style={{ color: "#B85C00" }}
                              >
                                ×{cell.count}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-[10.5px] font-body italic" style={{ color: "#5C3A09" }}>
                      {result.chart.numerology.lo_shu.derivation}
                    </div>
                  </div>

                  {/* Interpretation column */}
                  <div className="space-y-4">
                    <div>
                      <div className="font-accent text-[10px] uppercase tracking-widest mb-2" style={{ color: "#B85C00" }}>
                        Present Numbers · Your Strengths
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {result.chart.numerology.lo_shu.present.map((n) => (
                          <div key={n} className="flex items-baseline gap-2 text-[12px] font-body" style={{ color: "#2A1A05" }}>
                            <span
                              className="inline-flex items-center justify-center rounded-full font-heading text-[10px]"
                              style={{ width: 22, height: 22, background: "rgba(212,175,55,0.25)", color: "#B85C00", fontWeight: 700 }}
                            >
                              {n}
                            </span>
                            <span>
                              <strong style={{ color: "#5C3A09" }}>×{result.chart.numerology.lo_shu.counts[String(n)]} · </strong>
                              {result.chart.numerology.lo_shu.grid.flat().find((c) => c.digit === n)?.meaning}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {result.chart.numerology.lo_shu.missing.length > 0 && (
                      <div>
                        <div className="font-accent text-[10px] uppercase tracking-widest mb-2" style={{ color: "#5C3A09" }}>
                          Missing Numbers · Growth Areas
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {result.chart.numerology.lo_shu.missing.map((n) => (
                            <div key={n} className="flex items-baseline gap-2 text-[12px] font-body" style={{ color: "#2A1A05" }}>
                              <span
                                className="inline-flex items-center justify-center rounded-full font-heading text-[10px]"
                                style={{ width: 22, height: 22, background: "rgba(139,94,26,0.08)", color: "#5C3A09", border: "1px dashed rgba(139,94,26,0.4)", fontWeight: 500 }}
                              >
                                {n}
                              </span>
                              <span>
                                <strong style={{ color: "#5C3A09" }}>Cultivate: </strong>
                                {result.chart.numerology.lo_shu.grid.flat().find((c) => c.digit === n)?.meaning}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(result.chart.numerology.lo_shu.arrows_present.length > 0 ||
                  result.chart.numerology.lo_shu.arrows_missing.length > 0) && (
                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    {result.chart.numerology.lo_shu.arrows_present.length > 0 && (
                      <div className="rounded-md p-4" style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.35)" }}>
                        <div className="font-accent text-[10px] uppercase tracking-widest mb-3" style={{ color: "#B85C00" }}>
                          Completed Arrows · Karmic Gifts
                        </div>
                        <ul className="space-y-2.5">
                          {result.chart.numerology.lo_shu.arrows_present.map((a) => (
                            <li key={a.label} className="text-[12px] font-body" style={{ color: "#2A1A05" }}>
                              <div className="font-heading text-[13px]" style={{ color: "#5C3A09", fontWeight: 600 }}>
                                {a.label} <span className="font-accent text-[10px]" style={{ color: "#5C3A09" }}>({a.nums.join("-")})</span>
                              </div>
                              <div className="mt-0.5 leading-snug">{a.strength}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.chart.numerology.lo_shu.arrows_missing.length > 0 && (
                      <div className="rounded-md p-4" style={{ background: "rgba(139,94,26,0.05)", border: "1px dashed rgba(139,94,26,0.35)" }}>
                        <div className="font-accent text-[10px] uppercase tracking-widest mb-3" style={{ color: "#5C3A09" }}>
                          Missing Arrows · Karmic Lessons
                        </div>
                        <ul className="space-y-2.5">
                          {result.chart.numerology.lo_shu.arrows_missing.map((a) => (
                            <li key={a.label} className="text-[12px] font-body" style={{ color: "#2A1A05" }}>
                              <div className="font-heading text-[13px]" style={{ color: "#5C3A09", fontWeight: 600 }}>
                                {a.label} <span className="font-accent text-[10px]" style={{ color: "#5C3A09" }}>({a.nums.join("-")})</span>
                              </div>
                              <div className="mt-0.5 leading-snug">{a.weakness}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* PAGE 2 (cont.) — Current Numerology Dasha State packs with Lo Shu Grid above */}
            {result.chart?.numerology_dasha && (
              <section className="mt-10" data-testid="premium-numerology-dasha-current">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#B8860B]">
                    Numerology Dasha · Current State (Mulank {result.chart.mulank})
                  </span>
                </div>
                <p className="font-body text-sm mb-5" style={{ color: "#2A1A05" }}>
                  Driven by your Mulank ({result.chart.mulank}), this is your live position
                  across all four nested levels of the 81-year ank-mahadasha cycle.
                </p>
                <NumDashaCurrentTable dasha={result.chart.numerology_dasha} />
              </section>
            )}
            {/* PAGE 3 — Vedic Numerology Mahadasha · Full 81-year timeline
                Uses `data-pdf-page` so it starts on a fresh page; children stay
                intact — the pagination logic will break between whole Mahadasha
                rows (each row carries `data-pdf-soft-break` markers from inside
                NumDashaTimeline) rather than mid-row. Spacing is tightened
                (mb-4 instead of mb-10) so all 9 Mahadasha rows + the current-
                dasha banner comfortably fit on the same A4 page — otherwise
                the last row would be nudged onto page 4 by ~30-40px. */}
            {result.chart?.numerology_dasha && (
              <section data-pdf-page="numerology-mahadasha" className="mt-10" data-testid="premium-numerology-mahadasha">
                <div className="ornate-divider mb-3">
                  <span className="font-accent text-xs text-[#B8860B]">
                    Vedic Numerology Mahadasha · Full 81-year Timeline
                  </span>
                </div>
                <p className="font-body text-sm mb-4 leading-relaxed" style={{ color: "#2A1A05" }}>
                  Your complete 81-year ank-mahadasha cycle. Each row is a major life period; drill into any Mahadasha, Antardasha, Pratyantardasha, or Sookshma-dasha level to explore periods across your life.
                </p>
                <NumDashaTimeline dasha={result.chart.numerology_dasha} />
              </section>
            )}
          {/* MOVED — belongs to the Vedic Numerology Report PDF (chaldean-numerology) */}
            <section data-pdf-page={chaldeanResult ? "chaldean-numerology" : undefined} className="mt-10" data-testid="premium-chaldean-pdf-page">
{/* Chaldean Name Numerology — standalone section, always visible */}
        <div className="mt-20 fade-up" data-testid="chaldean-section">
          <div className="mb-8 no-print">
            <p className="font-accent text-xs text-[#B8860B] mb-3">{t("premium_numerology.name_section")}</p>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50">
              {t("premium_numerology.name_title_a")} <span className="text-gold-gradient italic">{t("premium_numerology.name_title_b")}</span>
            </h2>
            <p className="mt-3 font-body text-zinc-700 max-w-2xl leading-relaxed text-sm">
              {t("premium_numerology.name_intro")}
            </p>
          </div>

          <form
            onSubmit={submitChaldean}
            className="no-print glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="chaldean-form"
          >
            <div className="md:col-span-2">
              <label className="font-accent text-[10px] text-[#B8860B] block mb-2 tracking-widest uppercase">
                {t("premium_numerology.name_label")}
              </label>
              <input
                type="text"
                required
                value={chaldeanName}
                onChange={(e) => setChaldeanName(e.target.value)}
                placeholder={t("premium_numerology.name_placeholder")}
                data-testid="chaldean-input"
                className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
              />
            </div>
            <button
              type="submit"
              disabled={chaldeanLoading}
              data-testid="chaldean-calculate-btn"
              className="btn-saffron w-full md:w-auto disabled:opacity-50"
            >
              {chaldeanLoading ? t("premium_numerology.reading_btn") : t("premium_numerology.name_cta")}
            </button>
          </form>

          {chaldeanErr && (
            <div className="mt-4 text-sm text-red-400 font-body glass-card p-4" data-testid="chaldean-error">
              {chaldeanErr}
            </div>
          )}

          {chaldeanResult && (
            <div className="mt-8 space-y-6" data-testid="chaldean-result">
              {/* Letter-by-letter breakdown */}
              <div className="glass-card p-6">
                <div className="font-accent text-[10px] text-[#B8860B] tracking-widest mb-4">
                  {t("premium_numerology.letters_title")}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {chaldeanResult.letters.map((l, i) => (
                    l.space ? (
                      <div key={`sp-${i}`} className="w-3" />
                    ) : (
                      <div
                        key={`${l.letter}-${i}`}
                        className={`flex flex-col items-center justify-center w-10 h-12 rounded border ${
                          l.value != null
                            ? "border-[rgba(212,175,55,0.3)] bg-[rgba(255,153,51,0.05)]"
                            : "border-[rgba(255,255,255,0.06)] opacity-40"
                        }`}
                        data-testid={`chaldean-letter-${i}`}
                      >
                        <div className="font-heading text-lg text-zinc-100">{l.letter}</div>
                        <div className="font-accent text-[9px] text-[#FF9933]">
                          {l.value != null ? l.value : "—"}
                        </div>
                      </div>
                    )
                  ))}
                </div>
                <div className="flex items-baseline gap-4 mt-4 pt-4 border-t border-[rgba(212,175,55,0.15)]">
                  <div>
                    <div className="font-accent text-[10px] text-zinc-800 uppercase tracking-widest">Compound Total</div>
                    <div className="font-heading text-3xl text-[#B8860B]">
                      {chaldeanResult.compound_total}
                    </div>
                  </div>
                  <div className="text-zinc-800 font-heading text-2xl">→</div>
                  <div>
                    <div className="font-accent text-[10px] text-zinc-800 uppercase tracking-widest">Reduced</div>
                    <div className="font-heading text-3xl text-[#FFD700]">
                      {chaldeanResult.name_number.number}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planet profile card — reuse same look as NumberCard from Numerology page */}
              <div className="premium-card p-6 md:p-8">
                <div className="font-accent text-[10px] text-[#B8860B] mb-3 tracking-widest">
                  {chaldeanResult.name_number.label}
                </div>
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                  <div>
                    <div className="font-heading text-7xl text-[#FFD700] leading-none">
                      {chaldeanResult.name_number.number}
                    </div>
                    <div className="mt-1 font-body text-xs text-zinc-800">
                      {chaldeanResult.name_number.derivation}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-2xl text-zinc-100">
                      {chaldeanResult.name_number.planet}
                    </div>
                    <div className="font-body text-xs text-zinc-800">
                      {chaldeanResult.name_number.planet_english}
                    </div>
                  </div>
                </div>
                <p className="font-body text-zinc-200 leading-relaxed mb-5">
                  {chaldeanResult.name_number.traits}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs font-body">
                  {[
                    [t("premium_numerology.gemstone"), chaldeanResult.name_number.gemstone],
                    [t("premium_numerology.deity"), chaldeanResult.name_number.deity],
                    [t("premium_numerology.mantra"), chaldeanResult.name_number.mantra],
                    [t("premium_numerology.lucky_days"), (chaldeanResult.name_number.lucky_days || []).join(", ")],
                    [t("premium_numerology.lucky_colors"), (chaldeanResult.name_number.lucky_colors || []).join(", ")],
                    [t("premium_numerology.lucky_numbers"), (chaldeanResult.name_number.lucky_numbers || []).join(", ")],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{label}</span>
                      <span className="text-zinc-800 text-right">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(212,175,55,0.12)] grid grid-cols-1 gap-2 text-xs font-body">
                  <div>
                    <div className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{t("premium_numerology.career")}</div>
                    <div className="text-zinc-800 mt-0.5">{chaldeanResult.name_number.career}</div>
                  </div>
                  <div>
                    <div className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{t("premium_numerology.challenges")}</div>
                    <div className="text-zinc-800 mt-0.5">{chaldeanResult.name_number.challenges}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

            </section>

            {/* MOVED — belongs to the Vedic Numerology Report PDF (mobile-numerology) */}
            <section data-pdf-page={mobileResult ? "mobile-numerology" : undefined} className="mt-10" data-testid="premium-mobile-pdf-page">
{/* Mobile Number Numerology */}
        <div className="mt-20 fade-up" data-testid="mobile-numerology-section">
          <div className="mb-8 no-print">
            <p className="font-accent text-xs text-[#B8860B] mb-3">{t("premium_numerology.mobile_eyebrow")}</p>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50">
              {t("premium_numerology.mobile_title_a2")} <span className="text-gold-gradient italic">{t("premium_numerology.mobile_title_b2")}</span>
            </h2>
            <p className="mt-3 font-body text-zinc-700 max-w-2xl leading-relaxed text-sm">
              {t("premium_numerology.mobile_intro2")}
            </p>
          </div>

          <form
            onSubmit={submitMobile}
            className="no-print glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="mobile-form"
          >
            <div className="md:col-span-2">
              <label className="font-accent text-[10px] text-[#B8860B] block mb-2 tracking-widest uppercase">
                {t("premium_numerology.mobile_label")}
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t("premium_numerology.mobile_ph2")}
                data-testid="mobile-input"
                className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
              />
            </div>
            <button
              type="submit"
              disabled={mobileLoading}
              data-testid="mobile-calculate-btn"
              className="btn-saffron w-full md:w-auto disabled:opacity-50"
            >
              {mobileLoading ? t("premium_numerology.reading_btn") : t("premium_numerology.mobile_cta2")}
            </button>
          </form>

          {mobileErr && (
            <div className="mt-4 text-sm text-red-400 font-body glass-card p-4" data-testid="mobile-error">
              {mobileErr}
            </div>
          )}

          {mobileResult && (
            <div className="mt-8 grid md:grid-cols-3 gap-6" data-testid="mobile-result">
              <div className="md:col-span-2">
                <NumberCard block={mobileResult.mobile_number_ank} accent="text-[#FFD700]" />
              </div>
              <div className="glass-card p-6">
                <div className="font-accent text-[10px] text-[#B8860B] tracking-widest mb-3">
                  {t("premium_numerology.digit_comp")}
                </div>
                <div className="font-body text-sm text-zinc-800 mb-4">
                  {t("premium_numerology.number_label")} <span className="text-zinc-100 font-mono">{mobileResult.digits_used}</span>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-5">
                  {Object.entries(mobileResult.frequency).map(([d, count]) => (
                    <div
                      key={d}
                      className={`text-center p-2 rounded border ${
                        count > 0
                          ? "border-[rgba(212,175,55,0.3)] bg-[rgba(255,153,51,0.04)]"
                          : "border-[rgba(255,255,255,0.06)] opacity-40"
                      }`}
                      data-testid={`mobile-digit-${d}`}
                    >
                      <div className="font-heading text-lg text-[#FFD700]">{d}</div>
                      <div className="font-accent text-[9px] text-zinc-800 tracking-widest">
                        ×{count}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-xs font-body">
                  <div className="flex justify-between gap-3">
                    <span className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{t("premium_numerology.digit_sum")}</span>
                    <span className="text-zinc-200">{mobileResult.digit_sum}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{t("premium_numerology.dominant_digit")}</span>
                    <span className="text-zinc-200">{mobileResult.dominant_digit}</span>
                  </div>
                  {mobileResult.missing_digits.length > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="font-accent text-[9px] text-zinc-800 uppercase tracking-widest">{t("premium_numerology.missing_digits")}</span>
                      <span className="text-zinc-200">{mobileResult.missing_digits.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

            </section>


            </div>
          </CollapsibleSection>
          )}

          {/* Legacy dasha block removed — its content is now inside Section 2 above.
              (This branch is kept intentionally empty so that older references
              to `dashaRef` in props don't crash the render tree.) */}
          <div ref={dashaRef} className="hidden" aria-hidden="true" />
          </div>
        )}

                        {/* Tarot Reading — 3-card Past · Present · Future spread + AI interpretation */}
        <div className="mt-20 fade-up" data-testid="tarot-section">
          <div className="mb-8">
            <p className="font-accent text-xs text-[#B8860B] mb-3">Rider-Waite · Major Arcana</p>
            <h2 className="font-heading text-3xl md:text-4xl" style={{ color: "#14172B" }}>
              Tarot Reading — <span className="text-gold-gradient italic">Past · Present · Future</span>
            </h2>
            <p className="mt-3 font-body text-zinc-700 max-w-2xl leading-relaxed text-sm">
              Draw three cards from the Major Arcana. Optionally, hold a specific question in mind — the AI
              synthesises the spread into a warm, personal interpretation woven from the classical meanings.
            </p>
          </div>

          <form
            onSubmit={submitTarot}
            className="glass-card p-6 md:p-8 grid grid-cols-1 gap-4"
            data-testid="tarot-form"
          >
            <div>
              <label className="font-accent text-[10px] text-[#B8860B] block mb-2 tracking-widest uppercase">
                Your Question (optional)
              </label>
              <textarea
                rows={2}
                value={tarotQuestion}
                onChange={(e) => setTarotQuestion(e.target.value)}
                placeholder="e.g. What should I focus on for my career right now?"
                data-testid="tarot-question-input"
                className="w-full bg-[#FDFBF7] border border-[rgba(139,94,26,0.25)] rounded-md px-3 py-2 text-zinc-900 font-body focus:outline-none focus:border-[#FF9933] resize-none"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={tarotLoading}
                data-testid="tarot-draw-btn"
                className="btn-saffron disabled:opacity-50"
              >
                {tarotLoading ? "Shuffling the deck…" : "Draw Cards"}
              </button>
            </div>
          </form>

          {tarotErr && (
            <div className="mt-4 text-sm text-red-600 font-body glass-card p-4" data-testid="tarot-error">
              {tarotErr}
            </div>
          )}

          {tarotResult && (
            <div className="mt-8 space-y-8" data-testid="tarot-result">
              {/* The three drawn cards */}
              <div className="grid md:grid-cols-3 gap-5">
                {tarotResult.spread.map((c) => {
                  const reversed = c.orientation === "reversed";
                  return (
                    <div
                      key={c.position}
                      data-testid={`tarot-card-${c.position}`}
                      className="rounded-lg p-5 text-center"
                      style={{
                        background: "linear-gradient(155deg, #FDFBF7 0%, #F5E9D0 100%)",
                        border: "2px solid #B8860B",
                        boxShadow: "0 6px 16px rgba(139,94,26,0.12)",
                      }}
                    >
                      <div className="font-accent text-[10px] uppercase tracking-widest mb-2" style={{ color: "#B8860B" }}>
                        {c.position}
                      </div>
                      <div
                        className="font-heading mb-1"
                        style={{
                          color: reversed ? "#8B2500" : "#14172B",
                          fontSize: "1.6rem",
                          lineHeight: 1.15,
                          fontWeight: 600,
                          transform: reversed ? "rotate(180deg)" : "none",
                          display: "inline-block",
                          padding: "0.4rem 0",
                        }}
                      >
                        {c.name}
                      </div>
                      <div className="font-accent text-[9px] tracking-widest uppercase mb-3" style={{ color: reversed ? "#8B2500" : "#5C3A09" }}>
                        {c.number} · {c.orientation}
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                        {c.keywords.map((k) => (
                          <span
                            key={k}
                            className="text-[10px] font-body px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(184,134,11,0.15)", color: "#5C3A09" }}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                      <p className="text-[12px] font-body leading-snug italic" style={{ color: "#2A1A05" }}>
                        {c.meaning}
                      </p>
                      <div className="mt-3 pt-3 border-t border-[rgba(139,94,26,0.18)] font-accent text-[9px] uppercase tracking-widest" style={{ color: "#8B2500" }}>
                        {c.position_meaning}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI interpretation woven across the three cards */}
              <div className="glass-card p-6 md:p-8" data-testid="tarot-interpretation">
                <div className="ornate-divider mb-5">
                  <span className="font-accent text-xs text-[#B8860B]">
                    The Reader Speaks · Weaving Your Cards
                  </span>
                </div>
                {tarotResult.question && (
                  <p className="text-[13px] font-body italic mb-4" style={{ color: "#5C3A09" }}>
                    Your question: “{tarotResult.question}”
                  </p>
                )}
                <AdviceMarkdown>{tarotResult.interpretation}</AdviceMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
      <ExpandedKundaliModal
        open={!!expanded}
        onClose={() => setExpanded(null)}
        title={expanded?.title}
        ascendantLabel={expanded?.ascendantLabel}
        ascendantName={expanded?.ascendantName}
        chart={expanded?.chart}
        accentColor={expanded?.accentColor}
      />
    </div>
  );
}
