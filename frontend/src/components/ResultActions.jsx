import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { buildBasicPdf, buildPremiumAstroPdf, buildPremiumNumerologyPdf } from "../lib/pdfBuilders";

/**
 * Print + Download-PDF actions for any reading result.
 *
 * Props:
 *   testIdPrefix — for data-testid on both buttons
 *   pdfType      — "basic" | "premium-astro" | "premium-numerology"
 *                  (when omitted the Download button is hidden — used on
 *                  archive views where the reading model may be partial)
 *   reading      — the raw reading object (chart + advice + inputs). The
 *                  jsPDF builder pulls fields from here directly.
 *   inputs       — the birth-details form state (full_name, date_of_birth,
 *                  time_of_birth, place_of_birth). Optional but strongly
 *                  recommended: the reading payload from the SSE stream /
 *                  polling status doesn't always echo these back, so pass them
 *                  explicitly so the PDF cover shows the subject's name & DOB.
 *   filename     — suggested download name (extension .pdf is appended if missing)
 */
export default function ResultActions({ testIdPrefix, pdfType, reading, inputs, filename }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const BUILDERS = {
    "basic":               buildBasicPdf,
    "premium-astro":       buildPremiumAstroPdf,
    "premium-numerology":  buildPremiumNumerologyPdf,
  };

  const download = async () => {
    const builder = BUILDERS[pdfType];
    if (!builder || !reading || busy) return;
    setBusy(true);
    try {
      const doc = await builder(reading, inputs);
      const name = (filename || `Reading-${pdfType}`).toLowerCase().endsWith(".pdf")
        ? (filename || `Reading-${pdfType}.pdf`)
        : `${filename || `Reading-${pdfType}`}.pdf`;
      doc.save(name);
      toast.success("PDF ready.");
    } catch (e) {
      console.error("PDF build failed", e);
      toast.error("Could not generate PDF. Please try again.");
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
      {pdfType && reading && (
        <button type="button" onClick={download} disabled={busy} className={btn} data-testid={`${testIdPrefix}-download-pdf-btn`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />}
          {busy ? "Preparing…" : "Download PDF"}
        </button>
      )}
    </div>
  );
}
