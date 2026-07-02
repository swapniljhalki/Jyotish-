import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI-generated advice text with Markdown support (headings, bold,
 * italics, lists, tables). Visual styling is tuned for the "Starbucks-style"
 * light theme used across reading pages and printed PDFs.
 *
 * Inline styles are used (instead of Tailwind arbitrary classes) so the
 * `html-to-image` PDF export reliably preserves spacing & colors.
 *
 * `compact` variant: tightens fonts/spacing so a full ~9-section, ~700-word
 * Premium reading fits on a single A4 page of the exported PDF.
 */

const HEADING_BASE = {
  fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  color: "#2A1A05",
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
};

// Default (spacious) variant — used by Basic tier & archive pages
const SPACIOUS = {
  h1: { fontSize: "1.75rem", marginTop: "1.75rem", marginBottom: "0.85rem" },
  h2: { fontSize: "1.5rem",  marginTop: "1.5rem",  marginBottom: "0.75rem" },
  h3: { fontSize: "1.2rem",  marginTop: "1.25rem", marginBottom: "0.6rem",  color: "#5C3A09" },
  h4: { fontSize: "1.05rem", marginTop: "1rem",    marginBottom: "0.5rem",  color: "#6B3410" },
  pMargin: "0 0 0.95rem 0",
  pLineHeight: 1.8,
  bodySize: "0.98rem",
  bodyLineHeight: 1.8,
  ulMargin: "0.4rem 0 1rem 1.25rem",
  liMargin: "0.35rem",
};

// Compact variant — Premium tier PDF (fits full reading on 1 page)
const COMPACT = {
  h1: { fontSize: "1.15rem", marginTop: "0.75rem", marginBottom: "0.3rem" },
  h2: { fontSize: "1.05rem", marginTop: "0.7rem",  marginBottom: "0.28rem" },
  h3: { fontSize: "0.95rem", marginTop: "0.6rem",  marginBottom: "0.25rem", color: "#5C3A09" },
  h4: { fontSize: "0.9rem",  marginTop: "0.5rem",  marginBottom: "0.2rem",  color: "#6B3410" },
  pMargin: "0 0 0.35rem 0",
  pLineHeight: 1.4,
  bodySize: "0.78rem",
  bodyLineHeight: 1.4,
  ulMargin: "0.2rem 0 0.4rem 1.1rem",
  liMargin: "0.15rem",
};

function buildComponents(v) {
  const H = (tag, s) => {
    const Tag = tag;
    const Comp = (props) => (
      <Tag style={{ ...HEADING_BASE, ...s }} {...props} />
    );
    Comp.displayName = `MdHeading_${tag}`;
    return Comp;
  };

  const MdP = (props) => <p style={{ margin: v.pMargin, lineHeight: v.pLineHeight }} {...props} />;
  const MdStrong = (props) => <strong style={{ color: "#5C3A09", fontWeight: 700 }} {...props} />;
  const MdEm = (props) => <em style={{ color: "#5C3A09", fontStyle: "italic" }} {...props} />;
  const MdUl = ({ ordered: _o, ...rest }) => (
    <ul style={{ margin: v.ulMargin, padding: 0, listStyle: "disc", lineHeight: v.pLineHeight }} {...rest} />
  );
  const MdOl = ({ ordered: _o, ...rest }) => (
    <ol style={{ margin: v.ulMargin, padding: 0, listStyle: "decimal", lineHeight: v.pLineHeight }} {...rest} />
  );
  const MdLi = ({ ordered: _o, ...rest }) => <li style={{ marginBottom: v.liMargin }} {...rest} />;
  const MdBlockquote = (props) => (
    <blockquote
      style={{
        borderLeft: "3px solid #D4AF37",
        paddingLeft: "0.9rem",
        margin: "0.5rem 0 0.6rem 0",
        color: "#6B3410",
        fontStyle: "italic",
      }}
      {...props}
    />
  );
  const MdHr = () => <hr style={{ border: 0, borderTop: "1px solid rgba(139,94,26,0.2)", margin: "0.6rem 0" }} />;
  const MdCode = ({ inline, ...rest }) =>
    inline ? (
      <code
        style={{
          background: "rgba(139,94,26,0.08)",
          padding: "0.1rem 0.35rem",
          borderRadius: "3px",
          fontSize: "0.92em",
          color: "#5C3A09",
        }}
        {...rest}
      />
    ) : (
      <pre
        style={{
          background: "rgba(139,94,26,0.06)",
          padding: "0.6rem 0.8rem",
          borderRadius: "6px",
          overflowX: "auto",
          fontSize: "0.82em",
          color: "#2A1A05",
          margin: "0.5rem 0",
        }}
      >
        <code {...rest} />
      </pre>
    );
  const MdTable = (props) => (
    <div style={{ overflowX: "auto", margin: "0.5rem 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }} {...props} />
    </div>
  );
  const MdTh = (props) => (
    <th
      style={{
        textAlign: "left",
        padding: "0.35rem 0.6rem",
        borderBottom: "1px solid rgba(139,94,26,0.25)",
        color: "#5C3A09",
        fontWeight: 600,
      }}
      {...props}
    />
  );
  const MdTd = (props) => (
    <td
      style={{
        padding: "0.35rem 0.6rem",
        borderBottom: "1px solid rgba(139,94,26,0.12)",
        color: "#2A1A05",
      }}
      {...props}
    />
  );
  const MdA = (props) => (
    <a style={{ color: "#5C3A09", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer" {...props} />
  );

  return {
    h1: H("h2", v.h1),
    h2: H("h2", v.h2),
    h3: H("h3", v.h3),
    h4: H("h4", v.h4),
    p: MdP,
    strong: MdStrong,
    em: MdEm,
    ul: MdUl,
    ol: MdOl,
    li: MdLi,
    blockquote: MdBlockquote,
    hr: MdHr,
    code: MdCode,
    table: MdTable,
    th: MdTh,
    td: MdTd,
    a: MdA,
  };
}

const COMPONENTS_SPACIOUS = buildComponents(SPACIOUS);
const COMPONENTS_COMPACT = buildComponents(COMPACT);
const REMARK_PLUGINS = [remarkGfm];

export default function AdviceMarkdown({ children, testId, compact = false }) {
  if (!children) return null;
  const v = compact ? COMPACT : SPACIOUS;
  const components = compact ? COMPONENTS_COMPACT : COMPONENTS_SPACIOUS;
  return (
    <div
      className="advice-markdown font-body"
      data-testid={testId}
      style={{ color: "#2A1A05", fontSize: v.bodySize, lineHeight: v.bodyLineHeight }}
    >
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {String(children)}
      </ReactMarkdown>
    </div>
  );
}
