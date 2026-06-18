import { useState, useRef } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import BirthForm from "../components/BirthForm";
import KundaliChart from "../components/KundaliChart";
import ExpandedKundaliModal from "../components/ExpandedKundaliModal";
import { Maximize2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import PlanetStates from "../components/PlanetStates";
import NumDashaTimeline from "../components/NumDashaTimeline";
import NumberCard from "../components/NumberCard";
import UpgradeButton from "../components/UpgradeButton";
import ResultActions from "../components/ResultActions";
import ReadingCover from "../components/ReadingCover";
import snwLogo from "../assets/snw-logo.jpg";
import { localizePlanet, localizeRashi, localizeNakshatra } from "../lib/vedicNames";

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

  // Expanded Kundali Modal
  const [expanded, setExpanded] = useState(null); // { title, ascendantLabel, ascendantName, chart, accentColor }
  const resultRef = useRef(null);
  const lang = i18n.resolvedLanguage;

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

  const canRead = user && user.tier === "premium";

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]">
      <div className="sb-container sb-section">
        <div className="max-w-3xl mb-12 fade-up">
          <span className="sb-eyebrow">{t("premium.eyebrow")}</span>
          <h1 className="sb-h1">
            {t("premium.title_a")}{" "}
            <span className="italic font-medium" style={{ color: "#8B5E1A" }}>{t("premium.title_b")}</span>
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
                <Link to="/pricing?need=premium" className="text-[12px] font-medium tracking-wider uppercase text-[#D4AF37] hover:text-[#FF8C00] transition-colors">
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
          <ResultActions targetRef={resultRef} filename="Kundali-Premium-Reading.pdf" testIdPrefix="premium" />
          <div ref={resultRef} className="mt-4 space-y-8 printable-area" data-testid="premium-result">
            <img src={snwLogo} alt="" className="print-watermark" />

            {/* PAGE 1 — Cover: name + birth details + Ascendant/Sun/Moon */}
            <section data-pdf-page="cover">
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

            {/* PAGE 2 — D1 Lagna chart */}
            <section data-pdf-page="lagna-chart">
              <button
                type="button"
                onClick={() => setExpanded({
                  title: t("result.d1_title"),
                  ascendantLabel: t("result.ascendant_lagna"),
                  ascendantName: localizeRashi(result.chart.ascendant_english, lang),
                  chart: result.chart,
                  accentColor: "#D4AF37",
                })}
                className="premium-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 rounded-md"
                data-testid="expand-kundali-d1"
                aria-label="Expand Kundali Lagna Chart"
              >
                <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#D4AF37] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">{t("result.d1_title")}</span>
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
            {result.chart.chandra && (
              <section data-pdf-page="chandra-chart"><button
                type="button"
                onClick={() => setExpanded({
                  title: t("result.chandra_title"),
                  ascendantLabel: t("result.chandra_lagna"),
                  ascendantName: localizeRashi(result.chart.chandra.ascendant_english, lang),
                  chart: result.chart.chandra,
                  accentColor: "#FF9933",
                })}
                className="premium-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF9933]/60 rounded-md"
                data-testid="expand-kundali-chandra"
                aria-label="Expand Chandra Rashi Chart"
              >
                <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#FF9933] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">{t("result.chandra_title")}</span>
                </div>
                <KundaliChart chart={result.chart.chandra} large />
                <div className="mt-4 text-center">
                  <div className="pdf-eyebrow">{t("result.chandra_lagna")}</div>
                  <div className="font-heading text-2xl" style={{ color: "#8B2500", fontWeight: 600 }}>
                    {localizeRashi(result.chart.chandra.ascendant_english, lang)}
                  </div>
                  <div className="no-print mt-1 font-accent text-[10px] text-[#C0392B] opacity-80 group-hover:opacity-100">{t("result.click_expand")}</div>
                </div>
              </button></section>
            )}
            {result.chart.navamsha && (
              <section data-pdf-page="navamsha-chart"><button
                type="button"
                onClick={() => setExpanded({
                  title: t("result.navamsha_title"),
                  ascendantLabel: t("result.navamsha_asc"),
                  ascendantName: localizeRashi(result.chart.navamsha.ascendant_english, lang),
                  chart: result.chart.navamsha,
                  accentColor: "#D4AF37",
                })}
                className="premium-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 rounded-md"
                data-testid="expand-kundali-navamsha"
                aria-label="Expand Navamsha Chart D9"
              >
                <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#D4AF37] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">Navamsha Chart · D9</span>
                </div>
                <KundaliChart chart={result.chart.navamsha} large />
                <div className="mt-4 text-center">
                  <div className="pdf-eyebrow">{t("result.navamsha_asc")}</div>
                  <div className="font-heading text-2xl" style={{ color: "#6B3410", fontWeight: 600 }}>
                    {localizeRashi(result.chart.navamsha.ascendant_english, lang)}
                  </div>
                  <div className="no-print mt-1 font-accent text-[10px] text-[#C0392B] opacity-80 group-hover:opacity-100">{t("result.click_expand")}</div>
                </div>
              </button></section>
            )}

            <section data-pdf-page="planets">
              <div className="glass-card p-6">
                <div className="font-accent text-xs text-[#D4AF37] mb-4">{t("result.planetary_positions")}</div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(212,175,55,0.2)]">
                      <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_graha")}</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_rashi")}</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">°</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_house")}</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_navamsha")}</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_states")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.chart.planets.map((p) => (
                      <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                        <TableCell className="font-body text-zinc-100">
                          {localizePlanet(p.name, lang)}
                        </TableCell>
                        <TableCell className="font-body text-zinc-300">{localizeRashi(p.rashi_english, lang)}</TableCell>
                        <TableCell className="font-body text-zinc-400">{p.degree}°</TableCell>
                        <TableCell className="font-body text-[#FFD700]">{p.house}</TableCell>
                        <TableCell className="font-body text-[#D4AF37]">{p.navamsha_sign_english ? localizeRashi(p.navamsha_sign_english, lang) : "—"}</TableCell>
                        <TableCell>
                          <PlanetStates states={p.states} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section data-pdf-page="advice">
              <div className="premium-card p-6 md:p-8">
                <div className="ornate-divider mb-6">
                  <span className="font-accent text-xs text-[#D4AF37]">{t("result.detailed_reading")}</span>
                </div>
                <div
                  className="font-body text-zinc-200 leading-relaxed whitespace-pre-wrap prose"
                  style={{ lineHeight: 1.8 }}
                >
                  {result.advice}
                </div>
                <div className="no-print mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center">
                  <Link to={`/readings/${result.id}`} className="text-[#FF9933] text-sm font-body hover:text-[#FFD700]" data-testid="premium-open-in-archive">
                    Open in archive & share →
                  </Link>
                </div>
              </div>
            </section>

            {result.chart.numerology_dasha && (
              <section data-pdf-page="dasha"><div className="premium-card p-6 md:p-8">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">
                    Numerology Dasha · 81-year ank cycle (Mulank {result.chart.mulank})
                  </span>
                </div>
                <p className="font-body text-zinc-400 text-sm mb-4 max-w-3xl">
                  Driven by your Mulank ({result.chart.mulank}), this 81-year cycle of nine
                  ank-mahadashas tracks the numerological vibration of your unfolding life.
                </p>
                <NumDashaTimeline dasha={result.chart.numerology_dasha} />
              </div></section>
            )}
          </div>
          </div>
        )}

        {/* Chaldean Name Numerology — standalone section, always visible */}
        <div className="mt-20 fade-up" data-testid="chaldean-section">
          <div className="mb-8">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">{t("premium_numerology.name_section")}</p>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50">
              {t("premium_numerology.name_title_a")} <span className="text-gold-gradient italic">{t("premium_numerology.name_title_b")}</span>
            </h2>
            <p className="mt-3 font-body text-zinc-400 max-w-2xl leading-relaxed text-sm">
              {t("premium_numerology.name_intro")}
            </p>
          </div>

          <form
            onSubmit={submitChaldean}
            className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="chaldean-form"
          >
            <div className="md:col-span-2">
              <label className="font-accent text-[10px] text-[#D4AF37] block mb-2 tracking-widest uppercase">
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
                <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest mb-4">
                  {t("premium_numerology.letters_title")}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {chaldeanResult.letters.map((l, i) => (
                    l.space ? (
                      <div key={i} className="w-3" />
                    ) : (
                      <div
                        key={i}
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
                    <div className="font-accent text-[10px] text-zinc-500 uppercase tracking-widest">Compound Total</div>
                    <div className="font-heading text-3xl text-[#D4AF37]">
                      {chaldeanResult.compound_total}
                    </div>
                  </div>
                  <div className="text-zinc-500 font-heading text-2xl">→</div>
                  <div>
                    <div className="font-accent text-[10px] text-zinc-500 uppercase tracking-widest">Reduced</div>
                    <div className="font-heading text-3xl text-[#FFD700]">
                      {chaldeanResult.name_number.number}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planet profile card — reuse same look as NumberCard from Numerology page */}
              <div className="premium-card p-6 md:p-8">
                <div className="font-accent text-[10px] text-[#D4AF37] mb-3 tracking-widest">
                  {chaldeanResult.name_number.label}
                </div>
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                  <div>
                    <div className="font-heading text-7xl text-[#FFD700] leading-none">
                      {chaldeanResult.name_number.number}
                    </div>
                    <div className="mt-1 font-body text-xs text-zinc-500">
                      {chaldeanResult.name_number.derivation}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-2xl text-zinc-100">
                      {chaldeanResult.name_number.planet}
                    </div>
                    <div className="font-body text-xs text-zinc-500">
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
                      <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{label}</span>
                      <span className="text-zinc-300 text-right">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(212,175,55,0.12)] grid grid-cols-1 gap-2 text-xs font-body">
                  <div>
                    <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{t("premium_numerology.career")}</div>
                    <div className="text-zinc-300 mt-0.5">{chaldeanResult.name_number.career}</div>
                  </div>
                  <div>
                    <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{t("premium_numerology.challenges")}</div>
                    <div className="text-zinc-300 mt-0.5">{chaldeanResult.name_number.challenges}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Number Numerology */}
        <div className="mt-20 fade-up" data-testid="mobile-numerology-section">
          <div className="mb-8">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">{t("premium_numerology.mobile_eyebrow")}</p>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50">
              {t("premium_numerology.mobile_title_a2")} <span className="text-gold-gradient italic">{t("premium_numerology.mobile_title_b2")}</span>
            </h2>
            <p className="mt-3 font-body text-zinc-400 max-w-2xl leading-relaxed text-sm">
              {t("premium_numerology.mobile_intro2")}
            </p>
          </div>

          <form
            onSubmit={submitMobile}
            className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="mobile-form"
          >
            <div className="md:col-span-2">
              <label className="font-accent text-[10px] text-[#D4AF37] block mb-2 tracking-widest uppercase">
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
                <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest mb-3">
                  {t("premium_numerology.digit_comp")}
                </div>
                <div className="font-body text-sm text-zinc-300 mb-4">
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
                      <div className="font-accent text-[9px] text-zinc-500 tracking-widest">
                        ×{count}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-xs font-body">
                  <div className="flex justify-between gap-3">
                    <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{t("premium_numerology.digit_sum")}</span>
                    <span className="text-zinc-200">{mobileResult.digit_sum}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{t("premium_numerology.dominant_digit")}</span>
                    <span className="text-zinc-200">{mobileResult.dominant_digit}</span>
                  </div>
                  {mobileResult.missing_digits.length > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{t("premium_numerology.missing_digits")}</span>
                      <span className="text-zinc-200">{mobileResult.missing_digits.join(", ")}</span>
                    </div>
                  )}
                </div>
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
