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
 * Live-text translator for AI-generated readings that are NOT persisted in the
 * database (e.g. the standalone Numerology page). Backed by the stateless
 * POST /api/translate endpoint. Translations are cached in local component
 * state — the parent should re-mount / reset it when the underlying source
 * text changes so stale cached translations aren't shown.
 *
 * Props:
 *   sourceLang — language the text was originally generated in (default "en")
 *   original   — the untranslated source text
 *   onView(view, text) — called whenever the visible copy changes.
 *                        view is either "source" or a target lang code.
 *                        text is the string to render.
 *   testIdPrefix — optional prefix for data-testid attributes
 */
export default function LiveTextTranslator({
  sourceLang = "en",
  original = "",
  onView,
  testIdPrefix = "live-translator",
}) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState("source");
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(null);

  // Reset local cache when the source text changes (e.g. user re-generates
  // the numerology reading with a different name/DOB).
  useEffect(() => {
    setTranslations({});
    setView("source");
    onView?.("source", original);
    // Auto-request current UI lang if different from source
    const ui = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
    if (ui && ui !== sourceLang && LANGUAGE_LABELS[ui] && original) {
      // fire & forget
      fetchAndShow(ui, original);
    }
  }, [original]);

  const allLangs = useMemo(() => {
    const rest = ["en", "hi", "te", "ta"].filter((l) => l !== sourceLang);
    return [sourceLang, ...rest];
  }, [sourceLang]);

  const fetchAndShow = async (lang, sourceText) => {
    const src = sourceText ?? original;
    if (lang === sourceLang) {
      setView("source");
      onView?.("source", src);
      return;
    }
    if (translations[lang]) {
      setView(lang);
      onView?.(lang, translations[lang]);
      return;
    }
    setLoading(lang);
    try {
      const { data } = await api.post("/translate", {
        text: src,
        lang,
        source_lang: sourceLang,
      });
      const translated = data.translated || "";
      setTranslations((prev) => ({ ...prev, [lang]: translated }));
      setView(lang);
      onView?.(lang, translated);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(null);
    }
  };

  if (!original) return null;

  return (
    <div
      className="no-print rounded-xl border border-[rgba(160,110,40,0.35)] bg-white/70 backdrop-blur-sm px-4 py-3 mb-4"
      data-testid={testIdPrefix}
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
                data-testid={`${testIdPrefix}-btn-${lang}`}
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
          data-testid={`${testIdPrefix}-ai-notice`}
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
