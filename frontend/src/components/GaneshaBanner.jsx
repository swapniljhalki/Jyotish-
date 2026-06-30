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
