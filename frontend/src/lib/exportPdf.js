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
export async function downloadNodeAsPdf(node, filename) {
  const restore = neutralizeOverflow(node);
  try {
    // Higher resolution capture → crisp text & SVG charts in the PDF.
    const captureWidth = Math.max(node.offsetWidth, 1100);
    const canvas = await toCanvas(node, {
      pixelRatio: 3,
      backgroundColor: "#FDFBF7",
      cacheBust: true,
      width: captureWidth,
      style: { width: `${captureWidth}px`, maxWidth: "none", overflow: "visible" },
      filter: (n) => !(n.classList && n.classList.contains("no-print")),
    });

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
    const slices = [];
    let renderedPx = 0;
    while (renderedPx < canvas.height) {
      const sliceH = Math.min(chunkPx, canvas.height - renderedPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = chunkPx;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#FDFBF7";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      // Subtle SNW logo watermark behind content
      if (logo) {
        const w = slice.width * 0.55;
        const h = (logo.height / logo.width) * w;
        ctx.globalAlpha = 0.06;
        ctx.drawImage(logo, (slice.width - w) / 2, (chunkPx - h) / 2, w, h);
        ctx.globalAlpha = 1;
      }
      slices.push(slice.toDataURL("image/png"));
      renderedPx += sliceH;
    }

    const totalPages = slices.length;

    // Second pass: emit PDF pages with chrome that knows the total count.
    slices.forEach((dataUrl, i) => {
      const pageIndex = i + 1;
      if (pageIndex > 1) pdf.addPage();
      pdf.setFillColor("#FDFBF7");
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(dataUrl, "PNG", innerLeft, innerTop, imgW, imgH);
      drawChrome(pageIndex, totalPages);
    });

    pdf.save(filename);
  } finally {
    restore();
  }
}
