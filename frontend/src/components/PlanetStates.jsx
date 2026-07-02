// Renders coloured chips for classical planet states.
import { useTranslation } from "react-i18next";
import { localizeState } from "../lib/vedicNames";

const STATE_STYLE = {
  Retrograde:   "border-[#FF9933] text-[#FF9933]",
  Combust:      "border-[#FF6347] text-[#FF6347]",
  Exalted:      "border-[#FFD700] text-[#FFD700]",
  Vargottam:    "border-[#D4AF37] text-[#B8860B]",
  Debilitated:  "border-zinc-500 text-zinc-700",
};

const SHORT = {
  Retrograde: "R",
  Combust: "C",
  Exalted: "↑",
  Vargottam: "V",
  Debilitated: "↓",
};

export default function PlanetStates({ states, compact = false }) {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  if (!states || states.length === 0) {
    return <span className="text-zinc-900 text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {states.map((s) => (
        <span
          key={s}
          title={localizeState(s, lang)}
          data-testid={`planet-state-${s.toLowerCase()}`}
          className={`px-1.5 py-0.5 rounded border bg-transparent font-accent text-[10px] tracking-wide leading-none ${STATE_STYLE[s] || "border-zinc-500 text-zinc-700"}`}
        >
          {compact ? SHORT[s] || s : localizeState(s, lang)}
        </span>
      ))}
    </div>
  );
}
