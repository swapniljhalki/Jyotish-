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
import { toPng } from "html-to-image";
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

function drawSubjectHeader(doc, r, subtitle, y, inputs) {
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

  // Subject block. `inputs` is what the user typed into BirthForm and lives in
  // React state on Basic/Premium pages; the reading object itself doesn't
  // always echo it back (SSE payload + polling status omit it), so callers
  // pass it in explicitly.
  const src = inputs || r.inputs || {};
  y += 12;
  doc.setFont(fonts.body, "italic");
  doc.setFontSize(11);
  doc.setTextColor(...hex(brand.body));
  doc.text(`For: ${src.full_name || r.summary?.name || "—"}`, margin.x, y);

  y += 6;
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...hex(brand.subtle));
  const dob = src.date_of_birth || "—";
  const tob = src.time_of_birth || "—";
  const pob = src.place_of_birth || r.summary?.pob || "—";
  doc.text(`Date of Birth: ${dob}     Time: ${tob}`, margin.x, y);
  y += 5;
  doc.text(`Place of Birth: ${pob}`, margin.x, y);

  // Ascendant / Sun / Moon at a glance
  const asc = r.chart?.ascendant_english || r.ascendant || r.summary?.ascendant;
  const sun = r.sun_sign  || r.summary?.sun_sign;
  const moon = r.moon_sign || r.summary?.moon_sign;
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
  // Backend planets can arrive as either an object keyed by planet code (older
  // shape) or an array of {name, code, rashi_english, degree, nakshatra, ...}
  // (current shape). Normalise to a list of rows.
  const list = Array.isArray(planets) ? planets : Object.values(planets);
  const rows = list.map((p) => [
    p.name || p.code || "—",
    p.rashi_english || p.rashi || "—",
    p.degree != null
      ? (typeof p.degree === "number" ? p.degree.toFixed(2) : p.degree) + "°"
      : (p.deg_in_sign != null ? p.deg_in_sign.toFixed(2) + "°" : "—"),
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
    .map((k) => {
      const e = num[k];
      // Backend fields: e.planet (Sanskrit), e.planet_english, e.traits.
      // Older code called these "name" / "essence"; keep the fallback so any
      // future refactor doesn't silently blank the column.
      const planet = e.planet_english
        ? (e.planet && !e.planet_english.toLowerCase().includes(e.planet.toLowerCase())
            ? `${e.planet} (${e.planet_english})`
            : e.planet_english)
        : (e.planet || e.name || "—");
      const essence = e.traits || e.essence || "";
      return [e.label, String(e.number), planet, essence];
    });
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

// ---------- Kundali charts (North Indian diamond) --------------------------
/** Draw a single North-Indian diamond Kundali as vector primitives at
 *  (x, y) with the given `size` (mm). Mirrors the layout of
 *  `/app/frontend/src/components/KundaliChart.jsx` (asc-marker, rashi number
 *  at the top of each cell, planet codes below). Titles above chart are
 *  drawn separately by the caller for tighter layout control. */
function drawKundaliDiagram(doc, chart, x, y, size) {
  const { brand, fonts } = LAYOUT;
  if (!chart?.house_signs || !chart?.houses) return;
  const s = size;

  // Outer square + diamond (midpoint quad) + full diagonals
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.35);
  doc.rect(x, y, s, s);
  doc.line(x + s/2, y,       x + s,   y + s/2);
  doc.line(x + s,   y + s/2, x + s/2, y + s);
  doc.line(x + s/2, y + s,   x,       y + s/2);
  doc.line(x,       y + s/2, x + s/2, y);
  doc.line(x,       y,       x + s,   y + s);
  doc.line(x + s,   y,       x,       y + s);

  // North-Indian house centers (fractions of `s`, matches KundaliChart.jsx).
  const centers = {
    1:  [0.50, 0.25], 2:  [0.18, 0.12], 3:  [0.12, 0.22], 4:  [0.25, 0.50],
    5:  [0.12, 0.78], 6:  [0.18, 0.88], 7:  [0.50, 0.75], 8:  [0.82, 0.88],
    9:  [0.88, 0.78], 10: [0.75, 0.50], 11: [0.88, 0.22], 12: [0.82, 0.12],
  };

  // Font sizes scale gently with chart size so 80 mm and 110 mm both read well.
  // At 76 mm (Chandra / Navamsha) the small triangular cells only comfortably
  // fit ~3 two-letter codes on one line — shrink the planet font extra hard
  // there so a rare 4+ planet cell can't overflow into a neighbour.
  const rashiFs  = Math.max(7, Math.min(11, size * 0.10));
  const basePlanetFs = Math.max(5.5, Math.min(9, size * 0.075));

  for (let h = 1; h <= 12; h++) {
    const cx = x + centers[h][0] * s;
    const cy = y + centers[h][1] * s;
    const signIdx = chart.house_signs[String(h)];
    const planets = chart.houses[String(h)] || [];

    // Rashi number (1..12)
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(rashiFs);
    doc.setTextColor(...hex("#6B4308"));
    doc.text(String(((signIdx ?? 0) % 12) + 1), cx, cy - size * 0.015, { align: "center" });

    // Planet codes — wrap to 2 lines if more than 3 in the same house, and
    // shrink progressively so even a rare 4-planet cell fits inside the
    // triangular cell on the compact (76 mm) Chandra / Navamsha diagrams.
    if (planets.length) {
      const shrink = planets.length <= 2 ? 0
                   : planets.length === 3 ? 0.6
                   : planets.length === 4 ? 1.2
                   : 1.6;
      const planetFs = Math.max(4.5, basePlanetFs - shrink);
      doc.setFont(fonts.body, "normal");
      doc.setFontSize(planetFs);
      doc.setTextColor(...hex(brand.body));
      const lineY = cy + size * 0.045;
      if (planets.length <= 3) {
        doc.text(planets.join(" "), cx, lineY, { align: "center" });
      } else {
        const mid = Math.ceil(planets.length / 2);
        doc.text(planets.slice(0, mid).join(" "), cx, lineY,                { align: "center" });
        doc.text(planets.slice(mid).join(" "),    cx, lineY + size * 0.048, { align: "center" });
      }
    }
  }

  // Ascendant tag — small saffron pill above house 1
  const [ax, ay] = [x + centers[1][0] * s, y + centers[1][1] * s];
  doc.setDrawColor(...hex("#FF9933"));
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 240, 220);
  doc.circle(ax, ay - size * 0.11, size * 0.032, "FD");
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(Math.max(5.5, size * 0.055));
  doc.setTextColor(...hex("#9A3E00"));
  doc.text("Asc", ax, ay - size * 0.098, { align: "center" });
}

// ---------- snapshot helpers (hybrid text + on-screen visuals) --------------
/** Snapshot a DOM element by data-testid into a PNG data-url plus its natural
 *  pixel dimensions. Returns null if the element isn't in the DOM or
 *  html-to-image throws (e.g. tainted canvas). Callers must handle null and
 *  fall back to vector-drawn primitives. */
async function snapshotByTestId(testId, options = {}) {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  try {
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: "#FDFBF7",
      cacheBust: true,
      // Neutralise the hover-lift transform + focus ring so the capture
      // looks like the resting state, not the mid-interaction state.
      style: { transform: "none", boxShadow: "none" },
      ...options,
    });
    return { dataUrl, w: rect.width, h: rect.height };
  } catch (e) {
    console.warn(`[pdfBuilders] snapshot failed for [data-testid="${testId}"]`, e);
    return null;
  }
}

/** Draw a captured PNG snapshot into the PDF, scaled to fit inside
 *  (maxW × maxH) preserving aspect ratio and horizontally centred inside the
 *  bounding box. Returns the actual rendered {w, h}. */
function drawSnapshot(doc, snap, x, y, maxW, maxH) {
  if (!snap) return { w: 0, h: 0 };
  const ratio = snap.h / snap.w;
  let w = maxW;
  let h = w * ratio;
  if (h > maxH) { h = maxH; w = h / ratio; }
  const cx = x + (maxW - w) / 2;
  doc.addImage(snap.dataUrl, "PNG", cx, y, w, h, undefined, "FAST");
  return { w, h };
}

/** Snapshot-driven Kundali-Charts page. Falls back to vector diamonds if any
 *  snapshot fails (element not on-screen, tainted canvas, etc.). Called by
 *  buildBasicPdf and buildPremiumAstroPdf with the *page-specific* set of
 *  data-testids because Basic and Premium prefix them differently. */
async function drawKundaliChartsFromScreen(doc, reading, testIds) {
  const { page, margin, brand, fonts } = LAYOUT;
  const [d1Id, chandraId, navamshaId] = testIds;

  const [d1Snap, chSnap, navSnap] = await Promise.all([
    snapshotByTestId(d1Id),
    snapshotByTestId(chandraId),
    snapshotByTestId(navamshaId),
  ]);

  // If nothing captured (e.g. running from ReadingDetail where the on-screen
  // chart uses a different id), fall back to the pure-vector rendering.
  if (!d1Snap && !chSnap && !navSnap) {
    drawKundaliChartsPage(doc, reading);
    return;
  }

  doc.addPage();
  let y = margin.y;

  // Page title
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...hex(brand.ink));
  doc.text("Vedic Kundali Charts", page.w / 2, y, { align: "center" });
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.3);
  doc.line(page.w / 2 - 35, y + 3, page.w / 2 + 35, y + 3);
  y += 10;

  const usableW = page.w - margin.x * 2;

  // D1 Lagna — full width top, capped at 110 mm tall.
  if (d1Snap) {
    const { h } = drawSnapshot(doc, d1Snap, margin.x, y, usableW, 110);
    y += h + 8;
  }

  // Chandra + Navamsha side-by-side.
  const remaining = page.h - margin.y - y - margin.y;
  const halfW = (usableW - 6) / 2;
  const halfMaxH = Math.min(remaining, 105);
  if (chSnap)  drawSnapshot(doc, chSnap,  margin.x,             y, halfW, halfMaxH);
  if (navSnap) drawSnapshot(doc, navSnap, margin.x + halfW + 6, y, halfW, halfMaxH);
}

/** Snapshot the on-screen Lo Shu Grid + Vedic Planetary Chart into the
 *  Premium Numerology PDF so the coloured cells match what the user sees.
 *  Falls back to the vector tables if the on-screen container isn't found. */
async function drawNumerologyGridsFromScreen(doc, num, y, containerTestId) {
  const { page, margin, brand, fonts } = LAYOUT;
  const snap = await snapshotByTestId(containerTestId);
  if (!snap) {
    // Vector fallback
    y = drawLoShu(doc, num?.lo_shu, y);
    y = drawVedicPlanetChart(doc, num?.vedic_chart, y);
    return y;
  }

  y = drawSectionHeading(doc, "Lo Shu Grid  &  Vedic Planetary Chart", y + 4);
  const usableW = page.w - margin.x * 2;
  const remaining = page.h - margin.y - y - 6;
  const { h } = drawSnapshot(doc, snap, margin.x, y, usableW, remaining);
  return y + h + 4;
}


/** Dedicated Kundali-Charts page: D1 Lagna centered on top, then Chandra +
 *  Navamsha side-by-side below. Called by both Basic and Premium builders on
 *  a fresh page so the diagrams never share space with tables or reading text. */
function drawKundaliChartsPage(doc, reading) {
  const { page, margin, brand, fonts } = LAYOUT;
  doc.addPage();
  let y = margin.y;

  // Page title
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...hex(brand.ink));
  doc.text("Vedic Kundali Charts", page.w / 2, y, { align: "center" });
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.3);
  doc.line(page.w / 2 - 35, y + 3, page.w / 2 + 35, y + 3);
  y += 12;

  const drawLabelled = (title, chart, cx, cy, sz) => {
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...hex(brand.ink));
    doc.text(title, cx + sz / 2, cy - 3, { align: "center" });
    drawKundaliDiagram(doc, chart, cx, cy, sz);
    if (chart?.ascendant_english) {
      doc.setFont(fonts.body, "italic");
      doc.setFontSize(8);
      doc.setTextColor(...hex(brand.subtle));
      doc.text(`Ascendant: ${chart.ascendant_english}`, cx + sz / 2, cy + sz + 5, { align: "center" });
    }
  };

  // D1 Lagna — large, centred
  const d1 = 100;
  drawLabelled("Lagna · D1 · Ascendant Chart", reading.chart, (page.w - d1) / 2, y + 6, d1);
  y += d1 + 22;

  // Chandra + Navamsha side-by-side
  const sm = 76;
  const gap = 12;
  const startX = (page.w - (sm * 2 + gap)) / 2;
  if (reading.chart?.chandra) {
    drawLabelled("Chandra Rashi · Moon-sign Chart", reading.chart.chandra, startX, y + 6, sm);
  }
  if (reading.chart?.navamsha) {
    drawLabelled("Navamsha · D9 · Marriage & Dharma", reading.chart.navamsha, startX + sm + gap, y + 6, sm);
  }
}

// ---------- public builders -------------------------------------------------
// Builders are async because they may await DOM snapshots (html-to-image).
// ResultActions awaits them and calls doc.save() with the returned jsPDF.

export async function buildBasicPdf(reading, inputs) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawCoverBanner(doc);
  doc.addPage();

  let y = LAYOUT.margin.y;
  y = drawSubjectHeader(doc, reading, "Kundali Reading", y, inputs);
  y = drawNakshatraSection(doc, reading, y);

  // Kundali diagrams — snapshot the on-screen cards so the PDF visually
  // matches what the user sees on-screen (colored cells + ornate labels).
  // Falls back to vector diamonds if the DOM elements aren't present.
  if (reading.chart?.houses) {
    await drawKundaliChartsFromScreen(doc, reading, [
      "basic-expand-kundali-d1",
      "basic-expand-kundali-chandra",
      "basic-expand-kundali-navamsha",
    ]);
  }

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

export async function buildPremiumAstroPdf(reading, inputs) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawCoverBanner(doc);
  doc.addPage();

  let y = LAYOUT.margin.y;
  y = drawSubjectHeader(doc, reading, "Vedic Astrology Report", y, inputs);
  y = drawNakshatraSection(doc, reading, y);

  // Kundali diagrams — snapshot the on-screen cards (Premium testids differ
  // from Basic — no "basic-" prefix).
  if (reading.chart?.houses) {
    await drawKundaliChartsFromScreen(doc, reading, [
      "expand-kundali-d1",
      "expand-kundali-chandra",
      "expand-kundali-navamsha",
    ]);
  }

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

export async function buildPremiumNumerologyPdf(reading, inputs) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawCoverBanner(doc);
  doc.addPage();

  let y = LAYOUT.margin.y;
  y = drawSubjectHeader(doc, reading, "Vedic Numerology Report", y, inputs);

  const num = reading.chart?.numerology;
  y = drawNumerologyCore(doc, num, y);

  doc.addPage(); y = LAYOUT.margin.y;
  // Snapshot the on-screen Lo Shu + Vedic Planetary grid pair. Falls back to
  // vector tables if the container isn't in the DOM.
  y = await drawNumerologyGridsFromScreen(doc, num, y, "premium-numerology-charts");

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

  if (reading.numerology_advice) {
    doc.addPage(); y = LAYOUT.margin.y;
    y = drawSectionHeading(doc, "AI Numerology Reading", y + 2);
    drawMarkdown(doc, reading.numerology_advice, y);
  }

  drawFooter(doc);
  return doc;
}
