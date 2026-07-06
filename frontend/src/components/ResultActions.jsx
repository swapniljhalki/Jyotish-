import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Print action for a reading result. Uses the browser's native `window.print()`
 * so the user can print the on-screen reading directly (or save as PDF via the
 * OS print dialog if they choose). No file-generation dependencies.
 */
export default function ResultActions({ testIdPrefix }) {
  const { t } = useTranslation();

  const btn =
    "inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(160,110,40,0.45)] " +
    "text-[#5C3A09] font-accent text-xs tracking-widest uppercase bg-white/60 " +
    "hover:bg-[rgba(255,153,51,0.1)] hover:border-[#D96600] transition-colors disabled:opacity-50";

  return (
    <div className="no-print flex flex-wrap justify-end gap-3" data-testid={`${testIdPrefix}-result-actions`}>
      <button type="button" onClick={() => window.print()} className={btn} data-testid={`${testIdPrefix}-print-btn`}>
        <Printer className="w-4 h-4" aria-hidden="true" />
        {t("result.print")}
      </button>
    </div>
  );
}
