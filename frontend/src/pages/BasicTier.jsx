import { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import BirthForm from "../components/BirthForm";
import UpgradeButton from "../components/UpgradeButton";
import KundaliChart from "../components/KundaliChart";
import ExpandedKundaliModal from "../components/ExpandedKundaliModal";
import { Maximize2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import ResultActions from "../components/ResultActions";
import ReadingCover from "../components/ReadingCover";
import AdviceMarkdown from "../components/AdviceMarkdown";
import NumberCard from "../components/NumberCard";
import GaneshaBanner from "../components/GaneshaBanner";
import snwLogo from "../assets/snw-logo.jpg";
import { localizePlanet, localizeRashi, localizeNakshatra } from "../lib/vedicNames";

export default function BasicTier() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState(null);
  const [inputs, setInputs] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const resultRef = useRef(null);

  // Chaldean Name Numerology (also accessible to Basic tier)
  const [chaldeanName, setChaldeanName] = useState("");
  const [chaldeanResult, setChaldeanResult] = useState(null);
  const [chaldeanLoading, setChaldeanLoading] = useState(false);
  const [chaldeanErr, setChaldeanErr] = useState("");

  // Mobile Number Numerology (also accessible to Basic tier)
  const [mobile, setMobile] = useState("");
  const [mobileResult, setMobileResult] = useState(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileErr, setMobileErr] = useState("");

  // Auto-prefill the Chaldean Name field from the birth-form name whenever
  // the user submits a birth reading — but never clobber a manual edit.
  useEffect(() => {
    const nameFromForm = inputs?.full_name?.trim();
    if (nameFromForm && !chaldeanName) {
      setChaldeanName(nameFromForm);
    }
  }, [inputs?.full_name, chaldeanName]);

  const submit = async (values) => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      // Stream the reading — chart arrives in the very first SSE event
      // (~1-2s), then Claude's tokens stream in as they're produced so the
      // user starts reading within a couple of seconds instead of waiting
      // 30-90s for the full response.
      setInputs(values);
      const apiBase = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "") + "/api";
      const resp = await fetch(`${apiBase}/astrology/basic/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, lang: i18n.resolvedLanguage }),
      });
      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        let detail = "";
        try { detail = formatApiError(JSON.parse(text).detail); } catch { /* not JSON */ }
        throw new Error(detail || text || `Request failed with status ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Parse Server-Sent Events: events are separated by \n\n, each event
      // has `event: <name>` and `data: <json>` lines.
      const flushEvents = () => {
        const events = [];
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          let name = "message";
          let data = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event:")) name = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (data) events.push({ name, data });
        }
        return events;
      };

      // Stream reader loop — exits via `break` when `done: true`.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        for (const ev of flushEvents()) {
          let payload;
          try { payload = JSON.parse(ev.data); } catch { continue; }
          if (ev.name === "chart") {
            setResult({ ...payload, advice: "" });
          } else if (ev.name === "delta") {
            setResult((prev) => prev ? { ...prev, advice: (prev.advice || "") + payload.text } : prev);
          } else if (ev.name === "done") {
            // Full advice already accumulated via deltas; nothing more to do.
          } else if (ev.name === "error") {
            throw new Error(payload.message || "The reading could not be generated. Please try again.");
          }
        }
      }
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const canRead = user && (user.tier === "basic" || user.tier === "premium");
  const lang = i18n.resolvedLanguage;

  const submitChaldean = async (e) => {
    e.preventDefault();
    setChaldeanErr("");
    setChaldeanResult(null);
    setChaldeanLoading(true);
    try {
      const { data } = await api.post("/numerology/chaldean-name", { full_name: chaldeanName });
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

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]">
      {/* Scrolling banner (screen-only) — hint that Numerology tools are below the form */}
      <div
        className="no-print relative overflow-hidden border-y"
        style={{
          background: "linear-gradient(90deg,#FFF2D9 0%,#FFE0B2 50%,#FFF2D9 100%)",
          borderColor: "rgba(201,162,39,0.35)",
        }}
        data-testid="basic-marquee-banner"
        role="status"
        aria-label="For Numerology Readings please scroll below"
      >
        <div className="marquee-track py-2.5 whitespace-nowrap">
          {/* Duplicated content so the loop is seamless */}
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="mx-8 font-heading text-[15px] md:text-base"
              style={{ color: "#7A1F1F", letterSpacing: "0.04em", fontWeight: 500 }}
            >
              ✦ For Numerology Readings please scroll below ✦
            </span>
          ))}
        </div>
      </div>

      <div className="sb-container sb-section">
        <div className="max-w-3xl mb-12 fade-up">
          <span className="sb-eyebrow">{t("basic.eyebrow")}</span>
          <h1 className="sb-h1">
            {t("basic.title_a")}{" "}
            <span className="italic font-medium" style={{ color: "#5C3A09" }}>{t("basic.title_b")}</span>
          </h1>
          <p className="sb-lead mt-6">
            {t("basic.intro")}
          </p>
        </div>

        {!canRead ? (
          <div className="sb-card sb-card-hover text-center max-w-2xl mx-auto fade-up" data-testid="basic-upgrade-notice">
            <div className="sb-eyebrow">{t("basic.tier_required")}</div>
            <h3 className="font-heading font-bold text-3xl md:text-4xl text-[#2A1A05] mb-4 tracking-tight">{t("basic.unlock_title")}</h3>
            <p className="text-[15px] text-[#6B3410] leading-relaxed mb-8 max-w-md mx-auto">
              {t("basic.unlock_blurb")}
            </p>
            {user ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <UpgradeButton tier="basic" data-testid="basic-upgrade-btn" />
                <Link to="/pricing?need=basic" className="text-[12px] font-medium tracking-wider uppercase text-[#5C3A09] hover:text-[#FF8C00] transition-colors">
                  {t("common.compare_all_tiers")}
                </Link>
              </div>
            ) : (
              <Link to="/login">
                <button className="sb-btn-primary" data-testid="basic-upgrade-btn">{t("common.sign_in_to_upgrade")}</button>
              </Link>
            )}
          </div>
        ) : (
          <div className="sb-card max-w-2xl mx-auto fade-up">
            <BirthForm onSubmit={submit} loading={loading} cta={t("basic.cta_cast")} testIdPrefix="basic" />
            {err && <div className="mt-4 text-sm text-red-600 font-medium" data-testid="basic-error">{err}</div>}
          </div>
        )}

        {result && (
          <div className="mt-10 fade-up">
          <ResultActions testIdPrefix="basic" />

          {/* On-screen result — also used as the PDF capture target */}
          <div ref={resultRef} className="mt-4 premium-card p-8 md:p-12 printable-area" data-testid="basic-result">
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
                testIdPrefix="basic"
              />
            </section>

            {result.chart && (
              <>
                {/* PAGE 1 (cont.) — Nakshatra Report packs with cover */}
                {result.chart.nakshatra_report && (
                  <section className="mb-8" data-testid="basic-nakshatra-report">
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
                    data-testid="basic-expand-kundali-d1"
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
                  <div className="glass-card p-6" data-testid="basic-planet-table">
                    <div className="font-accent text-xs text-[#B8860B] mb-4">{t("result.planetary_positions")}</div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[rgba(212,175,55,0.2)]">
                          <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_graha")}</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_rashi")}</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">°</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_house")}</TableHead>
                          <TableHead className="text-zinc-700 font-accent text-[10px]">{t("result.col_nakshatra")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.chart.planets.map((p) => (
                          <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                            <TableCell className="font-body text-zinc-100">{localizePlanet(p.name, lang)}</TableCell>
                            <TableCell className="font-body text-zinc-800">{localizeRashi(p.rashi_english, lang)}</TableCell>
                            <TableCell className="font-body text-zinc-700">{p.degree}°</TableCell>
                            <TableCell className="font-body" style={{ color: "#5C3A09", fontWeight: 600 }}>{p.house}</TableCell>
                            <TableCell className="font-body" style={{ color: "#6B3410" }}>{p.nakshatra ? localizeNakshatra(p.nakshatra, lang) : "—"}</TableCell>
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
                      data-testid="basic-expand-kundali-chandra"
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
                      data-testid="basic-expand-kundali-navamsha"
                      aria-label="Expand Navamsha D9 Chart"
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
              </>
            )}

            {/* PAGE 4 — AI advice text (no leading divider label per request) */}
            <section data-pdf-page="advice">
              {result.advice ? (
                <AdviceMarkdown testId="basic-advice">{result.advice}</AdviceMarkdown>
              ) : (
                <div
                  className="font-body text-sm py-6 text-center flex items-center justify-center gap-3"
                  style={{ color: "#5C3A09" }}
                  data-testid="basic-advice-pending"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full animate-pulse"
                    style={{ background: "#B8860B" }}
                  />
                  Weaving your reading — words will appear as our Jyotishi AI writes them…
                </div>
              )}
            </section>

            <div className="no-print mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center">
              <Link to={`/readings/${result.id}`} className="text-[#FF9933] text-sm font-body hover:text-[#FFD700]" data-testid="basic-open-in-archive">
                {t("result.open_archive")}
              </Link>
            </div>
          </div>
          </div>
        )}

        {/* Chaldean Name Numerology — also available to Basic tier */}
        {canRead && (
        <div className="mt-20 fade-up" data-testid="basic-chaldean-section">
          <div className="mb-8">
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
            className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="basic-chaldean-form"
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
                data-testid="basic-chaldean-input"
                className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
              />
            </div>
            <button
              type="submit"
              disabled={chaldeanLoading}
              data-testid="basic-chaldean-calculate-btn"
              className="btn-saffron w-full md:w-auto disabled:opacity-50"
            >
              {chaldeanLoading ? t("premium_numerology.reading_btn") : t("premium_numerology.name_cta")}
            </button>
          </form>

          {chaldeanErr && (
            <div className="mt-4 text-sm text-red-400 font-body glass-card p-4" data-testid="basic-chaldean-error">
              {chaldeanErr}
            </div>
          )}

          {chaldeanResult && (
            <div className="mt-8 space-y-6" data-testid="basic-chaldean-result">
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
                        data-testid={`basic-chaldean-letter-${i}`}
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
        )}

        {/* Mobile Number Numerology — also available to Basic tier */}
        {canRead && (
        <div className="mt-20 fade-up" data-testid="basic-mobile-numerology-section">
          <div className="mb-8">
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
            className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="basic-mobile-form"
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
                data-testid="basic-mobile-input"
                className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
              />
            </div>
            <button
              type="submit"
              disabled={mobileLoading}
              data-testid="basic-mobile-calculate-btn"
              className="btn-saffron w-full md:w-auto disabled:opacity-50"
            >
              {mobileLoading ? t("premium_numerology.reading_btn") : t("premium_numerology.mobile_cta2")}
            </button>
          </form>

          {mobileErr && (
            <div className="mt-4 text-sm text-red-400 font-body glass-card p-4" data-testid="basic-mobile-error">
              {mobileErr}
            </div>
          )}

          {mobileResult && (
            <div className="mt-8 grid md:grid-cols-3 gap-6" data-testid="basic-mobile-result">
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
                      data-testid={`basic-mobile-digit-${d}`}
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
        )}
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
