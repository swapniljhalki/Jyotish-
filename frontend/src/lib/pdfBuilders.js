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
import snwLogo from "../assets/snw-logo.jpg";

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

// ---------- helpers for cover metadata boxes --------------------------------

const RASHI_SANSKRIT = {
  "Aries": "Mesha", "Taurus": "Vrishabha", "Gemini": "Mithuna",
  "Cancer": "Karka", "Leo": "Simha", "Virgo": "Kanya",
  "Libra": "Tula", "Scorpio": "Vrishchika", "Sagittarius": "Dhanu",
  "Capricorn": "Makara", "Aquarius": "Kumbha", "Pisces": "Meena",
};

/** Ruler planet for each mulank-derived Numerology Mahadasha. Matches the
 *  Vedic mapping used on-screen in the Premium Numerology card and in
 *  `/app/backend/numerology.py` (VEDIC_PLANET_MAP). Backend's num_dasha.py
 *  currently doesn't echo the planet name back per Mahadasha row, so we
 *  derive it here from `m.number` (1..9). */
const NUMEROLOGY_RULERS = {
  1: "Sun (Surya)",
  2: "Moon (Chandra)",
  3: "Jupiter (Guru)",
  4: "Rahu (North Node)",
  5: "Mercury (Budha)",
  6: "Venus (Shukra)",
  7: "Ketu (South Node)",
  8: "Saturn (Shani)",
  9: "Mars (Mangal)",
};

/** Format a raw ISO-ish date-of-birth string into "5 February 1976". */
const formatDob = (dob) => {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d)) return dob;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/** Draw a single metadata box (top label + big value + optional sanskrit).
 *  The label auto-shrinks (fontSize + charSpace) to guarantee it fits inside
 *  the box width — long labels like "BHAGYANK (DESTINY NUMBER)" would
 *  otherwise clip the right border. */
function drawMetaBox(doc, x, y, w, h, label, value, sub) {
  const { brand, fonts } = LAYOUT;
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 251, 242);
  doc.rect(x, y, w, h, "FD");

  // Label — small caps, auto-fit inside the box with a comfortable 3 mm
  // inset from each vertical border. Long labels like "BHAGYANK (DESTINY
  // NUMBER)" would otherwise sit right on the border line.
  const labelText = (label || "").toUpperCase();
  doc.setFont(fonts.heading, "bold");
  doc.setTextColor(...hex(brand.gold));
  let labelSize = 7.5;
  let labelSpace = 1.2;
  const fits = () => doc.getTextWidth(labelText) + Math.max(0, labelText.length - 1) * labelSpace <= w - 6;
  doc.setFontSize(labelSize);
  if (!fits()) { labelSpace = 0.4; }
  if (!fits()) { labelSpace = 0; }
  while (!fits() && labelSize > 5.2) { labelSize -= 0.25; doc.setFontSize(labelSize); }
  doc.text(labelText, x + w / 2, y + 5, { align: "center", charSpace: labelSpace });

  // Value — main text
  doc.setFont(fonts.body, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...hex(brand.ink));
  const val = value || "—";
  const wrapped = doc.splitTextToSize(val, w - 6);
  const valY = y + 5 + 6 + (wrapped.length === 1 ? 3 : 0);
  wrapped.slice(0, 2).forEach((ln, i) => {
    doc.text(ln, x + w / 2, valY + i * 4.6, { align: "center" });
  });

  // Sanskrit / sub caption
  if (sub) {
    doc.setFont(fonts.body, "italic");
    doc.setFontSize(8);
    doc.setTextColor(...hex(brand.subtle));
    doc.text(sub, x + w / 2, y + h - 3, { align: "center" });
  }
}

/** Cover page for the Astrology (Basic + Premium) PDFs. Matches the sample
 *  reference PDF layout: brand + Ganesha + name + 3-box birth grid +
 *  Nakshatra summary + SNW watermark. */
function drawAstroCoverPage(doc, reading, inputs, reportTitle) {
  const { page, margin, brand, fonts } = LAYOUT;
  const src = inputs || reading.inputs || {};

  // 1) Brand band
  const bandY = margin.y - 4;
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.4);
  doc.line(margin.x, bandY,     page.w - margin.x, bandY);
  doc.line(margin.x, bandY + 20, page.w - margin.x, bandY + 20);

  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...hex(brand.ink));
  doc.text("SATISH NUMERO WORLD", page.w / 2, bandY + 11, { align: "center", charSpace: 1.4 });
  doc.setFont(fonts.heading, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hex(brand.gold));
  doc.text("NUMEROLOGY  ·  ASTROLOGY  ·  TAROT", page.w / 2, bandY + 17.5, { align: "center", charSpace: 2 });

  // 2) Ganesha invocation
  const gY = bandY + 26;
  const gH = 44;
  const gW = 44;
  doc.addImage(ganeshaBanner, "JPEG", (page.w - gW) / 2, gY, gW, gH, undefined, "FAST");

  doc.setFont(fonts.body, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...hex(brand.ink));
  doc.text("Shri Ganeshaya Namah", page.w / 2, gY + gH + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(...hex(brand.subtle));
  doc.text("Vakratunda Mahakaya  ·  Suryakoti Samaprabha", page.w / 2, gY + gH + 10, { align: "center" });

  // 3) Report title + subject name
  let y = gY + gH + 20;
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...hex(brand.gold));
  doc.text((reportTitle || "VEDIC KUNDALI REPORT").toUpperCase(), page.w / 2, y, { align: "center", charSpace: 1.5 });

  y += 8;
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...hex(brand.ink));
  doc.text(src.full_name || reading.summary?.name || "—", page.w / 2, y, { align: "center" });

  // Gold hairline under name
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.3);
  doc.line(page.w / 2 - 40, y + 3, page.w / 2 + 40, y + 3);

  // 4) Three-box birth grid
  y += 12;
  const usable = page.w - margin.x * 2;
  const gap = 4;
  const boxW = (usable - gap * 2) / 3;
  const boxH = 26;

  const asc = reading.chart?.ascendant_english || reading.summary?.ascendant || reading.ascendant;
  const sun = reading.sun_sign || reading.summary?.sun_sign;
  const moon = reading.moon_sign || reading.summary?.moon_sign;

  drawMetaBox(doc, margin.x + (boxW + gap) * 0, y, boxW, boxH,
    "Date of Birth", formatDob(src.date_of_birth));
  drawMetaBox(doc, margin.x + (boxW + gap) * 1, y, boxW, boxH,
    "Time of Birth", src.time_of_birth || "—");
  drawMetaBox(doc, margin.x + (boxW + gap) * 2, y, boxW, boxH,
    "Place of Birth", src.place_of_birth || reading.summary?.pob || "—");

  y += boxH + gap;
  drawMetaBox(doc, margin.x + (boxW + gap) * 0, y, boxW, boxH,
    "Ascendant", asc || "—", asc && RASHI_SANSKRIT[asc] ? RASHI_SANSKRIT[asc] : null);
  drawMetaBox(doc, margin.x + (boxW + gap) * 1, y, boxW, boxH,
    "Sun Sign", sun || "—", sun && RASHI_SANSKRIT[sun] ? RASHI_SANSKRIT[sun] : null);
  drawMetaBox(doc, margin.x + (boxW + gap) * 2, y, boxW, boxH,
    "Moon Sign", moon || "—", moon && RASHI_SANSKRIT[moon] ? RASHI_SANSKRIT[moon] : null);

  y += boxH + 10;

  // 5) Nakshatra summary block
  const nak = reading.chart?.nakshatra_report;
  if (nak && y < page.h - 65) {
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...hex(brand.gold));
    doc.text("NAKSHATRA REPORT  ·  MOON'S STAR", page.w / 2, y, { align: "center", charSpace: 1.4 });
    y += 6;

    // Nakshatra name — English only. jsPDF's built-in Helvetica has no
    // Devanagari glyphs, so we intentionally drop the Sanskrit unicode form
    // here to avoid garbled output. (A future enhancement can addFont() a
    // NotoSansDevanagari.ttf and render nak.sanskrit as a real sub-line.)
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...hex(brand.ink));
    doc.text(nak.name || "—", page.w / 2, y, { align: "center" });
    y += 6;

    // Pada + range — measure & auto-wrap to guarantee no overflow.
    doc.setFont(fonts.body, "italic");
    doc.setFontSize(9);
    doc.setTextColor(...hex(brand.saffron));
    const padaLine = `PADA ${nak.pada ?? "—"}${nak.range ? "   ·   " + nak.range : ""}`;
    const padaLines = doc.splitTextToSize(padaLine, usable - 20);
    padaLines.slice(0, 2).forEach((ln, i) => {
      doc.text(ln, page.w / 2, y + i * 4.5, { align: "center" });
    });
    y += Math.min(2, padaLines.length) * 4.5 + 1;

    // Description
    if (nak.description) {
      doc.setFont(fonts.body, "italic");
      doc.setFontSize(9);
      doc.setTextColor(...hex(brand.body));
      const wrapped = doc.splitTextToSize(nak.description, usable - 20);
      wrapped.slice(0, 2).forEach((ln, i) => {
        doc.text(ln, page.w / 2, y + i * 4.5, { align: "center" });
      });
      y += Math.min(2, wrapped.length) * 4.5 + 2;
    }

    // Small attribute strip: Deity · Gana · Symbol · Quality · Ruler
    const attrs = [
      ["Deity",   nak.deity],   ["Gana",    nak.gana],
      ["Symbol",  nak.symbol],  ["Quality", nak.quality],
      ["Ruler",   nak.ruler],
    ].filter(([, v]) => v);
    if (attrs.length) {
      y += 2;
      const stripW = (usable - 10) / attrs.length;
      attrs.forEach(([label, val], i) => {
        const cx = margin.x + 5 + stripW * i + stripW / 2;
        doc.setFont(fonts.heading, "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...hex(brand.gold));
        doc.text(label.toUpperCase(), cx, y, { align: "center", charSpace: 1 });
        doc.setFont(fonts.body, "normal");
        doc.setFontSize(8);
        doc.setTextColor(...hex(brand.body));
        doc.text(String(val), cx, y + 4, { align: "center" });
      });
    }
  }
}

/** Cover page for the Numerology PDF. Same aesthetic as astrology cover but
 *  the three-box grid + summary swap in numerology-specific numbers. */
function drawNumerologyCoverPage(doc, reading, inputs) {
  const { page, margin, brand, fonts } = LAYOUT;
  const src = inputs || reading.inputs || {};
  const num = reading.chart?.numerology;

  // Brand band (same as astrology)
  const bandY = margin.y - 4;
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.4);
  doc.line(margin.x, bandY,     page.w - margin.x, bandY);
  doc.line(margin.x, bandY + 20, page.w - margin.x, bandY + 20);
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...hex(brand.ink));
  doc.text("SATISH NUMERO WORLD", page.w / 2, bandY + 11, { align: "center", charSpace: 1.4 });
  doc.setFont(fonts.heading, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hex(brand.gold));
  doc.text("NUMEROLOGY  ·  ASTROLOGY  ·  TAROT", page.w / 2, bandY + 17.5, { align: "center", charSpace: 2 });

  // Ganesha
  const gY = bandY + 26;
  const gH = 44, gW = 44;
  doc.addImage(ganeshaBanner, "JPEG", (page.w - gW) / 2, gY, gW, gH, undefined, "FAST");
  doc.setFont(fonts.body, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...hex(brand.ink));
  doc.text("Shri Ganeshaya Namah", page.w / 2, gY + gH + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(...hex(brand.subtle));
  doc.text("Vakratunda Mahakaya  ·  Suryakoti Samaprabha", page.w / 2, gY + gH + 10, { align: "center" });

  // Report title + name
  let y = gY + gH + 20;
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...hex(brand.gold));
  doc.text("VEDIC NUMEROLOGY REPORT", page.w / 2, y, { align: "center", charSpace: 1.5 });
  y += 8;
  doc.setFont(fonts.heading, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...hex(brand.ink));
  doc.text(src.full_name || reading.summary?.name || "—", page.w / 2, y, { align: "center" });
  doc.setDrawColor(...hex(brand.gold));
  doc.setLineWidth(0.3);
  doc.line(page.w / 2 - 40, y + 3, page.w / 2 + 40, y + 3);

  // Three-box birth grid (row 1)
  y += 12;
  const usable = page.w - margin.x * 2;
  const gap = 4;
  const boxW = (usable - gap * 2) / 3;
  const boxH = 26;
  drawMetaBox(doc, margin.x + (boxW + gap) * 0, y, boxW, boxH, "Date of Birth", formatDob(src.date_of_birth));
  drawMetaBox(doc, margin.x + (boxW + gap) * 1, y, boxW, boxH, "Time of Birth", src.time_of_birth || "—");
  drawMetaBox(doc, margin.x + (boxW + gap) * 2, y, boxW, boxH, "Place of Birth", src.place_of_birth || reading.summary?.pob || "—");

  // Row 2 — core numerology numbers
  y += boxH + gap;
  const numRow = (k, fallbackLabel) => {
    const e = num?.[k];
    return {
      label: e?.label || fallbackLabel,
      value: e ? `${e.number}  ·  ${e.planet_english || e.planet || ""}` : "—",
      sub: e?.traits ? e.traits.split(",")[0] : null,
    };
  };
  const mul = numRow("mulank",   "Mulank");
  const bha = numRow("bhagyank", "Bhagyank");
  const naa = numRow("naamank",  "Naamank");
  drawMetaBox(doc, margin.x + (boxW + gap) * 0, y, boxW, boxH, mul.label, mul.value, mul.sub);
  drawMetaBox(doc, margin.x + (boxW + gap) * 1, y, boxW, boxH, bha.label, bha.value, bha.sub);
  drawMetaBox(doc, margin.x + (boxW + gap) * 2, y, boxW, boxH, naa.label, naa.value, naa.sub);

  // Blessing footer strip
  y += boxH + 12;
  y = drawFittedTitle(doc,
    "A VEDIC NUMEROLOGY JOURNEY  ·  BASED ON JYOTISHA + CHALDEAN + LO SHU TRADITIONS",
    y, { size: 9, color: brand.gold, maxCharSpace: 1.2 });
  doc.setFont(fonts.body, "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...hex(brand.body));
  const blessing = "May the sacred sciences of numbers illuminate the path of your name and birth.";
  doc.text(blessing, page.w / 2, y, { align: "center" });
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

/** Draw a center-aligned page heading that is guaranteed to fit within the
 *  usable page width by shrinking either the char-spacing or the font size.
 *  Prevents "RAVI KUM" style right-edge clipping we hit on long subject
 *  names ("DETAILED VEDIC KUNDALI READING FOR <NAME>"). */
function drawFittedTitle(doc, text, y, { size = 14, weight = "bold", color, maxCharSpace = 1.1 } = {}) {
  const { page, margin, brand, fonts } = LAYOUT;
  const maxW = page.w - margin.x * 2;
  doc.setFont(fonts.heading, weight);
  doc.setFontSize(size);
  doc.setTextColor(...hex(color || brand.ink));

  // First try: honour maxCharSpace. If overflows, drop char-spacing then font.
  let charSpace = maxCharSpace;
  const measure = () => doc.getTextWidth(text) + (text.length - 1) * charSpace;
  if (measure() > maxW) { charSpace = 0.3; }
  if (measure() > maxW) {
    charSpace = 0;
    // Shrink size until it fits (down to a floor of 9pt).
    let s = size;
    while (s > 9 && doc.getTextWidth(text) > maxW) {
      s -= 0.5;
      doc.setFontSize(s);
    }
  }
  doc.text(text, page.w / 2, y, { align: "center", charSpace });
  return y + Math.max(6, size * 0.55);
}

/** Convert Claude's Markdown reading into styled PDF blocks. Supports
 *  #/##/### headings, blank-line paragraph breaks and inline **bold**. */
function drawMarkdown(doc, md, y) {
  const { margin, page, brand } = LAYOUT;
  if (!md) return y;

  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (y > page.h - margin.y - 15) { doc.addPage(); y = margin.y; }

    // Headings — order matters: ### before ## before # so the more-specific
    // pattern wins. Previously we skipped H1 entirely, which leaked a literal
    // "# " into the body when Claude opens the reading with a top-level title.
    const h3 = block.match(/^###\s+(.+)/);
    const h2 = block.match(/^##\s+(.+)/);
    const h1 = block.match(/^#\s+(.+)/);
    if (h3) {
      doc.setFont(LAYOUT.fonts.heading, "bold");
      doc.setFontSize(11);
      doc.setTextColor(...hex(brand.gold));
      doc.text(h3[1], margin.x, y);
      y += 6;
      continue;
    }
    if (h2) {
      y = drawSectionHeading(doc, h2[1], y + 4);
      continue;
    }
    if (h1) {
      // Backend often opens the AI reading with a top-level title ("# Vedic
      // Kundali Reading for <name>") that duplicates the page heading. Render
      // it as a subdued sub-heading so nothing leaks as literal "# ".
      doc.setFont(LAYOUT.fonts.heading, "bold");
      doc.setFontSize(12);
      doc.setTextColor(...hex(brand.saffron));
      const wrapped = doc.splitTextToSize(h1[1], page.w - margin.x * 2);
      wrapped.forEach((ln, i) => doc.text(ln, LAYOUT.page.w / 2, y + i * 5.5, { align: "center" }));
      y += wrapped.length * 5.5 + 3;
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

/** Standard page footer — SNW watermark + brand + page number. Applied
 *  to every page at build time (call at the end of the builder, after all
 *  pages have been added, so total-page-count is correct). Page 1 (cover)
 *  gets a smaller footer without the circular logo watermark. */
function drawFooter(doc) {
  const { page, margin, brand } = LAYOUT;
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // Circular SNW watermark — content pages only (skip cover).
    if (i > 1) {
      const wmSize = 22;
      const wmX = (page.w - wmSize) / 2;
      const wmY = page.h - wmSize - 14;
      // jsPDF supports per-image GState opacity via the graphics state stack.
      // The `snw-logo.jpg` is opaque; render at ~15% opacity for a subtle mark.
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.14 }));
        doc.addImage(snwLogo, "JPEG", wmX, wmY, wmSize, wmSize, undefined, "FAST");
        doc.restoreGraphicsState();
      } catch {
        // Very old jsPDF fallback — draw without opacity control.
        doc.addImage(snwLogo, "JPEG", wmX, wmY, wmSize, wmSize, undefined, "FAST");
      }
    }
    doc.setFont(LAYOUT.fonts.body, "italic");
    doc.setFontSize(8);
    doc.setTextColor(...hex(brand.subtle));
    doc.text("Satish Numero World", margin.x, page.h - 8);
    doc.text(`Page ${i} of ${total}`, page.w - margin.x, page.h - 8, { align: "right" });
  }
}

// ---------- shared report sections ------------------------------------------

function drawPlanetaryPositions(doc, r, y) {
  const planets = r.chart?.planets;
  if (!planets) return y;
  y = drawSectionHeading(doc, "Planetary Positions", y + 4);
  // Backend planets can arrive as either an object keyed by planet code (older
  // shape) or an array of {name, code, rashi_english, degree, nakshatra,
  // navamsha_sign_english, states, retrograde ...}. Normalise to rows.
  const list = Array.isArray(planets) ? planets : Object.values(planets);
  const rows = list.map((p) => {
    const stateBits = [];
    // `states` is the authoritative source (Retrograde, Vargottam, Exalted,
    // Debilitated). Fall back to the legacy retrograde bool for older payloads.
    if (Array.isArray(p.states) && p.states.length) {
      stateBits.push(...p.states);
    } else if (p.retrograde) {
      stateBits.push("Retrograde");
    }
    const state = stateBits.length ? stateBits.join(", ") : "Direct";
    return [
      p.name || p.code || "—",
      p.rashi_english || p.rashi || "—",
      p.degree != null
        ? (typeof p.degree === "number" ? p.degree.toFixed(2) : p.degree) + "°"
        : (p.deg_in_sign != null ? p.deg_in_sign.toFixed(2) + "°" : "—"),
      String(p.house ?? "—"),
      p.navamsha_sign_english || p.navamsha_sign || "—",
      state,
    ];
  });
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
    head: [["Graha", "Rashi", "Degree", "House", "Navamsha", "States"]],
    body: rows, theme: "grid",
    styles: { font: LAYOUT.fonts.body, fontSize: 9, cellPadding: 1.8, textColor: hex(LAYOUT.brand.body) },
    headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], font: LAYOUT.fonts.heading, fontStyle: "bold", fontSize: 9, halign: "center" },
    alternateRowStyles: { fillColor: [253, 250, 240] },
    columnStyles: {
      0: { fontStyle: "bold" },
      2: { halign: "right" },
      3: { halign: "center" },
      5: { textColor: hex(LAYOUT.brand.saffron), fontStyle: "italic" },
    },
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawVimshottariMahadasha(doc, r, y) {
  const md = r.chart?.dasha?.mahadashas;
  if (!md?.length) return y;
  y = drawSectionHeading(doc, "Vimshottari Mahadasha  ·  120-Year Cycle", y + 4);

  // Intro copy (mirrors the reference PDF's paragraph above the table).
  const cur = r.chart?.dasha?.current;
  const curLord   = cur?.mahadasha;
  const curAntar  = cur?.antardasha;
  const curPratya = cur?.pratyantardasha;
  const intro = "Vimshottari Mahadasha is the primary Vedic timing system spanning 120 years. Each planet rules for a set period, colouring the events, opportunities and lessons of that phase of life.";
  y = drawParagraph(doc, intro, y, { size: 9.5, leading: 5, color: LAYOUT.brand.body });
  if (curLord) {
    doc.setFont(LAYOUT.fonts.heading, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...hex(LAYOUT.brand.saffron));
    const chain = [curLord, curAntar, curPratya].filter(Boolean).join(" — ");
    doc.text(`Currently running:  ${chain}`, LAYOUT.margin.x, y);
    y += 6;
  }

  const rows = md.map((m) => [
    m.lord + (m.lord === curLord ? "   (current)" : ""),
    new Date(m.start).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    new Date(m.end).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    String(m.years),
  ]);
  autoTable(doc, {
    startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
    head: [["Mahadasha Lord", "Starts", "Ends", "Years"]],
    body: rows, theme: "striped",
    styles: { font: LAYOUT.fonts.body, fontSize: 10, cellPadding: 2, textColor: hex(LAYOUT.brand.body) },
    headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [253, 250, 240] },
    columnStyles: { 0: { fontStyle: "bold" }, 3: { halign: "right" } },
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
      // Skip any element already marked "no-print" (e.g. the "Click to expand"
      // hover hint on the kundali cards) so the PDF snapshot matches the
      // resting print state, not the interactive on-screen state.
      filter: (node) => {
        if (node.classList && node.classList.contains("no-print")) return false;
        return true;
      },
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

/** Snapshot-driven Kundali charts. In the reference reference PDF the
 *  D1 Lagna chart sits ABOVE the Planetary Positions table on the same page
 *  (page 2), while Chandra Rashi and Navamsha D9 share page 3. We build the
 *  pages accordingly here — the caller supplies the target page layout via
 *  the `layout` option: "d1" (just D1, medium size), "chandra+navamsha"
 *  (both stacked), or "all" (legacy behaviour). Falls back to vector diamonds
 *  if the DOM elements are missing.  */
async function drawKundaliChartsFromScreen(doc, reading, testIds, layout = "all") {
  const { page, margin, brand, fonts } = LAYOUT;
  const [d1Id, chandraId, navamshaId] = testIds;

  const wantD1       = layout === "d1"  || layout === "all";
  const wantChandra  = layout === "chandra+navamsha" || layout === "all";
  const wantNavamsha = layout === "chandra+navamsha" || layout === "all";

  const [d1Snap, chSnap, navSnap] = await Promise.all([
    wantD1       ? snapshotByTestId(d1Id)       : Promise.resolve(null),
    wantChandra  ? snapshotByTestId(chandraId)  : Promise.resolve(null),
    wantNavamsha ? snapshotByTestId(navamshaId) : Promise.resolve(null),
  ]);

  // If NOTHING captured (e.g. running from ReadingDetail where the on-screen
  // chart uses a different id), fall back to the pure-vector rendering — but
  // only for the "all" layout. For the reference-PDF layout ("d1" or
  // "chandra+navamsha") the caller already advanced to the target page, so
  // silently return null and let the caller handle empty space.
  if (!d1Snap && !chSnap && !navSnap) {
    if (layout === "all") drawKundaliChartsPage(doc, reading);
    return null;
  }

  const asc      = reading.chart?.ascendant_english      || "—";
  const chandLag = reading.chart?.chandra?.ascendant_english  || "—";
  const navAsc   = reading.chart?.navamsha?.ascendant_english || "—";
  const usableW  = page.w - margin.x * 2;

  const heading = (text, y, saffron = false) => {
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...hex(saffron ? brand.saffron : brand.ink));
    doc.text(text, page.w / 2, y, { align: "center", charSpace: 1.4 });
    doc.setDrawColor(...hex(brand.gold));
    doc.setLineWidth(0.3);
    doc.line(page.w / 2 - 32, y + 2, page.w / 2 + 32, y + 2);
    return y + 6;
  };

  const caption = (label, value, y) => {
    doc.setFont(fonts.heading, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...hex(brand.gold));
    doc.text(label, page.w / 2, y, { align: "center", charSpace: 1.5 });
    doc.setFont(fonts.body, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...hex(brand.ink));
    doc.text(value, page.w / 2, y + 5, { align: "center" });
    return y + 8;
  };

  if (layout === "d1" && d1Snap) {
    // Page 2 layout: D1 chart + caption, followed by planetary positions
    // rendered by the caller below. Chart occupies the top ~110 mm.
    let y = margin.y;
    y = heading("KUNDALI LAGNA CHART  ·  D1", y + 2);
    const { h } = drawSnapshot(doc, d1Snap, margin.x, y, usableW, 100);
    y += h + 2;
    caption("ASCENDANT (LAGNA)", asc, y);
    // Return so caller can continue with planetary positions on same page.
    return y + 10;
  }

  if (layout === "chandra+navamsha") {
    // Page 3 layout: Chandra Rashi (top half) + Navamsha D9 (bottom half).
    let y = margin.y;
    if (chSnap) {
      y = heading("CHANDRA RASHI CHART", y + 2);
      const { h } = drawSnapshot(doc, chSnap, margin.x, y, usableW, 95);
      y += h + 2;
      y = caption("CHANDRA LAGNA", chandLag, y);
      y += 6;
    }
    if (navSnap) {
      y = heading("NAVAMSHA CHART  ·  D9", y + 2);
      const { h } = drawSnapshot(doc, navSnap, margin.x, y, usableW, 95);
      y += h + 2;
      caption("NAVAMSHA ASCENDANT", navAsc, y);
    }
    return;
  }

  // Legacy "all" layout — kept for backward compatibility with ReadingDetail.
  doc.addPage();
  let y = margin.y;
  y = heading("VEDIC KUNDALI CHARTS", y + 2);
  y += 6;
  if (d1Snap) {
    const { h } = drawSnapshot(doc, d1Snap, margin.x, y, usableW, 100);
    y += h + 8;
  }
  const halfW = (usableW - 6) / 2;
  if (chSnap)  drawSnapshot(doc, chSnap,  margin.x,             y, halfW, 90);
  if (navSnap) drawSnapshot(doc, navSnap, margin.x + halfW + 6, y, halfW, 90);
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
//
// Layout matches the reference PDF Vedic-Astrology-Report.pdf (Feb 2026 spec):
//   Page 1 → Cover (SNW brand, Ganesha, name, 3×2 birth grid, Nakshatra summary)
//   Page 2 → KUNDALI LAGNA CHART · D1  +  PLANETARY POSITIONS table
//   Page 3 → CHANDRA RASHI CHART  +  NAVAMSHA CHART · D9
//   Page 4 → VIMSHOTTARI MAHADASHA · 120-YEAR CYCLE
//   Page 5+→ DETAILED VEDIC KUNDALI READING FOR <NAME>  +  AI advice
// The Basic builder uses the same skeleton without the AI-driven detail depth.

export async function buildBasicPdf(reading, inputs) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawAstroCoverPage(doc, reading, inputs, "Vedic Kundali Report");

  // Page 2: D1 chart on top, Planetary Positions table below
  doc.addPage();
  let y2 = null;
  if (reading.chart?.houses) {
    y2 = await drawKundaliChartsFromScreen(doc, reading, [
      "basic-expand-kundali-d1",
      "basic-expand-kundali-chandra",
      "basic-expand-kundali-navamsha",
    ], "d1");
  }
  if (y2 == null) y2 = LAYOUT.margin.y;
  drawPlanetaryPositions(doc, reading, y2);

  // Page 3: Chandra Rashi + Navamsha D9
  if (reading.chart?.chandra || reading.chart?.navamsha) {
    doc.addPage();
    await drawKundaliChartsFromScreen(doc, reading, [
      "basic-expand-kundali-d1",
      "basic-expand-kundali-chandra",
      "basic-expand-kundali-navamsha",
    ], "chandra+navamsha");
  }

  // Page 4: Vimshottari Mahadasha
  if (reading.chart?.dasha?.mahadashas?.length) {
    doc.addPage();
    drawVimshottariMahadasha(doc, reading, LAYOUT.margin.y);
  }

  // Page 5+: AI reading
  if (reading.advice) {
    doc.addPage();
    let y = LAYOUT.margin.y;
    const name = (inputs?.full_name || reading.summary?.name || "your reading").toUpperCase();
    y = drawFittedTitle(doc, `DETAILED VEDIC KUNDALI READING FOR ${name}`, y, { size: 14 });
    doc.setDrawColor(...hex(LAYOUT.brand.gold));
    doc.setLineWidth(0.3);
    doc.line(LAYOUT.margin.x + 20, y - 3, LAYOUT.page.w - LAYOUT.margin.x - 20, y - 3);
    y += 6;
    drawMarkdown(doc, reading.advice, y);
  }

  drawFooter(doc);
  return doc;
}

export async function buildPremiumAstroPdf(reading, inputs) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawAstroCoverPage(doc, reading, inputs, "Vedic Kundali Report");

  // Page 2: D1 Lagna Chart + Planetary Positions
  doc.addPage();
  let y2 = null;
  if (reading.chart?.houses) {
    y2 = await drawKundaliChartsFromScreen(doc, reading, [
      "expand-kundali-d1",
      "expand-kundali-chandra",
      "expand-kundali-navamsha",
    ], "d1");
  }
  if (y2 == null) y2 = LAYOUT.margin.y;
  drawPlanetaryPositions(doc, reading, y2);

  // Page 3: Chandra Rashi + Navamsha D9
  if (reading.chart?.chandra || reading.chart?.navamsha) {
    doc.addPage();
    await drawKundaliChartsFromScreen(doc, reading, [
      "expand-kundali-d1",
      "expand-kundali-chandra",
      "expand-kundali-navamsha",
    ], "chandra+navamsha");
  }

  // Page 4: Vimshottari Mahadasha
  if (reading.chart?.dasha?.mahadashas?.length) {
    doc.addPage();
    drawVimshottariMahadasha(doc, reading, LAYOUT.margin.y);
  }

  // Page 5+: Detailed AI reading
  if (reading.advice) {
    doc.addPage();
    let y = LAYOUT.margin.y;
    const name = (inputs?.full_name || reading.summary?.name || "you").toUpperCase();
    y = drawFittedTitle(doc, `DETAILED VEDIC KUNDALI READING FOR ${name}`, y, { size: 14 });
    doc.setDrawColor(...hex(LAYOUT.brand.gold));
    doc.setLineWidth(0.3);
    doc.line(LAYOUT.margin.x + 20, y - 3, LAYOUT.page.w - LAYOUT.margin.x - 20, y - 3);
    y += 4;
    doc.setFont(LAYOUT.fonts.heading, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...hex(LAYOUT.brand.saffron));
    doc.text("DETAILED PLANETARY READING", LAYOUT.page.w / 2, y, { align: "center", charSpace: 1.5 });
    y += 8;
    drawMarkdown(doc, reading.advice, y);
  }

  drawFooter(doc);
  return doc;
}

export async function buildPremiumNumerologyPdf(reading, inputs) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawNumerologyCoverPage(doc, reading, inputs);

  const num = reading.chart?.numerology;

  // Page 2: Numerology Overview (core numbers table)
  doc.addPage();
  let y = LAYOUT.margin.y;
  y = drawNumerologyCore(doc, num, y);

  // Page 3: Lo Shu Grid + Vedic Planetary Chart (raster snapshot of on-screen)
  doc.addPage();
  y = LAYOUT.margin.y;
  y = await drawNumerologyGridsFromScreen(doc, num, y, "premium-numerology-charts");

  // Page 4: Numerology Mahadasha (81-Year Cycle)
  const dasha = reading.chart?.numerology_dasha;
  if (dasha?.mahadashas?.length) {
    doc.addPage();
    y = LAYOUT.margin.y;
    y = drawSectionHeading(doc, "Vedic Numerology Mahadasha  ·  81-Year Cycle", y + 2);
    // Intro copy
    const intro = "The Vedic Numerology Mahadasha divides life into nine 9-year cycles governed by planetary rulers derived from your Mulank. Each Mahadasha awakens themes that shape work, relationships, and inner growth.";
    y = drawParagraph(doc, intro, y, { size: 9.5, leading: 5 });
    const cur = dasha.current?.mahadasha;
    const rows = dasha.mahadashas.map((m) => [
      `${m.number}${m.number === cur ? "   (current)" : ""}`,
      m.name || NUMEROLOGY_RULERS[m.number] || "—",
      new Date(m.start).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      new Date(m.end).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      String(m.years),
    ]);
    autoTable(doc, {
      startY: y, margin: { left: LAYOUT.margin.x, right: LAYOUT.margin.x },
      head: [["#", "Ruler", "Starts", "Ends", "Years"]],
      body: rows, theme: "striped",
      styles: { font: LAYOUT.fonts.body, fontSize: 10, cellPadding: 2, textColor: hex(LAYOUT.brand.body) },
      headStyles: { fillColor: hex(LAYOUT.brand.ink), textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      alternateRowStyles: { fillColor: [253, 250, 240] },
      columnStyles: { 0: { halign: "center", fontStyle: "bold" }, 4: { halign: "right" } },
    });
  }

  // Page 5+: Numerology AI reading (only if backend returns one)
  if (reading.numerology_advice) {
    doc.addPage();
    y = LAYOUT.margin.y;
    const name = (inputs?.full_name || reading.summary?.name || "you").toUpperCase();
    y = drawFittedTitle(doc, `DETAILED VEDIC NUMEROLOGY READING FOR ${name}`, y, { size: 14 });
    doc.setDrawColor(...hex(LAYOUT.brand.gold));
    doc.setLineWidth(0.3);
    doc.line(LAYOUT.margin.x + 20, y - 3, LAYOUT.page.w - LAYOUT.margin.x - 20, y - 3);
    y += 6;
    drawMarkdown(doc, reading.numerology_advice, y);
  }

  drawFooter(doc);
  return doc;
}
