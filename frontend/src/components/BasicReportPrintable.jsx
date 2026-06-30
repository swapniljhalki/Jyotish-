import KundaliChart from "./KundaliChart";
import snwLogo from "../assets/snw-logo.jpg";

/**
 * Dedicated print-only Basic-tier report template.
 *
 * Styling follows the user-supplied design spec:
 *   Page:     A4 (210 × 297 mm), 0.75" (19 mm) margins
 *   Palette:  Navy #0B1F3A, Gold #C9A227, Maroon #7A1F1F, Body #333,
 *             Background #FFFFFF
 *   Fonts:    Cinzel (titles/headings), EB Garamond (cover title),
 *             Lora / Noto Serif (body & tables)
 *
 * Every top-level section carries `data-pdf-page="..."` so `exportPdf`
 * keeps each one whole when slicing canvas → PDF pages.
 */

// Colors / fonts kept as constants so they don't drift between sections.
export const C = {
  navy:   "#0B1F3A",
  gold:   "#C9A227",
  maroon: "#7A1F1F",
  body:   "#333333",
  faint:  "rgba(11,31,58,0.10)",
  bg:     "#FFFFFF",
};
const FAMILY = {
  display: "'Cinzel', 'EB Garamond', 'Times New Roman', serif",
  body:    "'Lora', 'Noto Serif', 'Times New Roman', serif",
};

const PAGE_WIDTH_PX = 794;   // 210 mm at 96 dpi
const SECTION_PADDING = "32px 56px"; // ≈19 mm L/R margins inside the 794-px page

function pageBaseStyle(extra = {}) {
  return {
    width: `${PAGE_WIDTH_PX}px`,
    padding: SECTION_PADDING,
    background: C.bg,
    color: C.body,
    fontFamily: FAMILY.body,
    fontSize: "12pt",
    lineHeight: 1.55,
    boxSizing: "border-box",
    ...extra,
  };
}

function H2(props) {
  return (
    <h2
      {...props}
      style={{
        fontFamily: FAMILY.display,
        fontSize: "18pt",
        fontWeight: 600,
        color: C.navy,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 18px 0",
        borderBottom: `1.5px solid ${C.gold}`,
        paddingBottom: "8px",
        ...(props.style || {}),
      }}
    />
  );
}

function H3(props) {
  return (
    <h3
      {...props}
      style={{
        fontFamily: FAMILY.body,
        fontSize: "14pt",
        fontWeight: 700,
        color: C.maroon,
        margin: "16px 0 8px 0",
        ...(props.style || {}),
      }}
    />
  );
}

function P(props) {
  return (
    <p
      {...props}
      style={{
        margin: "0 0 12px 0",
        fontFamily: FAMILY.body,
        fontSize: "11.5pt",
        color: C.body,
        lineHeight: 1.65,
        ...(props.style || {}),
      }}
    />
  );
}

// Strip "## Heading" markdown to {heading, body} pairs so we can render with
// the spec's typography (Lora Bold maroon subheads).
function splitAdviceSections(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^#{2,3}\s+(.+?)\s*$/);
    if (m) {
      if (cur) sections.push(cur);
      cur = { heading: m[1].trim(), body: "" };
    } else if (cur) {
      cur.body += line + "\n";
    } else if (line.trim()) {
      // text appearing before any heading — accumulate under "Preamble"
      cur = cur || { heading: "Preamble", body: "" };
      cur.body += line + "\n";
    }
  }
  if (cur) sections.push(cur);
  // Drop a synthetic "Preamble" if it ended up empty / just whitespace; if it
  // has content, fold it into the first real section so we don't get an
  // orphan heading in the PDF.
  if (sections.length > 1 && sections[0].heading === "Preamble") {
    sections[1].body = `${sections[0].body}\n\n${sections[1].body}`.trim();
    sections.shift();
  } else if (sections.length === 1 && sections[0].heading === "Preamble" && !sections[0].body.trim()) {
    sections.shift();
  }
  // Clean **bold** markers but keep their content (we render plain serif)
  return sections.map((s) => ({
    heading: s.heading,
    body: s.body.replace(/\*\*(.+?)\*\*/g, "$1").trim(),
  }));
}

function CoverPage({ name, dobLong, tob, pob, generatedOn }) {
  return (
    <section data-pdf-page="cover" style={pageBaseStyle({ minHeight: "1050px", textAlign: "center", padding: "80px 56px" })}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
        <img src={snwLogo} alt="SNW" style={{ width: "110px", height: "110px", borderRadius: "50%" }} />
      </div>
      <div
        style={{
          display: "inline-block",
          padding: "4px 18px",
          border: `1px solid ${C.gold}`,
          color: C.gold,
          fontFamily: FAMILY.display,
          fontSize: "10pt",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          marginBottom: "28px",
        }}
      >
        Satish Numero World
      </div>
      <h1
        style={{
          fontFamily: FAMILY.display,
          fontSize: "32pt",
          fontWeight: 700,
          color: C.gold,
          margin: "0 0 16px 0",
          letterSpacing: "0.04em",
        }}
      >
        Personalized Vedic Astrology Report
      </h1>
      <div
        style={{
          fontFamily: FAMILY.display,
          fontSize: "16pt",
          color: C.navy,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "44px",
        }}
      >
        A Jyotisha Reading
      </div>
      {/* Decorative Om mandala */}
      <div style={{ margin: "0 auto 44px auto", width: "180px", height: "180px", position: "relative" }}>
        <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }} aria-hidden="true">
          <defs>
            <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor={C.gold} stopOpacity="0.25" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill="url(#ringGrad)" stroke={C.gold} strokeWidth="1.4" />
          <circle cx="100" cy="100" r="78" fill="none" stroke={C.gold} strokeWidth="0.5" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * 80}
                y1={100 + Math.sin(a) * 80}
                x2={100 + Math.cos(a) * 92}
                y2={100 + Math.sin(a) * 92}
                stroke={C.gold}
                strokeWidth="0.6"
              />
            );
          })}
          <text
            x="100" y="118"
            textAnchor="middle"
            fontSize="60"
            fill={C.maroon}
            fontFamily="'EB Garamond', serif"
          >ॐ</text>
        </svg>
      </div>
      <table style={{ margin: "0 auto", borderSpacing: "0", textAlign: "left" }}>
        <tbody>
          {[
            ["Prepared for", name || "—"],
            ["Date of Birth", dobLong || "—"],
            ["Time of Birth", tob || "—"],
            ["Place of Birth", pob || "—"],
          ].map(([k, v]) => (
            <tr key={k}>
              <td
                style={{
                  padding: "6px 24px 6px 0",
                  fontFamily: FAMILY.body,
                  fontSize: "10.5pt",
                  color: C.navy,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  verticalAlign: "top",
                }}
              >
                {k}
              </td>
              <td style={{ padding: "6px 0", fontFamily: FAMILY.body, fontSize: "12pt", color: C.body }}>
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: "44px", fontFamily: FAMILY.body, fontSize: "10pt", color: "#666", letterSpacing: "0.10em", textTransform: "uppercase" }}>
        Report generated on {generatedOn}
      </div>
    </section>
  );
}

function TableOfContents() {
  const items = [
    ["1.", "Introduction",          "3"],
    ["2.", "Birth Details",         "4"],
    ["3.", "Kundali Lagna Chart",   "5"],
    ["4.", "Chandra Rashi Chart",   "6"],
    ["5.", "Navamsha (D9) Chart",   "7"],
    ["6.", "Planetary Positions",   "8"],
    ["7.", "Nakshatra Report",      "9"],
    ["8.", "Detailed Personalized Reading", "10+"],
  ];
  return (
    <section data-pdf-page="toc" style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>Table of Contents</H2>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map(([num, label, page]) => (
          <li
            key={label}
            style={{
              display: "flex",
              alignItems: "baseline",
              padding: "10px 0",
              borderBottom: `1px dotted ${C.faint}`,
              fontFamily: FAMILY.body,
              fontSize: "12pt",
              color: C.body,
            }}
          >
            <span style={{ width: "32px", color: C.maroon, fontWeight: 700 }}>{num}</span>
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ color: C.navy, fontWeight: 700 }}>{page}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IntroductionPage() {
  return (
    <section data-pdf-page="intro" style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>Introduction</H2>
      <H3>About Vedic Astrology</H3>
      <P>
        Vedic astrology (Jyotisha — &ldquo;the science of light&rdquo;) is a 5,000-year-old system rooted in the
        Vedas of ancient India. Unlike Western astrology, it uses the sidereal zodiac — the literal
        constellations visible in the night sky — and is anchored by the Lahiri Ayanamsa, the
        Government of India standard for the precession of the equinoxes.
      </P>
      <P>
        Jyotisha sees a birth chart as a map of karmic patterns: the celestial geometry of the moment
        a soul takes its first breath. By interpreting the rashis (signs), grahas (planets), bhavas
        (houses) and nakshatras (lunar mansions), it reveals the strengths, themes and timing the
        seeker brought into this life — and the practices that bring those gifts into bloom.
      </P>

      <H3>How to read this report</H3>
      <P>
        This report opens with your full birth details, including geographic coordinates, time zone
        and the ayanamsa used. Next, you&apos;ll find three complementary charts — the Lagna (rising sign),
        the Chandra Rashi (moon sign) and the Navamsha (D9, the chart of marriage &amp; dharma) —
        followed by a planetary-positions table and a focused report on your birth nakshatra. The
        final section is a long-form personalized reading covering nine areas of life. Read it
        slowly; take notes on what resonates and revisit it as the year unfolds.
      </P>

      <H3>Important Disclaimer</H3>
      <P style={{ fontStyle: "italic", color: "#555" }}>
        This report is offered for self-reflection, study and spiritual practice only. It is not a
        substitute for medical, legal, financial or psychological advice. Astrology helps you see
        your patterns clearly — your free will, your actions and the grace you cultivate are
        always the deciding factors.
      </P>
    </section>
  );
}

function BirthDetailsPage({ birth }) {
  const rows = [
    ["Name",          birth.name],
    ["Date of Birth", birth.dobLong],
    ["Time of Birth", birth.tob],
    ["Place of Birth", birth.pob],
    ["Latitude",      birth.lat],
    ["Longitude",     birth.lon],
    ["Time Zone",     birth.tz],
    ["Ayanamsa",      birth.ayanamsa],
    ["Nakshatra",     birth.nakshatra],
    ["Ascendant",     birth.ascendant],
    ["Sun Sign",      birth.sun],
    ["Moon Sign",     birth.moon],
  ];
  return (
    <section data-pdf-page="birth-details" style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>Birth Details</H2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FAMILY.body, fontSize: "11pt" }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td
                style={{
                  width: "38%",
                  padding: "10px 14px",
                  borderBottom: `1px solid ${C.faint}`,
                  color: C.navy,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: "10pt",
                  verticalAlign: "top",
                  background: "rgba(201,162,39,0.04)",
                }}
              >
                {k}
              </td>
              <td
                style={{
                  padding: "10px 14px",
                  borderBottom: `1px solid ${C.faint}`,
                  color: C.body,
                  fontSize: "11.5pt",
                }}
              >
                {v || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ChartPage({ id, title, chart, ascendantLabel, ascendantName }) {
  if (!chart) return null;
  return (
    <section data-pdf-page={id} style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>{title}</H2>
      <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
        <div style={{ width: "440px" }}>
          <KundaliChart chart={chart} large />
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: "14px" }}>
        <div
          style={{
            fontFamily: FAMILY.body,
            fontSize: "10pt",
            color: C.maroon,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {ascendantLabel}
        </div>
        <div style={{ fontFamily: FAMILY.display, fontSize: "18pt", fontWeight: 600, color: C.navy, marginTop: "4px" }}>
          {ascendantName}
        </div>
      </div>
    </section>
  );
}

function PlanetTablePage({ planets }) {
  return (
    <section data-pdf-page="planets" style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>Planetary Positions</H2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FAMILY.body, fontSize: "11pt", color: "#000" }}>
        <thead>
          <tr style={{ background: C.navy, color: "#fff" }}>
            {["Graha", "Rashi", "Degree", "House", "Nakshatra", "Pada"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontFamily: FAMILY.body,
                  fontSize: "10.5pt",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(planets || []).map((p, i) => (
            <tr key={p.code} style={{ background: i % 2 === 0 ? "#fff" : "rgba(201,162,39,0.05)" }}>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.faint}`, fontWeight: 600, color: C.navy }}>
                {p.name}
              </td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.faint}` }}>{p.rashi_english}</td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.faint}` }}>{p.degree}°</td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.faint}`, color: C.maroon, fontWeight: 700 }}>
                {p.house}
              </td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.faint}` }}>{p.nakshatra || "—"}</td>
              <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.faint}` }}>{p.nakshatra_pada || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function NakshatraReportPage({ nr }) {
  if (!nr) return null;
  return (
    <section data-pdf-page="nakshatra-report" style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>Nakshatra Report — Moon&apos;s Star</H2>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
        <div>
          <div style={{ fontFamily: FAMILY.display, fontSize: "28pt", fontWeight: 700, color: C.navy }}>
            {nr.name}
          </div>
          <div style={{ fontFamily: FAMILY.body, fontSize: "13pt", color: C.maroon, marginTop: "2px" }}>
            {nr.sanskrit} · Pada {nr.pada}
          </div>
        </div>
        <div style={{ fontFamily: FAMILY.body, fontSize: "10.5pt", color: C.body, textAlign: "right" }}>
          {nr.range}
        </div>
      </div>
      <P>{nr.description}</P>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px", fontFamily: FAMILY.body, fontSize: "11pt" }}>
        <tbody>
          {[
            ["Deity",   nr.deity],
            ["Symbol",  nr.symbol],
            ["Ruler",   nr.ruler],
            ["Gana",    nr.gana],
            ["Quality", nr.quality],
          ].map(([k, v]) => (
            <tr key={k}>
              <td
                style={{
                  width: "32%",
                  padding: "9px 14px",
                  borderBottom: `1px solid ${C.faint}`,
                  color: C.navy,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: "10pt",
                  background: "rgba(201,162,39,0.04)",
                }}
              >
                {k}
              </td>
              <td style={{ padding: "9px 14px", borderBottom: `1px solid ${C.faint}`, color: C.body }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReadingPage({ advice }) {
  const sections = splitAdviceSections(advice);
  if (sections.length === 0) return null;
  return (
    <section data-pdf-page="reading" style={pageBaseStyle({ minHeight: "1050px" })}>
      <H2>Detailed Personalized Reading</H2>
      {sections.map((s) => (
        <div key={s.heading} data-pdf-page={`reading-${s.heading}`} style={{ marginBottom: "10px" }}>
          <H3>{s.heading}</H3>
          {s.body.split(/\n{2,}/).map((para, i) => (
            <P key={i}>{para.replace(/\n/g, " ")}</P>
          ))}
        </div>
      ))}
    </section>
  );
}

/**
 * Public entry: renders ALL report pages in print order.
 * `birth` must contain all the visible metadata; pass localized labels in.
 */
export default function BasicReportPrintable({ birth, chart, advice, nakshatraReport, generatedOn }) {
  if (!chart) return null;
  return (
    <div
      data-testid="basic-report-printable"
      style={{
        width: `${PAGE_WIDTH_PX}px`,
        background: C.bg,
        color: C.body,
        fontFamily: FAMILY.body,
      }}
    >
      <CoverPage
        name={birth.name}
        dobLong={birth.dobLong}
        tob={birth.tob}
        pob={birth.pob}
        generatedOn={generatedOn}
      />
      <TableOfContents />
      <IntroductionPage />
      <BirthDetailsPage birth={birth} />
      <ChartPage
        id="lagna-chart"
        title="Kundali Lagna Chart"
        chart={chart}
        ascendantLabel="Ascendant (Lagna)"
        ascendantName={chart.ascendant_english}
      />
      {chart.chandra && (
        <ChartPage
          id="chandra-chart"
          title="Chandra Rashi Chart"
          chart={chart.chandra}
          ascendantLabel="Chandra Lagna"
          ascendantName={chart.chandra.ascendant_english}
        />
      )}
      {chart.navamsha && (
        <ChartPage
          id="navamsha-chart"
          title="Navamsha Chart (D9)"
          chart={chart.navamsha}
          ascendantLabel="Navamsha Ascendant"
          ascendantName={chart.navamsha.ascendant_english}
        />
      )}
      <PlanetTablePage planets={chart.planets} />
      <NakshatraReportPage nr={nakshatraReport || chart.nakshatra_report} />
      <ReadingPage advice={advice} />
    </div>
  );
}
