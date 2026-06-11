import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Render a DOM node to a multi-page A4 PDF and trigger a download.
 * Uses html-to-image (SVG foreignObject rendering — handles inline SVG charts
 * and Indic scripts) and slices the resulting canvas into page-sized chunks.
 */
export async function downloadNodeAsPdf(node, filename) {
  const canvas = await toCanvas(node, {
    pixelRatio: 2,
    backgroundColor: "#FDFBF7",
    cacheBust: true,
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

  let renderedPx = 0;
  let firstPage = true;
  while (renderedPx < canvas.height) {
    const sliceH = Math.min(chunkPx, canvas.height - renderedPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceH;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    if (!firstPage) pdf.addPage();
    const sliceHpt = (sliceH / canvas.width) * imgW;
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, sliceHpt);

    renderedPx += sliceH;
    firstPage = false;
  }

  pdf.save(filename);
}
