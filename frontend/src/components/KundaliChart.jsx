/**
 * North Indian Diamond-Style Kundali Chart (SVG).
 * Takes a computed `chart` object with ascendant_index (0..11) and houses
 * (map of house 1..12 -> planet codes).
 */
const SIZE = 440;
const M = 20;           // outer margin
const S = SIZE - M * 2; // inner square side
const CX = M + S / 2;
const CY = M + S / 2;

const HOUSE_CENTERS = {
  1:  [CX, M + S * 0.25],
  2:  [M + S * 0.18, M + S * 0.12],
  3:  [M + S * 0.12, M + S * 0.22],
  4:  [M + S * 0.25, CY],
  5:  [M + S * 0.12, M + S * 0.78],
  6:  [M + S * 0.18, M + S * 0.88],
  7:  [CX, M + S * 0.75],
  8:  [M + S * 0.82, M + S * 0.88],
  9:  [M + S * 0.88, M + S * 0.78],
  10: [M + S * 0.75, CY],
  11: [M + S * 0.88, M + S * 0.22],
  12: [M + S * 0.82, M + S * 0.12],
};

const RASHI_SHORT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function KundaliChart({ chart, large = false }) {
  if (!chart) return null;
  const { ascendant_index, house_signs, houses } = chart;

  // Outer square corners
  const A = [M, M];                 // top-left
  const B = [M + S, M];             // top-right
  const C = [M + S, M + S];         // bottom-right
  const D = [M, M + S];             // bottom-left
  // Diamond mid-points
  const T = [CX, M];                // top
  const R = [M + S, CY];            // right
  const Bt = [CX, M + S];           // bottom
  const L = [M, CY];                // left

  const line = (p1, p2, delay = 0) => (
    <line
      x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
      stroke="#D4AF37"
      strokeWidth="1.5"
      className="kundali-line"
      style={{ animationDelay: `${delay}s` }}
    />
  );

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={`w-full ${large ? "max-w-[640px]" : "max-w-[440px]"} h-auto`}
        data-testid="kundali-chart"
      >
        <defs>
          <radialGradient id="houseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,153,51,0.12)" />
            <stop offset="100%" stopColor="rgba(255,153,51,0)" />
          </radialGradient>
          <pattern id="chart-noise" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="#F9F4EB" />
          </pattern>
        </defs>

        <rect x={M} y={M} width={S} height={S} fill="url(#chart-noise)" />

        {/* Outer square */}
        {line(A, B, 0)}
        {line(B, C, 0.1)}
        {line(C, D, 0.2)}
        {line(D, A, 0.3)}

        {/* Diamond (connecting midpoints) */}
        {line(T, R, 0.4)}
        {line(R, Bt, 0.5)}
        {line(Bt, L, 0.6)}
        {line(L, T, 0.7)}

        {/* Diagonals of outer square */}
        {line(A, C, 0.8)}
        {line(B, D, 0.9)}

        {/* Ascendant marker in house 1 */}
        <circle cx={HOUSE_CENTERS[1][0]} cy={HOUSE_CENTERS[1][1] - 22} r="9"
          fill="rgba(255,153,51,0.15)" stroke="#FF9933" strokeWidth="1" />
        <text x={HOUSE_CENTERS[1][0]} y={HOUSE_CENTERS[1][1] - 19}
          textAnchor="middle" fontSize="9" fontFamily="Cinzel, serif" fill="#FF9933">
          Asc
        </text>

        {/* Each house */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
          const [cx, cy] = HOUSE_CENTERS[h];
          const signIdx = house_signs[String(h)];
          const planets = houses[String(h)] || [];
          return (
            <g key={h}>
              {/* Rashi number (small, top of cell) */}
              <text
                x={cx} y={cy - 4}
                textAnchor="middle"
                fontSize="10"
                fontFamily="Cinzel, serif"
                fill="#D4AF37"
                opacity="0.8"
              >
                {RASHI_SHORT[signIdx]}
              </text>
              {/* Planets — wrap onto two lines if many in one house */}
              {(() => {
                const lines = [];
                if (planets.length <= 2) {
                  lines.push(planets.join(" "));
                } else {
                  const mid = Math.ceil(planets.length / 2);
                  lines.push(planets.slice(0, mid).join(" "));
                  lines.push(planets.slice(mid).join(" "));
                }
                return lines.map((ln, i) => (
                  <text
                    key={i}
                    x={cx}
                    y={cy + 12 + i * 13}
                    textAnchor="middle"
                    fontSize={planets.length > 3 ? "10" : "12"}
                    fontFamily="Outfit, sans-serif"
                    fontWeight="500"
                    fill="#1A1C29"
                  >
                    {ln}
                  </text>
                ));
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
