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

const CAPTURE_OPTS = {
  pixelRatio: 2,
  backgroundColor: "#FDFBF7",
  cacheBust: true,
  filter: (n) => !(n.classList && n.classList.contains("no-print")),
};

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

/** Add a single canvas (rendered from a DOM section) as one PDF page. */
function addCanvasAsPage(pdf, canvas, logo, isFirst) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;

  // Scale-to-fit (preserving aspect ratio) so the entire section lands on one page.
  const ratio = canvas.width / canvas.height;
  let drawW = maxW;
  let drawH = drawW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * ratio;
  }
  const offsetX = (pageW - drawW) / 2;
  const offsetY = (pageH - drawH) / 2;

  if (!isFirst) pdf.addPage();

  // Subtle centred logo watermark on every page
  if (logo) {
    const wmW = pageW * 0.55;
    const wmH = (logo.height / logo.width) * wmW;
    // Use jsPDF's gstate for opacity (newer versions support this)
    if (typeof pdf.setGState === "function") {
      const gs = pdf.GState({ opacity: 0.06 });
      pdf.setGState(gs);
      pdf.addImage(logo, "JPEG", (pageW - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
      pdf.setGState(pdf.GState({ opacity: 1 }));
    }
  }

  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", offsetX, offsetY, drawW, drawH);
}

/**
 * Render a DOM node to a multi-page A4 PDF and trigger a download.
 *
 * If the node has children with `data-pdf-page` attributes, each is rendered as
 * its own dedicated page (scale-to-fit, no clipping, no scrollbars). Otherwise
 * the entire node is sliced into A4-sized chunks.
 */
export async function downloadNodeAsPdf(node, filename) {
  const restore = neutralizeOverflow(node);
  const logo = await loadLogo();
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  try {
    const sections = Array.from(node.querySelectorAll("[data-pdf-page]"));

    if (sections.length > 0) {
      // Section-aware rendering: one PDF page per marked section.
      const captureWidth = Math.max(node.offsetWidth, 880);
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const canvas = await toCanvas(section, {
          ...CAPTURE_OPTS,
          width: captureWidth,
          style: { width: `${captureWidth}px`, maxWidth: "none", overflow: "visible" },
        });
        addCanvasAsPage(pdf, canvas, logo, i === 0);
      }
    } else {
      // Fallback: continuous render then slice into A4-sized chunks.
      const captureWidth = Math.max(node.offsetWidth, 1024);
      const canvas = await toCanvas(node, {
        ...CAPTURE_OPTS,
        width: captureWidth,
        style: { width: `${captureWidth}px`, maxWidth: "none" },
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const imgW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const chunkPx = Math.floor((usableH / imgW) * canvas.width);

      let renderedPx = 0;
      let firstPage = true;
      while (renderedPx < canvas.height) {
        const sliceH = Math.min(chunkPx, canvas.height - renderedPx);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = chunkPx;
        const ctx = slice.getContext("2d");
        ctx.fillStyle = "#FDFBF7";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (logo) {
          const w = slice.width * 0.55;
          const h = (logo.height / logo.width) * w;
          ctx.globalAlpha = 0.08;
          ctx.drawImage(logo, (slice.width - w) / 2, (chunkPx - h) / 2, w, h);
          ctx.globalAlpha = 1;
        }

        if (!firstPage) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, usableH);
        renderedPx += sliceH;
        firstPage = false;
      }
    }

    pdf.save(filename);
  } finally {
    restore();
  }
}
