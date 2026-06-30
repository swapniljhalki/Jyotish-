/**
 * GaneshaBanner — a tasteful decorative banner used at the top of the PDF report.
 *
 * Renders an inline SVG illustration of Lord Ganesha framed by lotus petals and
 * gold ornaments, with the traditional invocation "श्री गणेशाय नमः" beneath.
 * SVG is self-contained (no external image fetch) so it always renders correctly
 * inside html-to-image PDF capture.
 */
export default function GaneshaBanner() {
  const GOLD = "#C9A227";
  const DEEP = "#7A1F1F";
  const INK  = "#2A1A05";

  return (
    <div
      className="ganesha-banner"
      style={{ textAlign: "center", padding: "16px 0 24px 0" }}
      data-testid="ganesha-banner"
    >
      <svg
        viewBox="0 0 480 240"
        style={{ width: "min(420px, 70%)", height: "auto" }}
        aria-label="Lord Ganesha invocation"
      >
        {/* Decorative side flourishes — left */}
        <g stroke={GOLD} strokeWidth="1.4" fill="none">
          <path d="M 20 130 Q 60 110 95 130" />
          <path d="M 20 130 Q 60 150 95 130" />
          <circle cx="20" cy="130" r="3" fill={GOLD} />
        </g>
        {/* Decorative side flourishes — right */}
        <g stroke={GOLD} strokeWidth="1.4" fill="none">
          <path d="M 460 130 Q 420 110 385 130" />
          <path d="M 460 130 Q 420 150 385 130" />
          <circle cx="460" cy="130" r="3" fill={GOLD} />
        </g>

        {/* Lotus base petals */}
        <g fill="none" stroke={DEEP} strokeWidth="1.2">
          <path d="M 240 195 Q 195 175 175 195 Q 200 215 240 200 Z" />
          <path d="M 240 195 Q 285 175 305 195 Q 280 215 240 200 Z" />
          <path d="M 240 195 Q 215 165 240 145 Q 265 165 240 195 Z" />
        </g>

        {/* Halo arch behind Ganesha */}
        <path
          d="M 160 175 A 80 80 0 0 1 320 175"
          fill="none"
          stroke={GOLD}
          strokeWidth="2.2"
        />
        <path
          d="M 170 175 A 70 70 0 0 1 310 175"
          fill="none"
          stroke={GOLD}
          strokeWidth="0.8"
          strokeDasharray="2,4"
        />

        {/* === Ganesha silhouette (stylised line art) === */}
        <g stroke={DEEP} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none">
          {/* Crown / mukut */}
          <path d="M 220 100 L 230 78 L 240 92 L 250 78 L 260 100 Z" />
          <circle cx="240" cy="74" r="3" fill={GOLD} stroke="none" />

          {/* Head (rounded) */}
          <path d="M 200 110 Q 200 145 240 150 Q 280 145 280 110 Q 280 95 240 95 Q 200 95 200 110 Z" />

          {/* Ears (large, fan-shaped) */}
          <path d="M 200 110 Q 178 108 175 130 Q 178 152 198 145" />
          <path d="M 280 110 Q 302 108 305 130 Q 302 152 282 145" />

          {/* Tilak (forehead mark) */}
          <path d="M 240 105 L 240 122" stroke={GOLD} strokeWidth="1.8" />
          <path d="M 234 110 L 246 110" stroke={GOLD} strokeWidth="1.5" />

          {/* Eyes */}
          <circle cx="225" cy="123" r="2" fill={DEEP} stroke="none" />
          <circle cx="255" cy="123" r="2" fill={DEEP} stroke="none" />

          {/* Trunk — curling to the left (auspicious orientation) */}
          <path d="M 240 138 Q 232 152 222 158 Q 212 162 218 172 Q 226 178 234 170" />

          {/* Tusk hint */}
          <path d="M 232 145 L 228 152" />

          {/* Body — seated lotus pose */}
          <path d="M 195 175 Q 195 200 240 200 Q 285 200 285 175" />

          {/* Belly */}
          <circle cx="240" cy="180" r="14" />

          {/* Folded legs */}
          <path d="M 215 195 Q 230 205 240 200" />
          <path d="M 265 195 Q 250 205 240 200" />

          {/* Arms — four arms */}
          {/* Upper right arm holding lotus */}
          <path d="M 275 165 Q 300 150 305 130" />
          <circle cx="305" cy="125" r="4" fill={GOLD} stroke={DEEP} />
          {/* Upper left arm holding axe (parashu) */}
          <path d="M 205 165 Q 180 150 175 130" />
          <path d="M 172 122 L 178 128 L 168 132 Z" fill={GOLD} stroke={DEEP} />
          {/* Lower right arm — abhaya mudra (blessing) */}
          <path d="M 268 175 Q 290 180 295 195" />
          <path d="M 293 195 Q 296 188 300 193" />
          {/* Lower left arm holding modak */}
          <path d="M 212 175 Q 190 180 185 195" />
          <circle cx="183" cy="194" r="4" fill={GOLD} stroke={DEEP} />
        </g>

        {/* Sanskrit invocation */}
        <text
          x="240"
          y="232"
          textAnchor="middle"
          fontFamily="'EB Garamond', 'Georgia', serif"
          fontSize="16"
          fill={INK}
          fontStyle="italic"
        >
          श्री गणेशाय नमः
        </text>
      </svg>

      <div
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: "11pt",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: GOLD,
          marginTop: "4px",
        }}
      >
        Vakratunda Mahakaya · Suryakoti Samaprabha
      </div>
    </div>
  );
}
