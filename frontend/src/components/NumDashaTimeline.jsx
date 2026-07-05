import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Hourglass } from "lucide-react";

const NUMBER_TINT = {
  1: "#FFD700", // Sun  – gold
  2: "#E0E0E0", // Moon – pearl
  3: "#FFE066", // Jupiter – yellow
  4: "#8B5CF6", // Rahu – violet
  5: "#7FFF7F", // Mercury – green
  6: "#FFB3C8", // Venus – pink
  7: "#A78BFA", // Ketu – light violet
  8: "#9BA4B5", // Saturn – grey
  9: "#FF6347", // Mars – red
};

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function Period({ p, level, active, expanded, onToggle, children }) {
  const tint = NUMBER_TINT[p.number] || "#D4AF37";
  const isCurrent = active === p.number;
  const lengthLabel = "years" in p ? `${p.years.toFixed(2)}y` : `${p.days.toFixed(0)}d`;
  return (
    <div>
      <button
        onClick={onToggle}
        data-testid={`num-dasha-${level}-${p.number}-${p.start.slice(0, 10)}`}
        className={`w-full flex items-center gap-3 px-3 py-1 rounded transition-all text-left ${
          isCurrent ? "bg-[rgba(255,153,51,0.10)]" : "hover:bg-[rgba(212,175,55,0.06)]"
        }`}
      >
        {onToggle && (
          <ChevronRight
            className={`h-3 w-3 text-zinc-800 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
          />
        )}
        <span
          className="font-heading text-xl shrink-0 w-6 text-center"
          style={{ color: tint }}
        >
          {p.number}
        </span>
        <span className="font-body text-xs text-zinc-800 w-32 shrink-0 hidden md:inline">
          {p.glyph} {p.planet}
        </span>
        <span className="font-body text-xs text-zinc-700 flex-1 truncate">
          {dateLabel(p.start)} → {dateLabel(p.end)}
        </span>
        <span className="font-accent text-[10px] text-zinc-800 shrink-0 w-14 text-right">
          {lengthLabel}
        </span>
        {isCurrent && (
          <span className="font-accent text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#FF9933] text-[#FF9933] shrink-0">
            Now
          </span>
        )}
      </button>
      {expanded && children && (
        <div className="ml-4 mt-1 mb-2 border-l border-[rgba(212,175,55,0.15)] pl-2">{children}</div>
      )}
    </div>
  );
}

export default function NumDashaTimeline({ dasha }) {
  const [expandedMD, setExpandedMD] = useState(null);
  const [expandedAD, setExpandedAD] = useState(null);

  const initialExpanded = useMemo(() => {
    const cur = dasha?.current;
    if (!cur?.mahadasha) return { md: null, ad: null };
    const md = dasha.mahadashas.find((m) => m.number === cur.mahadasha);
    if (!md) return { md: null, ad: null };
    return { md: md.start, ad: md.antardashas.find((a) => a.number === cur.antardasha)?.start };
  }, [dasha]);

  useEffect(() => {
    if (expandedMD === null && initialExpanded.md) {
      setExpandedMD(initialExpanded.md);
      setExpandedAD(initialExpanded.ad);
    }
  }, [initialExpanded, expandedMD]);

  if (!dasha?.mahadashas?.length) return null;
  const { mahadasha: curMD, antardasha: curAD, pratyantardasha: curPD, daily_dasha: curDD, today_weekday } = dasha.current;
  const findMeta = (n) => {
    for (const md of dasha.mahadashas) {
      if (md.number === n) return md;
      for (const ad of md.antardashas || []) {
        if (ad.number === n) return ad;
        for (const pd of ad.pratyantardashas || []) {
          if (pd.number === n) return pd;
        }
      }
    }
    return null;
  };

  return (
    <div className="space-y-2" data-testid="num-dasha-timeline">
      {/* Current dasha banner — mb-4 (was mb-10) so the 9 Mahadasha rows below
          all fit on the same A4 page as the banner when exported to PDF. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Mahadasha", n: curMD, tint: "#FFD700" },
          { label: "Antardasha", n: curAD, tint: "#FF9933" },
          { label: "Pratyantardasha", n: curPD, tint: "#D4AF37" },
          { label: "Daily Dasha", n: curDD, tint: "#7FFF7F", sub: today_weekday },
        ].map(({ label, n, tint, sub }) => {
          const meta = n ? findMeta(n) : null;
          return (
            <div
              key={label}
              className="glass-card p-3 text-center"
              data-testid={`num-dasha-current-${label.toLowerCase().replace(/ /g, "-")}`}
            >
              <div className="font-accent text-[9px] text-zinc-800 tracking-widest uppercase">
                {label}
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <Hourglass className="h-3 w-3" style={{ color: tint }} />
                <span className="font-heading text-base" style={{ color: tint }}>
                  {n || "—"}
                  {meta && (
                    <span className="text-xs text-zinc-700 ml-2 font-body">{meta.english}</span>
                  )}
                </span>
              </div>
              {sub && (
                <div className="font-accent text-[9px] text-zinc-800 mt-1">{sub}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-0" data-testid="num-dasha-mahadashas">
        {dasha.mahadashas.map((md) => (
          <div key={md.start} data-pdf-soft-break="md">
          <Period
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
                active={md.number === curMD ? curAD : null}
                expanded={expandedAD === ad.start}
                onToggle={() => setExpandedAD(expandedAD === ad.start ? null : ad.start)}
              >
                <div className="space-y-0.5">
                  {ad.pratyantardashas.map((pd) => (
                    <Period
                      key={pd.start}
                      p={pd}
                      level="pd"
                      active={md.number === curMD && ad.number === curAD ? curPD : null}
                    />
                  ))}
                </div>
              </Period>
            ))}
          </Period>
          </div>
        ))}
        {/* Trailing soft-break marker just AFTER the last row — lets the PDF
            exporter treat "end of timeline" as a valid cut point. Without this,
            when content overflows by a hair, the exporter falls back to the
            most-recent row-top marker and nudges the last row onto page 2. */}
        <div data-pdf-soft-break="md-end" aria-hidden="true" style={{ height: 1 }} />
      </div>
    </div>
  );
}
