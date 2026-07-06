/**
 * Text-based PDF builders (jsPDF + jspdf-autotable).
 *
 * We generate three independent PDFs from the SAME reading object:
 *   • buildBasicPdf              — Basic-tier Kundali reading
 *   • buildPremiumAstroPdf       — Premium Vedic Astrology (Kundali + AI reading)
 *   • buildPremiumNumerologyPdf  — Premium Vedic Numerology
 *
 * Design choices
 * --------------
 * • Real, selectable, searchable text via `doc.text` — not rasterized DOM
 *   screenshots. The user can Ctrl-F, highlight & copy, and screen readers
 *   can announce every word.
 * • Page 1 of every PDF opens with a "Satish Numero World" gilded banner,
 *   followed by the traditional Ganesha invocation image (JPG, 64KB).
 * • Layout constants (margins, colours, fonts) live in `LAYOUT` at the top
 *   so future refactors are one-line changes.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ganeshaBanner from "../assets/ganesha-banner-pdf.jpg";

// ---------- design tokens ---------------------------------------------------
const LAYOUT = {
  page:   { w: 210, h: 297 },        // A4 in mm
  margin: { x: 18, y: 20 },
  brand:  {
    ink:    "#5C3A09",               // deep brown for headings
    gold:   "#B8860B",               // accent
    saffron:"#D96600",               // rules
    body:   "#2A1A05",               // main text
    subtle: "#8B5E1A",               // captions
  },
  fonts:  { heading: "helvetica", body: "times" },
};

// ---------- primitives ------------------------------------------------------
/** Convert #RRGGBB to [r, g, b]. */
const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

/** Add a bordered "Satish Numero World" title band + ganesha invocation to
 *  the current page. Called at the very start of every PDF so page 1 is
 *  consistent across all report types. */
function drawCoverBanner(doc) {
  const { page, margin, brand } = LAYOUT;
  const w = page.w - margin.x * 2;
  const bandY = margin.y;
  const bandH = 22;

  // Top + bottom gilded rules
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.4);
  doc.line(margin.x, bandY,          margin.x + w, bandY);
  doc.line(margin.x, bandY + bandH,  margin.x + w, bandY + bandH);

  // Brand name — Cormorant/EB Garamond aren't embeddable easily via jsPDF's
  // stock font set, so we use Helvetica-Bold with wide letter-spacing to
  // approximate the elegant serif feel used on the web.
  doc.setFont(LAYOUT.fonts.heading, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...hex(brand.ink));
  doc.text("SATISH NUMERO WORLD", page.w / 2, bandY + 12.5, {
    align: "center",
    charSpace: 1.4,
  });

  // Subtitle — small caps tagline
  doc.setFont(LAYOUT.fonts.heading, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hex(brand.gold));
  doc.text("NUMEROLOGY  ·  ASTROLOGY  ·  TAROT", page.w / 2, bandY + 18.5, {
    align: "center",
    charSpace: 2.0,
  });

  // Ganesha invocation image — centred beneath the band, sized to leave
  // headroom for the report title below.
  const gY = bandY + bandH + 8;
  const gH = 78;
  const gW = 78;                       // roughly square artwork
  doc.addImage(ganeshaBanner, "JPEG", (page.w - gW) / 2, gY, gW, gH, undefined, "FAST");

  // Sanskrit invocation caption
  doc.setFont(LAYOUT.fonts.body, "italic");
  doc.setFontSize(11);
  doc.setTextColor(...hex(brand.ink));
  doc.text("Shri Ganeshaya Namah", page.w / 2, gY + gH + 8, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(...hex(brand.subtle));
  doc.text("Vakratunda Mahakaya · Suryakoti Samaprabha", page.w / 2, gY + gH + 14, {
    align: "center",
  });

  // Return the y-coordinate after the banner so callers can continue below.
  return gY + gH + 22;
}

/** Section heading with an accent underline. */
function drawSectionHeading(doc, text, y) {
  const { margin, brand } = LAYOUT;
  doc.setFont(LAYOUT.fonts.heading, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...hex(brand.ink));
  doc.text(text, margin.x, y);
  doc.setDrawColor(...hex(brand.saffron));
  doc.setLineWidth(0.35);
  doc.line(margin.x, y + 1.5, margin.x + 45, y + 1.5);
  return y + 8;
}

/** Wrap and draw a paragraph. Returns the y position after the paragraph. */
function drawParagraph(doc, text, y, opts = {}) {
  const { margin, page, brand, fonts } = LAYOUT;
  const size    = opts.size ?? 10;
  const color   = opts.color ?? brand.body;
  const font    = opts.font ?? fonts.body;
  const style   = opts.style ?? "normal";
  const leading = opts.leading ?? size * 0.55;
  const maxW    = page.w - margin.x * 2;

  doc.setFont(font, style);
  doc.setFontSize(size);
  doc.setTextColor(...hex(color));

  const lines = doc.splitTextToSize(text || "", maxW);
  for (const line of lines) {
    if (y > page.h - margin.y - 5) { doc.addPage(); y = margin.y; }
    doc.text(line, margin.x, y);
    y += leading;
  }
  return y + 2;
}

/** Convert Claude's Markdown reading into styled PDF blocks. Supports
 *  ##/### headings, blank-line paragraph breaks and inline **bold**. */
function drawMarkdown(doc, md, y) {
  const { margin, page, brand } = LAYOUT;
  if (!md) return y;

  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (y > page.h - margin.y - 15) { doc.addPage(); y = margin.y; }

    // Headings
    const h2 = block.match(/^##\s+(.+)/);
    const h3 = block.match(/^###\s+(.+)/);
    if (h2) {
      y = drawSectionHeading(doc, h2[1], y + 4);
      continue;
    }
    if (h3) {
      doc.setFont(LAYOUT.fonts.heading, "bold");
      doc.setFontSize(11);
      doc.setTextColor(...hex(brand.gold));
      doc.text(h3[1], margin.x, y);
      y += 6;
      continue;
    }

    // Paragraph — flatten inline **bold** (jsPDF has no mixed-style runs in
    // one draw call, so we render the whole paragraph in normal weight and
    // strip the asterisks. Bold sentences will still read fine, they just
    // don't visually bold — an acceptable tradeoff for text-based PDFs).
    const clean = block.replace(/\*\*/g, "").replace(/\*/g, "");
    y = drawParagraph(doc, clean, y, { size: 10.5, leading: 5.8 });
  }
  return y;
}

/** Standard page footer — brand + page number. */
function drawFooter(doc) {
  const { page, margin, brand } = LAYOUT;
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(LAYOUT.fonts.body, "italic");
    doc.setFontSize(8);
    doc.setTextColor(...hex(brand.subtle));
    doc.text("Satish Numero World", margin.x, page.h - 8);
    doc.text(`Page ${i} of ${total}`, page.w - margin.x, page.h - 8, { align: "right" });
  }
}

// ---------- shared report sections ------------------------------------------

function drawSubjectHeader(doc, r, subtitle, y) {
  const { margin, brand, fonts } = LAYOUT;

  // Report title
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...hex(brand.ink));
  doc.text(subtitle, LAYOUT.page.w / 2, y, { align: "center" });

  // Rule
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.3);
  doc.line(LAYOUT.page.w / 2 - 30, y + 3, LAYOUT.page.w / 2 + 30, y + 3);

  // Subject block
  y += 12;
  doc.setFont(fonts.body, "italic");
  doc.setFontSize(11);
  doc.setTextColor(...hex(brand.body));
  doc.text(`For: ${r.inputs?.full_name || r.summary?.name || "—"}`, margin.x, y);

  y += 6;
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...hex(brand.subtle));
  const dob = r.inputs?.date_of_birth || "—";
  const tob = r.inputs?.time_of_birth || "—";
  const pob = r.inputs?.place_of_birth || r.summary?.pob || "—";
  doc.text(`Date of Birth: ${dob}     Time: ${tob}`, margin.x, y);
  y += 5;
  doc.text(`Place of Birth: ${pob}`, margin.x, y);

  // Ascendant / Sun / Moon at a glance
  const asc = r.chart?.ascendant_english || r.summary?.ascendant;
  const sun = r.summary?.sun_sign;
  const moon = r.summary?.moon_sign;
  if (asc || sun || moon) {
    y += 8;
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...hex(brand.saffron));
    const parts = [];
    if (asc)  parts.push(`Ascendant: ${asc}`);
    if (sun)  parts.push(`Sun: ${sun}`);
    if (moon) parts.push(`Moon: ${moon}`);
    doc.text(parts.join("    ·    "), margin.x, y);
  }
  return y + 8;
}

function drawNakshatraSection(doc, r, y) {
  const nak = r.chart?.nakshatra_report;
  if (!nak) return y;
  y = drawSectionHeading(doc, "Nakshatra Report", y + 4);
  const rows = [
    ["Moon Nakshatra",   nak.name || "—"],
    ["Pada",             String(nak.pada ?? "—")],
    ["Ruling Deity",     nak.deity || "—"],
    ["Symbol",           nak.symbol || "—"],
    ["Planetary Ruler",  nak.ruler || "—"],
    ["Gana",             nak.gana || "—"],
    ["Quality",          nak.quality || "—"],
  ].filter(([, v]) => v && v !== "—");
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
    body: rows, theme: "plain",
    styles: { font: LAYOUT.fonts.body, fontSize: 10, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 4 }, textColor: hex(LAYOUT.brand.body) },
    columnStyles: { 0: { fontStyle: "bold", textColor: hex(LAYOUT.brand.subtle), cellWidth: 45 } },
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawPlanetaryPositions(doc, r, y) {
  const planets = r.chart?.planets;
  if (!planets) return y;
  y = drawSectionHeading(doc, "Planetary Positions", y + 4);
  const rows = Object.entries(planets).map(([k, p]) => [
    p.name || k, p.rashi || "—",
    (p.deg_in_sign != null ? p.deg_in_sign.toFixed(2) + "°" : "—"),
    p.nakshatra || "—",
    String(p.house ?? "—"),
    p.retrograde ? "Retrograde" : "Direct",
  ]);
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
    head: [["Graha", "Rashi", "Degree", "Nakshatra", "House", "State"]],
    body: rows, theme: "grid",
    styles: { font: LAYOUT.fonts.body, fontSize: 9, cellPadding: 1.5, textColor: hex(LAYOUT.brand.body) },
    headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], font: LAYOUT.fonts.heading, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [253, 250, 240] },
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawVimshottariMahadasha(doc, r, y) {
  const md = r.chart?.dasha?.mahadashas;
  if (!md?.length) return y;
  y = drawSectionHeading(doc, "Vimshottari Mahadasha · 120-Year Cycle", y + 4);
  const cur = r.chart?.dasha?.current?.mahadasha;
  const rows = md.map((m) => [
    m.lord + (m.lord === cur ? "  (current)" : ""),
    new Date(m.start).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    new Date(m.end).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    String(m.years),
  ]);
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
    head: [["Mahadasha Lord", "Starts", "Ends", "Years"]],
    body: rows, theme: "striped",
    styles: { font: LAYOUT.fonts.body, fontSize: 10, cellPadding: 2, textColor: hex(LAYOUT.brand.body) },
    headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [253, 250, 240] },
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawNumerologyCore(doc, num, y) {
  if (!num) return y;
  y = drawSectionHeading(doc, "Numerology Overview", y + 4);
  const rows = ["mulank", "bhagyank", "naamank"]
    .filter((k) => num[k]?.number)
    .map((k) => [num[k].label, String(num[k].number), num[k].name || "—", num[k].essence || ""]);
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
    head: [["Category", "#", "Name", "Essence"]],
    body: rows, theme: "grid",
    styles: { font: LAYOUT.fonts.body, fontSize: 9.5, cellPadding: 2, textColor: hex(LAYOUT.brand.body), overflow: "linebreak" },
    headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 12, halign: "center" }, 2: { cellWidth: 30 }, 3: { cellWidth: "auto" } },
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawLoShu(doc, lo, y) {
  if (!lo?.grid) return y;
  y = drawSectionHeading(doc, "Lo Shu Grid  ·  Jeevan Ank Yantra", y + 4);
  const rows = lo.grid.map((row) => row.map((c) => (c.count > 0 ? String(c.digit).repeat(c.count) : "")));
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x + 30, right: LAYOUT.margin.x + 30 },
    body: rows, theme: "grid",
    styles: { font: LAYOUT.fonts.heading, fontSize: 20, fontStyle: "bold", cellPadding: 8, halign: "center", valign: "middle", textColor: hex(LAYOUT.brand.saffron), lineColor: hex(LAYOUT.brand.subtle), lineWidth: 0.4, minCellHeight: 25 },
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawVedicPlanetChart(doc, vc, y) {
  if (!vc?.grid) return y;
  y = drawSectionHeading(doc, "Vedic Planetary Chart  ·  Grahas", y + 4);
  const rows = vc.grid.map((row) =>
    row.map((c) => `${c.digit}\n${c.graha}${c.count > 0 ? `  ×${c.count}` : ""}`)
  );
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x + 30, right: LAYOUT.margin.x + 30 },
    body: rows, theme: "grid",
    styles: { font: LAYOUT.fonts.body, fontSize: 10, cellPadding: 4, halign: "center", valign: "middle", textColor: hex(LAYOUT.brand.body), lineColor: hex(LAYOUT.brand.subtle), lineWidth: 0.4, minCellHeight: 20 },
  });
  y = doc.lastAutoTable.finalY + 4;
  if (vc.dominant?.length) {
    doc.setFont(LAYOUT.fonts.body, "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...hex(LAYOUT.brand.subtle));
    const dom = vc.dominant.map((n) => {
      const c = vc.grid.flat().find((x) => x.digit === n);
      return c ? `${c.graha} (${c.english}) ×${c.count}` : "";
    }).filter(Boolean).join(" · ");
    doc.text(`Dominant grahas: ${dom}`, LAYOUT.margin.x, y);
    y += 6;
  }
  return y;
}

// ---------- public builders -------------------------------------------------

export function buildBasicPdf(reading) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawCoverBanner(doc);
  doc.addPage();

  let y = LAYOUT.margin.y;
  y = drawSubjectHeader(doc, reading, "Kundali Reading", y);
  y = drawNakshatraSection(doc, reading, y);
  doc.addPage(); y = LAYOUT.margin.y;
  y = drawPlanetaryPositions(doc, reading, y);
  if (reading.chart?.dasha?.mahadashas?.length) {
    doc.addPage(); y = LAYOUT.margin.y;
    y = drawVimshottariMahadasha(doc, reading, y);
  }
  if (reading.advice) {
    doc.addPage(); y = LAYOUT.margin.y;
    y = drawSectionHeading(doc, "Detailed Reading", y + 2);
    drawMarkdown(doc, reading.advice, y);
  }

  drawFooter(doc);
  return doc;
}

export function buildPremiumAstroPdf(reading) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawCoverBanner(doc);
  doc.addPage();

  let y = LAYOUT.margin.y;
  y = drawSubjectHeader(doc, reading, "Vedic Astrology Report", y);
  y = drawNakshatraSection(doc, reading, y);

  doc.addPage(); y = LAYOUT.margin.y;
  y = drawPlanetaryPositions(doc, reading, y);

  doc.addPage(); y = LAYOUT.margin.y;
  y = drawVimshottariMahadasha(doc, reading, y);

  if (reading.advice) {
    doc.addPage(); y = LAYOUT.margin.y;
    y = drawSectionHeading(doc, "Detailed Planetary Reading", y + 2);
    drawMarkdown(doc, reading.advice, y);
  }

  drawFooter(doc);
  return doc;
}

export function buildPremiumNumerologyPdf(reading) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawCoverBanner(doc);
  doc.addPage();

  let y = LAYOUT.margin.y;
  y = drawSubjectHeader(doc, reading, "Vedic Numerology Report", y);

  const num = reading.chart?.numerology;
  y = drawNumerologyCore(doc, num, y);

  doc.addPage(); y = LAYOUT.margin.y;
  y = drawLoShu(doc, num?.lo_shu, y);
  y = drawVedicPlanetChart(doc, num?.vedic_chart, y);

  const dasha = reading.chart?.numerology_dasha;
  if (dasha?.mahadashas?.length) {
    doc.addPage(); y = LAYOUT.margin.y;
    y = drawSectionHeading(doc, "Vedic Numerology Mahadasha  ·  81-Year Cycle", y + 2);
    const cur = dasha.current?.mahadasha;
    const rows = dasha.mahadashas.map((m) => [
      `${m.number}${m.number === cur ? " (current)" : ""}`,
      m.name || "—",
      new Date(m.start).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      new Date(m.end).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      String(m.years),
    ]);
    autoTable(doc, {
      startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
      head: [["#", "Ruler", "Starts", "Ends", "Years"]],
      body: rows, theme: "striped",
      styles: { font: LAYOUT.fonts.body, fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 250, 240] },
    });
  }

  if (reading.numerology_advice || reading.advice) {
    doc.addPage(); y = LAYOUT.margin.y;
    y = drawSectionHeading(doc, "AI Numerology Reading", y + 2);
    drawMarkdown(doc, reading.numerology_advice || reading.advice, y);
  }

  drawFooter(doc);
  return doc;
}
