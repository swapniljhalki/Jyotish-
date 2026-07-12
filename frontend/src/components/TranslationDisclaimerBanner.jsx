import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "snw_translation_disclaimer_dismissed";

/**
 * Thin, dismissible banner shown at the very top of every page warning that
 * translated content (UI + AI-generated readings) is machine-generated and may
 * not be perfectly accurate. Dismissal persists for the browser session only.
 */
export default function TranslationDisclaimerBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore storage errors (private mode) */
    }
    setVisible(false);
  };

  return (
    <div
      role="alert"
      data-testid="translation-disclaimer-banner"
      className="w-full bg-[#FFF4E5] border-b border-[rgba(255,140,0,0.35)] text-[#5C3A09]"
    >
      <div className="sb-container flex items-start md:items-center gap-3 py-2.5">
        <AlertTriangle
          className="h-4 w-4 md:h-4 md:w-4 mt-0.5 md:mt-0 shrink-0 text-[#FF8C00]"
          strokeWidth={2}
          aria-hidden="true"
        />
        <p className="flex-1 text-[12px] md:text-[13px] leading-snug">
          <span className="font-semibold">{t("disclaimer.label", "Disclaimer:")}</span>{" "}
          {t(
            "disclaimer.translation",
            "This translation is generated using AI and may not be fully accurate. Please refer to the original text or seek professional translation for important purposes."
          )}
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("disclaimer.dismiss", "Dismiss")}
          data-testid="translation-disclaimer-dismiss"
          className="shrink-0 p-1 rounded-full hover:bg-[rgba(255,140,0,0.15)] transition-colors"
        >
          <X className="h-4 w-4 text-[#5C3A09]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
