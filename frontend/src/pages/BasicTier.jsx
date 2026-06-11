import { useState } from "react";
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

export default function BasicTier() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const submit = async (values) => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/astrology/basic", { ...values, lang: i18n.resolvedLanguage });
      setResult(data);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const canRead = user && (user.tier === "basic" || user.tier === "premium");

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-10 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">{t("basic.eyebrow")}</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            {t("basic.title_a")} <span className="text-gold-gradient italic">{t("basic.title_b")}</span>
          </h1>
          <p className="mt-4 font-body text-zinc-400 max-w-2xl leading-relaxed">
            {t("basic.intro")}
          </p>
        </div>

        {!canRead ? (
          <div className="glass-card p-10 text-center fade-up" data-testid="basic-upgrade-notice">
            <div className="font-accent text-xs text-[#D4AF37] mb-3">{t("basic.tier_required")}</div>
            <h3 className="font-heading text-3xl text-zinc-50 mb-3">{t("basic.unlock_title")}</h3>
            <p className="font-body text-zinc-400 mb-6">
              {t("basic.unlock_blurb")}
            </p>
            {user ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <UpgradeButton tier="basic" data-testid="basic-upgrade-btn" />
                <Link to="/pricing?need=basic" className="text-xs text-[#D4AF37] underline-offset-4 hover:underline font-accent">
                  {t("common.compare_all_tiers")}
                </Link>
              </div>
            ) : (
              <Link to="/login">
                <button className="btn-saffron" data-testid="basic-upgrade-btn">{t("common.sign_in_to_upgrade")}</button>
              </Link>
            )}
          </div>
        ) : (
          <div className="glass-card p-8 md:p-10 fade-up">
            <BirthForm onSubmit={submit} loading={loading} cta={t("basic.cta_cast")} testIdPrefix="basic" />
            {err && <div className="mt-4 text-sm text-red-400 font-body" data-testid="basic-error">{err}</div>}
          </div>
        )}

        {result && (
          <div className="mt-10 premium-card p-8 md:p-12 fade-up" data-testid="basic-result">
            <div className="ornate-divider mb-6">
              <span className="font-accent text-xs text-[#D4AF37]">Your Reading</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div>
                <div className="font-accent text-[10px] text-zinc-500">Ascendant</div>
                <div className="font-heading text-xl text-[#FFD700]">{result.ascendant}</div>
                <div className="font-body text-xs text-zinc-500">{result.ascendant_sanskrit}</div>
              </div>
              <div>
                <div className="font-accent text-[10px] text-zinc-500">Sun Sign</div>
                <div className="font-heading text-xl text-[#FF9933]">{result.sun_sign}</div>
              </div>
              <div>
                <div className="font-accent text-[10px] text-zinc-500">Moon Sign</div>
                <div className="font-heading text-xl text-[#D4AF37]">{result.moon_sign}</div>
              </div>
            </div>
            {result.chart && (
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="glass-card p-6 text-left w-full group relative transition-transform hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60 rounded-md"
                  data-testid="basic-expand-kundali-d1"
                  aria-label="Expand Kundali Lagna Chart"
                >
                  <Maximize2 className="absolute top-3 right-3 w-4 h-4 text-[#D4AF37] opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  <div className="ornate-divider mb-4">
                    <span className="font-accent text-xs text-[#D4AF37]">Kundali Lagna Chart · D1</span>
                  </div>
                  <KundaliChart chart={result.chart} />
                  <div className="mt-4 text-center">
                    <div className="font-accent text-[10px] text-zinc-500">Ascendant (Lagna)</div>
                    <div className="font-heading text-2xl text-[#FFD700]">
                      {result.chart.ascendant_english}
                    </div>
                    <div className="mt-1 font-accent text-[10px] text-[#C0392B] opacity-80 group-hover:opacity-100">Click to expand</div>
                  </div>
                </button>

                <div className="glass-card p-6" data-testid="basic-planet-table">
                  <div className="font-accent text-xs text-[#D4AF37] mb-4">Planetary Positions</div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[rgba(212,175,55,0.2)]">
                        <TableHead className="text-zinc-400 font-accent text-[10px]">Graha</TableHead>
                        <TableHead className="text-zinc-400 font-accent text-[10px]">Rashi</TableHead>
                        <TableHead className="text-zinc-400 font-accent text-[10px]">°</TableHead>
                        <TableHead className="text-zinc-400 font-accent text-[10px]">House</TableHead>
                        <TableHead className="text-zinc-400 font-accent text-[10px]">Nakshatra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.chart.planets.map((p) => (
                        <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                          <TableCell className="font-body text-zinc-100">{p.name}</TableCell>
                          <TableCell className="font-body text-zinc-300">{p.rashi_english}</TableCell>
                          <TableCell className="font-body text-zinc-400">{p.degree}°</TableCell>
                          <TableCell className="font-body text-[#FFD700]">{p.house}</TableCell>
                          <TableCell className="font-body text-[#D4AF37]">{p.nakshatra || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="font-body text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {result.advice}
            </div>
            <div className="mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center">
              <Link to={`/readings/${result.id}`} className="text-[#FF9933] text-sm font-body hover:text-[#FFD700]" data-testid="basic-open-in-archive">
                Open in archive & share →
              </Link>
            </div>
          </div>
        )}
      </div>
      <ExpandedKundaliModal
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Kundali Lagna Chart · D1"
        ascendantLabel="Ascendant (Lagna)"
        ascendantName={result?.chart?.ascendant_english}
        chart={result?.chart}
        accentColor="#D4AF37"
      />
    </div>
  );
}
