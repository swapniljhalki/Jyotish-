import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { downloadNodeAsPdf } from "../lib/exportPdf";

/**
 * Print & Download-as-PDF action buttons for a reading result.
 * `targetRef` must point to the printable result container.
 */
export default function ResultActions({ targetRef, filename, testIdPrefix, pdfTheme }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!targetRef.current || busy) return;
    setBusy(true);
    try {
      await downloadNodeAsPdf(targetRef.current, filename, { theme: pdfTheme });
      toast.success(t("result.pdf_done"));
    } catch (e) {
      console.error("PDF export failed", e);
      toast.error(t("result.pdf_fail"));
    } finally {
      setBusy(false);
    }
  };

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
      <button type="button" onClick={download} disabled={busy} className={btn} data-testid={`${testIdPrefix}-download-pdf-btn`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />}
        {busy ? t("result.preparing") : t("result.download_pdf")}
      </button>
    </div>
  );
}
