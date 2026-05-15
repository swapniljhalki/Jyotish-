import { useState, useMemo, useEffect } from "react";
import { ChevronRight, Hourglass } from "lucide-react";

const PLANET_GLYPH = {
  Sun: "☉",
  Moon: "☾",
  Mars: "♂",
  Mercury: "☿",
  Jupiter: "♃",
  Venus: "♀",
  Saturn: "♄",
  Rahu: "☊",
  Ketu: "☋",
};
const PLANET_TINT = {
  Sun: "#FF9933",
  Moon: "#D4AF37",
  Mars: "#FF6347",
  Mercury: "#7FFF7F",
  Jupiter: "#FFD700",
  Venus: "#FFB3C8",
  Saturn: "#9BA4B5",
  Rahu: "#8B5CF6",
  Ketu: "#A78BFA",
};

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

function Period({ p, level, active, expanded, onToggle, children }) {
  const tint = PLANET_TINT[p.lord] || "#D4AF37";
  const isCurrent = active === p.lord;
  return (
    <div>
      <button
        onClick={onToggle}
        data-testid={`dasha-${level}-${p.lord.toLowerCase()}-${p.start.slice(0, 10)}`}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all text-left ${
          isCurrent ? "bg-[rgba(255,153,51,0.10)]" : "hover:bg-[rgba(212,175,55,0.06)]"
        }`}
      >
        {onToggle && (
          <ChevronRight
            className={`h-3 w-3 text-zinc-500 transition-transform shrink-0 ${
              expanded ? "rotate-90" : ""
            }`}
          />
        )}
        <span
          className="font-heading text-base shrink-0"
          style={{ color: tint }}
        >
          {PLANET_GLYPH[p.lord] || "✦"}
        </span>
        <span className="font-body text-sm text-zinc-100 w-20 shrink-0">{p.lord}</span>
        <span className="font-body text-xs text-zinc-400 flex-1 truncate">
          {dateLabel(p.start)} → {dateLabel(p.end)}
        </span>
        <span className="font-accent text-[10px] text-zinc-500 shrink-0">
          {p.years.toFixed(2)}y
        </span>
        {isCurrent && (
          <span className="font-accent text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#FF9933] text-[#FF9933] shrink-0">
            Now
          </span>
        )}
      </button>
      {expanded && children && <div className="ml-4 mt-1 mb-2 border-l border-[rgba(212,175,55,0.15)] pl-2">{children}</div>}
    </div>
  );
}

export default function DashaTimeline({ dasha }) {
  const [expandedMD, setExpandedMD] = useState(null);
  const [expandedAD, setExpandedAD] = useState(null);

  // Auto-expand the current MD + AD on first render
  const initialExpanded = useMemo(() => {
    const cur = dasha?.current;
    if (!cur) return { md: null, ad: null };
    const md = dasha.mahadashas.find((m) => m.lord === cur.mahadasha);
    if (!md) return { md: null, ad: null };
    return { md: md.start, ad: md.antardashas.find((a) => a.lord === cur.antardasha)?.start };
  }, [dasha]);

  useEffect(() => {
    if (expandedMD === null && initialExpanded.md) {
      setExpandedMD(initialExpanded.md);
      setExpandedAD(initialExpanded.ad);
    }
  }, [initialExpanded, expandedMD]);

  if (!dasha?.mahadashas?.length) {
    return (
      <div className="text-zinc-500 text-sm font-body italic">
        Vimshottari Dasha unavailable for this reading (legacy chart).
      </div>
    );
  }

  const { mahadasha: curMD, antardasha: curAD, pratyantardasha: curPD } = dasha.current;

  return (
    <div className="space-y-4" data-testid="dasha-timeline">
      {/* Current dasha banner */}
      <div className="grid grid-cols-3 gap-3 mb-2">
        {[
          { label: "Mahadasha", lord: curMD, tint: "#FFD700" },
          { label: "Antardasha", lord: curAD, tint: "#FF9933" },
          { label: "Pratyantardasha", lord: curPD, tint: "#D4AF37" },
        ].map(({ label, lord, tint }) => (
          <div
            key={label}
            className="glass-card p-3 text-center"
            data-testid={`dasha-current-${label.toLowerCase()}`}
          >
            <div className="font-accent text-[9px] text-zinc-500 tracking-widest uppercase">
              {label}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <Hourglass className="h-3 w-3" style={{ color: tint }} />
              <span className="font-heading text-base" style={{ color: tint }}>
                {lord || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mahadashas list with drill-down */}
      <div className="space-y-1" data-testid="dasha-mahadashas">
        {dasha.mahadashas.map((md) => (
          <Period
            key={md.start}
            p={md}
            level="md"
            active={curMD}
            expanded={expandedMD === md.start}
            onToggle={() => {
              setExpandedMD(expandedMD === md.start ? null : md.start);
              setExpandedAD(null);
            }}
          >
            {md.antardashas.map((ad) => (
              <Period
                key={ad.start}
                p={ad}
                level="ad"
                active={md.lord === curMD ? curAD : null}
                expanded={expandedAD === ad.start}
                onToggle={() => setExpandedAD(expandedAD === ad.start ? null : ad.start)}
              >
                <div className="space-y-0.5">
                  {ad.pratyantardashas.map((pd) => (
                    <Period
                      key={pd.start}
                      p={pd}
                      level="pd"
                      active={
                        md.lord === curMD && ad.lord === curAD ? curPD : null
                      }
                    />
                  ))}
                </div>
              </Period>
            ))}
          </Period>
        ))}
      </div>
    </div>
  );
}
