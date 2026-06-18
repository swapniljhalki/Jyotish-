import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI-generated advice text with Markdown support (headings, bold,
 * italics, lists, tables). Visual styling is tuned for the "Starbucks-style"
 * light theme used across reading pages and printed PDFs.
 *
 * Inline styles are used (instead of Tailwind arbitrary classes) so the
 * `html-to-image` PDF export reliably preserves spacing & colors.
 */

const HEADING_BASE = {
  fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  color: "#2A1A05",
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: "-0.01em",
};

const MdH1 = (props) => (
  <h2 style={{ ...HEADING_BASE, fontSize: "1.75rem", marginTop: "1.75rem", marginBottom: "0.85rem" }} {...props} />
);
const MdH2 = (props) => (
  <h2 style={{ ...HEADING_BASE, fontSize: "1.5rem", marginTop: "1.5rem", marginBottom: "0.75rem" }} {...props} />
);
const MdH3 = (props) => (
  <h3 style={{ ...HEADING_BASE, fontSize: "1.2rem", marginTop: "1.25rem", marginBottom: "0.6rem", color: "#5C3A09" }} {...props} />
);
const MdH4 = (props) => (
  <h4 style={{ ...HEADING_BASE, fontSize: "1.05rem", marginTop: "1rem", marginBottom: "0.5rem", color: "#6B3410" }} {...props} />
);
const MdP = (props) => <p style={{ margin: "0 0 0.95rem 0", lineHeight: 1.8 }} {...props} />;
const MdStrong = (props) => <strong style={{ color: "#5C3A09", fontWeight: 700 }} {...props} />;
const MdEm = (props) => <em style={{ color: "#8B5E1A", fontStyle: "italic" }} {...props} />;
const MdUl = ({ ordered, ...rest }) => (
  <ul style={{ margin: "0.4rem 0 1rem 1.25rem", padding: 0, listStyle: "disc", lineHeight: 1.75 }} {...rest} />
);
const MdOl = ({ ordered, ...rest }) => (
  <ol style={{ margin: "0.4rem 0 1rem 1.5rem", padding: 0, listStyle: "decimal", lineHeight: 1.75 }} {...rest} />
);
const MdLi = ({ ordered, ...rest }) => <li style={{ marginBottom: "0.35rem" }} {...rest} />;
const MdBlockquote = (props) => (
  <blockquote
    style={{
      borderLeft: "3px solid #D4AF37",
      paddingLeft: "0.9rem",
      margin: "0.75rem 0 1rem 0",
      color: "#6B3410",
      fontStyle: "italic",
    }}
    {...props}
  />
);
const MdHr = () => <hr style={{ border: 0, borderTop: "1px solid rgba(139,94,26,0.2)", margin: "1.25rem 0" }} />;
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
        padding: "0.85rem 1rem",
        borderRadius: "6px",
        overflowX: "auto",
        fontSize: "0.85em",
        color: "#2A1A05",
        margin: "0.75rem 0",
      }}
    >
      <code {...rest} />
    </pre>
  );
const MdTable = (props) => (
  <div style={{ overflowX: "auto", margin: "0.75rem 0" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }} {...props} />
  </div>
);
const MdTh = (props) => (
  <th
    style={{
      textAlign: "left",
      padding: "0.5rem 0.75rem",
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
      padding: "0.5rem 0.75rem",
      borderBottom: "1px solid rgba(139,94,26,0.12)",
      color: "#2A1A05",
    }}
    {...props}
  />
);
const MdA = (props) => (
  <a style={{ color: "#8B5E1A", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer" {...props} />
);

const COMPONENTS = {
  h1: MdH1,
  h2: MdH2,
  h3: MdH3,
  h4: MdH4,
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

const REMARK_PLUGINS = [remarkGfm];

export default function AdviceMarkdown({ children, testId }) {
  if (!children) return null;
  return (
    <div
      className="advice-markdown font-body"
      data-testid={testId}
      style={{ color: "#2A1A05", fontSize: "0.98rem", lineHeight: 1.8 }}
    >
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {String(children)}
      </ReactMarkdown>
    </div>
  );
}
