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
 * Render a DOM node to a multi-page A4 PDF and trigger a download.
 * Uses html-to-image (SVG foreignObject rendering — handles inline SVG charts
 * and Indic scripts) and slices the resulting canvas into page-sized chunks.
 */
export async function downloadNodeAsPdf(node, filename) {
  // Capture at a fixed desktop-like width so tables never clip behind
  // scrollbars (e.g. when downloading from a phone).
  const captureWidth = Math.max(node.offsetWidth, 1024);
  const canvas = await toCanvas(node, {
    pixelRatio: 2,
    backgroundColor: "#FDFBF7",
    cacheBust: true,
    width: captureWidth,
    style: { width: `${captureWidth}px`, maxWidth: "none" },
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
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, usableH);

    renderedPx += sliceH;
    firstPage = false;
  }

  pdf.save(filename);
}
