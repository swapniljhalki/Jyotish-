import ganeshaImg from "../assets/ganesha.jpg";

/**
 * GaneshaBanner — centered Ganesha image with the traditional invocation,
 * shown at the top of the Basic-tier PDF report.
 */
export default function GaneshaBanner() {
  return (
    <div
      className="ganesha-banner"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "16px 0 24px 0",
        width: "100%",
      }}
      data-testid="ganesha-banner"
    >
      {/* Brand header — "Satish Numero World" */}
      <div
        style={{
          width: "100%",
          textAlign: "center",
          borderTop: "1px solid #C9A227",
          borderBottom: "1px solid #C9A227",
          padding: "10px 0 12px 0",
          marginBottom: "18px",
          background: "linear-gradient(90deg, #FFF8E7 0%, #FFFCF2 50%, #FFF8E7 100%)",
        }}
        data-testid="brand-header"
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
            fontSize: "22pt",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#8B4513",
            lineHeight: 1.1,
          }}
        >
          Satish Numero World
        </div>
        <div
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: "8pt",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#B8860B",
            marginTop: "4px",
          }}
        >
          Numerology · Astrology · Tarot
        </div>
      </div>

      <img
        src={ganeshaImg}
        alt="Lord Ganesha"
        style={{
          width: "min(320px, 60%)",
          height: "auto",
          display: "block",
          margin: "0 auto",
        }}
      />
      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: "16pt",
          fontStyle: "italic",
          color: "#2A1A05",
          marginTop: "12px",
        }}
      >
        श्री गणेशाय नमः
      </div>
      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: "10pt",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#C9A227",
          marginTop: "6px",
        }}
      >
        Vakratunda Mahakaya · Suryakoti Samaprabha
      </div>
    </div>
  );
}
