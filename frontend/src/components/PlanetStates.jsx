// Renders coloured chips for classical planet states.
const STATE_STYLE = {
  Retrograde:   "border-[#FF9933] text-[#FF9933]",
  Combust:      "border-[#FF6347] text-[#FF6347]",
  Exalted:      "border-[#FFD700] text-[#FFD700]",
  Vargottam:    "border-[#D4AF37] text-[#D4AF37]",
  Debilitated:  "border-zinc-500 text-zinc-400",
};

const SHORT = {
  Retrograde: "R",
  Combust: "C",
  Exalted: "↑",
  Vargottam: "V",
  Debilitated: "↓",
};

export default function PlanetStates({ states, compact = false }) {
  if (!states || states.length === 0) {
    return <span className="text-zinc-600 text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {states.map((s) => (
        <span
          key={s}
          title={s}
          data-testid={`planet-state-${s.toLowerCase()}`}
          className={`px-1.5 py-0.5 rounded border bg-transparent font-accent text-[10px] tracking-wide leading-none ${STATE_STYLE[s] || "border-zinc-500 text-zinc-400"}`}
        >
          {compact ? SHORT[s] || s : s}
        </span>
      ))}
    </div>
  );
}
