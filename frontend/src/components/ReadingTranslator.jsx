import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const LANGUAGE_LABELS = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు",
  ta: "தமிழ்",
};

/**
 * On-demand reading translator toolbar.
 *
 * The reading was AI-generated in `sourceLang`. Users can request a Claude
 * translation of the advice + numerology_advice text into any supported
 * language; the result is cached in the DB so second requests are instant.
 *
 * Props:
 *   readingId    — DB id of the reading
 *   sourceLang   — language the reading was originally written in
 *   original     — { advice, numerology_advice } from the reading document
 *   preCached    — reading.translations from the server (map of lang -> payload)
 *   onView(view, payload) — called whenever the visible copy changes.
 *                           view is either "source" or a target lang code.
 *                           payload is { advice, numerology_advice } to render.
 */
export default function ReadingTranslator({
  readingId,
  sourceLang = "en",
  original,
  preCached,
  onView,
}) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState("source");
  const [translations, setTranslations] = useState(preCached || {});
  const [loading, setLoading] = useState(null); // lang currently being fetched

  // Auto-request the current UI language if it differs from the reading's
  // source — makes the "switch language then open a saved reading" flow
  // feel automatic. Runs once per reading.
  useEffect(() => {
    const ui = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
    if (ui && ui !== sourceLang && LANGUAGE_LABELS[ui] && !translations[ui]) {
      // fire and forget — user can still switch back to source manually
      fetchAndShow(ui);
    }
  }, [readingId]);

  const allLangs = useMemo(() => {
    // source first, then the three other supported languages in a stable order
    const rest = ["en", "hi", "te", "ta"].filter((l) => l !== sourceLang);
    return [sourceLang, ...rest];
  }, [sourceLang]);

  const fetchAndShow = async (lang) => {
    if (lang === sourceLang) {
      setView("source");
      onView?.("source", original);
      return;
    }
    if (translations[lang]) {
      setView(lang);
      onView?.(lang, translations[lang]);
      return;
    }
    setLoading(lang);
    try {
      const { data } = await api.post(`/readings/${readingId}/translate`, { lang });
      const payload = {
        advice: data.advice || "",
        numerology_advice: data.numerology_advice || "",
      };
      setTranslations((prev) => ({ ...prev, [lang]: payload }));
      setView(lang);
      onView?.(lang, payload);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="no-print rounded-xl border border-[rgba(160,110,40,0.35)] bg-white/70 backdrop-blur-sm px-4 py-3 mb-4"
      data-testid="reading-translator"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[#5C3A09]">
          <Languages className="h-4 w-4" strokeWidth={2} />
          <span className="font-accent text-[11px] tracking-widest uppercase">
            {t("translator.label", "View reading in")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allLangs.map((lang) => {
            const isSource = lang === sourceLang;
            const isActive = isSource ? view === "source" : view === lang;
            const isLoading = loading === lang;
            const hasCached = !isSource && !!translations[lang];
            return (
              <button
                key={lang}
                type="button"
                onClick={() => fetchAndShow(isSource ? sourceLang : lang)}
                disabled={isLoading}
                data-testid={`translator-btn-${lang}`}
                className={
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors " +
                  (isActive
                    ? "bg-[#FF8C00] border-[#FF8C00] text-white"
                    : "bg-white border-[rgba(160,110,40,0.35)] text-[#5C3A09] hover:bg-[rgba(255,140,0,0.08)]")
                }
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isActive ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                <span>{LANGUAGE_LABELS[lang] || lang.toUpperCase()}</span>
                {isSource && (
                  <span className="text-[10px] opacity-75 ml-0.5">
                    {t("translator.original", "original")}
                  </span>
                )}
                {hasCached && !isActive && !isLoading && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF8C00]" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {view !== "source" && (
        <p
          className="mt-2 text-[11px] text-[#8B5E1A] leading-snug"
          data-testid="translator-ai-notice"
        >
          {t(
            "translator.ai_notice",
            "AI-translated from the original. May not be fully accurate — switch back for the original text."
          )}
        </p>
      )}
    </div>
  );
}
