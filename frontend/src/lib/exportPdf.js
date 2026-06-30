import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import logoUrl from "../assets/snw-logo.jpg";

const loadLogo = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });

/**
 * Temporarily expand any scrollable / overflow-hidden ancestors so html-to-image
 * captures the full content (no clipped tables, no mid-page scrollbars).
 */
function neutralizeOverflow(root) {
  const restorers = [];
  const all = [root, ...root.querySelectorAll("*")];
  for (const el of all) {
    const cs = window.getComputedStyle(el);
    if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.maxHeight !== "none") {
      restorers.push({
        el,
        overflow:   el.style.overflow,
        overflowX:  el.style.overflowX,
        overflowY:  el.style.overflowY,
        maxHeight:  el.style.maxHeight,
      });
      el.style.overflow  = "visible";
      el.style.overflowX = "visible";
      el.style.overflowY = "visible";
      el.style.maxHeight = "none";
    }
  }
  return () => {
    for (const r of restorers) {
      r.el.style.overflow  = r.overflow;
      r.el.style.overflowX = r.overflowX;
      r.el.style.overflowY = r.overflowY;
      r.el.style.maxHeight = r.maxHeight;
    }
  };
}

/**
 * Render a DOM node to a multi-page A4 PDF and trigger a download.
 *
 * Flow: capture the entire node as one tall canvas, then slice it into
 * A4-sized chunks so content flows naturally across pages.
 *
 * Layout per page:
 *   ┌── outer gold border ──────────────┐
 *   │  ┌── inner gold rule ──────────┐  │
 *   │  │                             │  │
 *   │  │     [ content slice ]       │  │
 *   │  │                             │  │
 *   │  │  ────────── Page n of N     │  │   ← footer rule + page counter
 *   │  └─────────────────────────────┘  │
 *   └───────────────────────────────────┘
 */
export async function downloadNodeAsPdf(node, filename, options = {}) {
  const theme = options.theme === "report" ? "report" : "default";
  const COLORS = theme === "report"
    ? { bg: "#FFFFFF", outerBorder: [201, 162, 39], innerBorder: [201, 162, 39], footerText: [11, 31, 58], footerInk: [11, 31, 58] }
    : { bg: "#FDFBF7", outerBorder: [184, 134, 11], innerBorder: [212, 175, 55], footerText: [139, 94, 26], footerInk: [139, 94, 26] };
  const watermarkAlpha = theme === "report" ? 0.035 : 0.06;

  const restore = neutralizeOverflow(node);
  try {
    // Higher resolution capture → crisp text & SVG charts in the PDF.
    const captureWidth = Math.max(node.offsetWidth, 1100);

    // Capture the printable node's on-screen rect BEFORE rendering so we can
    // translate each [data-pdf-page] section's DOM y-offset into canvas-pixel
    // y-offset. (toCanvas will scale by pixelRatio and the width override.)
    const nodeRect = node.getBoundingClientRect();
    const scale = captureWidth / nodeRect.width;   // CSS px → capture px

    const canvas = await toCanvas(node, {
      pixelRatio: 2,
      backgroundColor: COLORS.bg,
      cacheBust: true,
      width: captureWidth,
      style: { width: `${captureWidth}px`, maxWidth: "none", overflow: "visible" },
      filter: (n) => !(n.classList && n.classList.contains("no-print")),
    });

    // Final canvas coords are pixelRatio × capture px. Compute factor used to
    // map a CSS-px offset (from getBoundingClientRect) into canvas-px.
    const canvasYPerCssPx = canvas.height / (nodeRect.height || canvas.height);

    // Section break points (y-positions in CANVAS pixels) — start-of-section.
    // We'll use these to avoid splitting a section across two pages.
    // NOTE: the first section's top is the natural start of content (typically
    // just the printable-area's top padding worth from y=0). We deliberately
    // drop it from the break-candidate list — breaking *before* the very first
    // section would create an empty page containing only the top padding.
    const sectionStarts = Array.from(node.querySelectorAll("[data-pdf-page]"))
      .map((el) => {
        const top = el.getBoundingClientRect().top - nodeRect.top;
        return Math.round(top * canvasYPerCssPx);
      })
      .filter((y, i, arr) => y > 0 && (i === 0 || y !== arr[i - 1])) // dedupe, skip 0
      .sort((a, b) => a - b)
      .slice(1);                                                      // drop first marker
    // Intentionally suppress lint: scale is computed for clarity but not
    // strictly needed once we use the canvas/css ratio directly.
    void scale;

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Borders take a fixed band around the page; content area sits inside.
    const outerMargin   = 22;             // distance from paper edge to outer border
    const borderGap     = 6;              // gap between outer and inner gold lines
    const footerBand    = 32;             // bottom band reserved for footer
    const contentInset  = 18;             // breathing room from chrome to content

    const innerLeft   = outerMargin + borderGap + contentInset;
    const innerRight  = pageW - outerMargin - borderGap - contentInset;
    const innerTop    = outerMargin + borderGap + contentInset;
    const innerBottom = pageH - outerMargin - borderGap - footerBand - contentInset / 2;
    const imgW = innerRight - innerLeft;
    const imgH = innerBottom - innerTop;

    // Height of one PDF page expressed in source-canvas pixels
    const chunkPx = Math.floor((imgH / imgW) * canvas.width);
    const logo = await loadLogo();

    // ---------- per-page chrome (border / footer) ---------- //
    const GOLD_DARK    = [184, 134, 11];    // #B8860B
    const GOLD_LIGHT   = [212, 175, 55];    // #D4AF37
    const TEXT_DIM     = [139, 94, 26];     // dim gold for footer (#8B5E1A)

    const drawChrome = (pageIndex, totalPages) => {
      // Outer thin gold border
      pdf.setDrawColor(GOLD_DARK[0], GOLD_DARK[1], GOLD_DARK[2]);
      pdf.setLineWidth(1.2);
      pdf.rect(outerMargin, outerMargin, pageW - outerMargin * 2, pageH - outerMargin * 2);

      // Inner hairline gold border (double-line effect)
      pdf.setDrawColor(GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2]);
      pdf.setLineWidth(0.4);
      pdf.rect(
        outerMargin + borderGap,
        outerMargin + borderGap,
        pageW - (outerMargin + borderGap) * 2,
        pageH - (outerMargin + borderGap) * 2,
      );

      // Footer rule + page number (counter)
      pdf.setDrawColor(GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2]);
      pdf.setLineWidth(0.3);
      pdf.line(
        innerLeft,
        innerBottom + contentInset / 2,
        innerRight,
        innerBottom + contentInset / 2,
      );

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2]);
      pdf.setCharSpace(0.6);
      pdf.text(
        `Page ${pageIndex} of ${totalPages}`,
        pageW / 2,
        pageH - outerMargin - borderGap - 10,
        { align: "center" },
      );
      pdf.setCharSpace(0);
      pdf.setTextColor(0, 0, 0);
    };

    // ---------- page rendering ---------- //
    // First pass: render content slices only (so we know total page count).
    // Slice cut points respect [data-pdf-page] boundaries:
    //  - If a section would only PARTIALLY fit in the remaining space of the
    //    current page (i.e. its top is inside this page but its content extends
    //    beyond the page bottom AND the section as a whole could fit in a
    //    fresh page), we cut the current slice just before that section so it
    //    starts cleanly on the next page.
    const slices = [];
    let renderedPx = 0;
    while (renderedPx < canvas.height) {
      const defaultEnd = renderedPx + chunkPx;
      let cutAt = Math.min(defaultEnd, canvas.height);

      // Look for the first section start that falls strictly inside this slice
      // (not at the very top — that's where the slice begins anyway).
      const breakStart = sectionStarts.find(
        (y) => y > renderedPx + 8 && y < defaultEnd,
      );
      if (breakStart !== undefined) {
        // Always honor `data-pdf-page` markers as hard page breaks. Even when
        // the marked section itself is taller than one page, the first chunk
        // of it will start cleanly on a fresh page — which is exactly what the
        // marker is asking for.
        cutAt = breakStart;
      } else {
        // No marker inside this chunk — but check if there's a marker just
        // beyond `defaultEnd`. If it's close (within 25% of chunkPx), absorb
        // it into the current page so we don't end up emitting a tiny
        // near-empty "leftover" page between two real ones.
        const nextMarker = sectionStarts.find((y) => y >= defaultEnd);
        if (nextMarker !== undefined && nextMarker - defaultEnd < chunkPx * 0.25) {
          cutAt = nextMarker;
        }
      }

      const sliceH = Math.max(1, cutAt - renderedPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = chunkPx;                       // always full page height for consistent watermark
      const ctx = slice.getContext("2d");
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      // Subtle SNW logo watermark behind content
      if (logo) {
        const w = slice.width * 0.55;
        const h = (logo.height / logo.width) * w;
        ctx.globalAlpha = watermarkAlpha;
        ctx.drawImage(logo, (slice.width - w) / 2, (chunkPx - h) / 2, w, h);
        ctx.globalAlpha = 1;
      }
      slices.push(slice.toDataURL("image/jpeg", 0.88));
      renderedPx = cutAt;
    }

    const totalPages = slices.length;

    // Second pass: emit PDF pages with chrome that knows the total count.
    slices.forEach((dataUrl, i) => {
      const pageIndex = i + 1;
      if (pageIndex > 1) pdf.addPage();
      pdf.setFillColor(COLORS.bg);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(dataUrl, "JPEG", innerLeft, innerTop, imgW, imgH);
      drawChrome(pageIndex, totalPages);
    });

    pdf.save(filename);
  } finally {
    restore();
  }
}
