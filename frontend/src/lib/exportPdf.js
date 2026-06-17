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
 * A4-sized chunks so content flows naturally across pages (no forced
 * one-section-per-page breaks).
 */
export async function downloadNodeAsPdf(node, filename) {
  const restore = neutralizeOverflow(node);
  try {
    const captureWidth = Math.max(node.offsetWidth, 1024);
    const canvas = await toCanvas(node, {
      pixelRatio: 2,
      backgroundColor: "#FDFBF7",
      cacheBust: true,
      width: captureWidth,
      style: { width: `${captureWidth}px`, maxWidth: "none", overflow: "visible" },
      filter: (n) => !(n.classList && n.classList.contains("no-print")),
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const imgW = pageW - margin * 2;
    const usableH = pageH - margin * 2;

    // Height of one PDF page expressed in source-canvas pixels
    const chunkPx = Math.floor((usableH / imgW) * canvas.width);
    const logo = await loadLogo();

    // Page header: faded sky-blue brand wordmark drawn on every PDF page.
    const HEADER_TEXT = "Satish Numero World";
    const HEADER_COLOR = [135, 206, 235]; // sky blue (#87CEEB)
    const HEADER_OPACITY = 0.35;
    const drawPageHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(HEADER_COLOR[0], HEADER_COLOR[1], HEADER_COLOR[2]);
      pdf.setCharSpace(2);
      if (typeof pdf.setGState === "function") {
        pdf.setGState(pdf.GState({ opacity: HEADER_OPACITY }));
      }
      // Vertically centered in the top margin band
      pdf.text(HEADER_TEXT, pageW / 2, margin - 8, { align: "center", baseline: "middle" });
      // Reset for subsequent drawing
      if (typeof pdf.setGState === "function") {
        pdf.setGState(pdf.GState({ opacity: 1 }));
      }
      pdf.setCharSpace(0);
      pdf.setTextColor(0, 0, 0);
    };

    let renderedPx = 0;
    let firstPage = true;
    while (renderedPx < canvas.height) {
      const sliceH = Math.min(chunkPx, canvas.height - renderedPx);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = chunkPx; // full page height so the watermark is centred consistently
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#FDFBF7";
      ctx.fillRect(0, 0, slice.width, slice.height);

      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      // Logo watermark on every page (low alpha so it reads as background)
      if (logo) {
        const w = slice.width * 0.55;
        const h = (logo.height / logo.width) * w;
        ctx.globalAlpha = 0.08;
        ctx.drawImage(logo, (slice.width - w) / 2, (chunkPx - h) / 2, w, h);
        ctx.globalAlpha = 1;
      }

      if (!firstPage) pdf.addPage();
      // Paint the full page cream so the brand header band matches the
      // captured content background.
      pdf.setFillColor("#FDFBF7");
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, usableH);
      drawPageHeader();

      renderedPx += sliceH;
      firstPage = false;
    }

    pdf.save(filename);
  } finally {
    restore();
  }
}
