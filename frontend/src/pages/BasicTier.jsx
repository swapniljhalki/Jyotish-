import { useState, useRef } from "react";
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
import BirthDetailsSummary from "../components/BirthDetailsSummary";
import snwLogo from "../assets/snw-logo.jpg";
import { localizePlanet, localizeRashi, localizeNakshatra } from "../lib/vedicNames";

export default function BasicTier() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState(null);
  const [inputs, setInputs] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const resultRef = useRef(null);

  const submit = async (values) => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/astrology/basic", { ...values, lang: i18n.resolvedLanguage });
      setInputs(values);
      setResult(data);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const canRead = user && (user.tier === "basic" || user.tier === "premium");
  const lang = i18n.resolvedLanguage;

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]">
      <div className="sb-container sb-section">
        <div className="max-w-3xl mb-12 fade-up">
          <span className="sb-eyebrow">{t("basic.eyebrow")}</span>
          <h1 className="sb-h1">
            {t("basic.title_a")}{" "}
            <span className="italic font-medium" style={{ color: "#8B5E1A" }}>{t("basic.title_b")}</span>
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
                <Link to="/pricing?need=basic" className="text-[12px] font-medium tracking-wider uppercase text-[#8B5E1A] hover:text-[#FF8C00] transition-colors">
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
          <ResultActions targetRef={resultRef} filename="Kundali-Basic-Reading.pdf" testIdPrefix="basic" />
          <div ref={resultRef} className="mt-4 premium-card p-8 md:p-12 printable-area" data-testid="basic-result">
            <img src={snwLogo} alt="" className="print-watermark" />

            {/* PAGE 1 — Cover: birth details + Ascendant/Sun/Moon trio */}
            <section data-pdf-page="cover" className="mb-8">
              <div className="ornate-divider mb-6">
                <span className="font-accent text-xs text-[#D4AF37]">{t("result.your_reading")}</span>
              </div>
              <div className="mb-8">
                <BirthDetailsSummary inputs={inputs} testIdPrefix="basic" />
              </div>
              <div className="snw-tri">
                <div className="snw-tri-card">
                  <div className="snw-tri-label">Ascendant</div>
                  <div className="snw-tri-value asc">{localizeRashi(result.ascendant, lang)}</div>
                  {result.ascendant_sanskrit && <div className="snw-tri-sub">{result.ascendant_sanskrit}</div>}
                </div>
                <div className="snw-tri-card">
                  <div className="snw-tri-label">Sun Sign</div>
                  <div className="snw-tri-value sun">{localizeRashi(result.sun_sign, lang)}</div>
                </div>
                <div className="snw-tri-card">
                  <div className="snw-tri-label">Moon Sign</div>
                  <div className="snw-tri-value moon">{localizeRashi(result.moon_sign, lang)}</div>
                </div>
              </div>
            </section>

            {result.chart && (
              <>
                {/* PAGE 2 — Lagna D1 chart */}
                <section data-pdf-page="lagna-chart" className="mb-8">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="glass-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 rounded-md"
                    data-testid="basic-expand-kundali-d1"
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

                {/* PAGE 3 — Planetary positions */}
                <section data-pdf-page="planets" className="mb-8">
                  <div className="glass-card p-6" data-testid="basic-planet-table">
                    <div className="font-accent text-xs text-[#D4AF37] mb-4">{t("result.planetary_positions")}</div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[rgba(212,175,55,0.2)]">
                          <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_graha")}</TableHead>
                          <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_rashi")}</TableHead>
                          <TableHead className="text-zinc-400 font-accent text-[10px]">°</TableHead>
                          <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_house")}</TableHead>
                          <TableHead className="text-zinc-400 font-accent text-[10px]">{t("result.col_nakshatra")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.chart.planets.map((p) => (
                          <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                            <TableCell className="font-body text-zinc-100">{localizePlanet(p.name, lang)}</TableCell>
                            <TableCell className="font-body text-zinc-300">{localizeRashi(p.rashi_english, lang)}</TableCell>
                            <TableCell className="font-body text-zinc-400">{p.degree}°</TableCell>
                            <TableCell className="font-body" style={{ color: "#5C3A09", fontWeight: 600 }}>{p.house}</TableCell>
                            <TableCell className="font-body" style={{ color: "#6B3410" }}>{p.nakshatra ? localizeNakshatra(p.nakshatra, lang) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            )}

            {/* PAGE 4 — AI advice text */}
            <section data-pdf-page="advice">
              <div className="ornate-divider mb-4">
                <span className="font-accent text-xs text-[#D4AF37]">{t("result.your_reading")}</span>
              </div>
              <div className="font-body text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {result.advice}
              </div>
            </section>

            <div className="no-print mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center">
              <Link to={`/readings/${result.id}`} className="text-[#FF9933] text-sm font-body hover:text-[#FFD700]" data-testid="basic-open-in-archive">
                {t("result.open_archive")}
              </Link>
            </div>
          </div>
          </div>
        )}
      </div>
      <ExpandedKundaliModal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={t("result.d1_title")}
        ascendantLabel={t("result.ascendant_lagna")}
        ascendantName={result?.chart ? localizeRashi(result.chart.ascendant_english, lang) : undefined}
        chart={result?.chart}
        accentColor="#D4AF37"
      />
    </div>
  );
}
