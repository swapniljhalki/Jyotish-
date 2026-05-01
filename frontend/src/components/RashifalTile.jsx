import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { Stars, Sparkles } from "lucide-react";

export default function RashifalTile({ compact = false }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/rashifal/today").then((r) => {
      setData(r.data);
      const moon = (r.data.moon_sign || "").toLowerCase();
      const idx = (r.data.rashis || []).findIndex(
        (x) => x.name.toLowerCase() === moon,
      );
      setSelected(idx >= 0 ? idx : 0);
    }).catch(() => {});
  }, []);

  const current = useMemo(() => {
    if (!data || selected == null) return null;
    return data.rashis?.[selected] || null;
  }, [data, selected]);

  const wrapperClass = compact
    ? "premium-card p-6 fade-up"
    : "lg:col-span-5 premium-card p-8 fade-up delay-200";

  if (!data) {
    return (
      <div
        className={compact ? "glass-card p-6 fade-up" : "lg:col-span-5 glass-card p-8 fade-up delay-200"}
        data-testid="rashifal-tile-loading"
      >
        <div className="font-accent text-xs text-[#D4AF37] animate-pulse text-center py-8">
          drawing the rashifal...
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} data-testid="rashifal-tile">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Stars className="h-4 w-4 text-[#D4AF37]" />
          <span className="font-accent text-xs text-[#D4AF37]">
            {compact ? "Daily Rashifal" : "Daily Rashifal · for all twelve signs"}
          </span>
        </div>
        <div className="text-[10px] font-accent text-zinc-500" data-testid="rashifal-meta">
          Moon in <span className="text-[#D4AF37]">{data.moon_sign}</span>
          {!compact && (
            <> · {data.source === "ai" ? "AI-authored" : "offline reading"}</>
          )}
        </div>
      </div>

      {/* Rashi pills */}
      <div
        className={`flex flex-wrap gap-1.5 ${compact ? "mb-4" : "mb-6 gap-2"}`}
        data-testid="rashifal-pills"
      >
        {data.rashis.map((r, idx) => (
          <button
            key={r.name}
            onClick={() => setSelected(idx)}
            data-testid={`rashifal-pill-${r.name.toLowerCase()}`}
            className={`group relative flex items-center gap-1.5 ${
              compact ? "px-2 py-1" : "px-3 py-1.5 gap-2"
            } rounded-full border transition-all ${
              selected === idx
                ? "border-[#FF9933] bg-[rgba(255,153,51,0.12)] text-[#FFD700]"
                : "border-[rgba(212,175,55,0.25)] text-zinc-300 hover:border-[#D4AF37] hover:text-[#FFD700]"
            }`}
          >
            <span className={`font-heading ${compact ? "text-xs" : "text-sm"}`}>{r.glyph}</span>
            <span className={`font-body ${compact ? "text-[10px]" : "text-xs"}`}>{r.name}</span>
            {!compact && (
              <span className="font-accent text-[9px] text-zinc-500 hidden md:inline">
                {r.sanskrit}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Selected forecast */}
      {current && (
        <div
          className={compact ? "space-y-3" : "grid md:grid-cols-3 gap-6"}
          data-testid="rashifal-forecast"
        >
          <div className={compact ? "" : "md:col-span-1"}>
            <div className="flex items-baseline gap-3">
              <span className={`font-heading ${compact ? "text-3xl" : "text-5xl"} text-[#FFD700]`}>
                {current.glyph}
              </span>
              <div>
                <div className={`font-heading ${compact ? "text-lg" : "text-2xl"} text-zinc-50`}>
                  {current.name}
                </div>
                <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest">
                  {current.sanskrit} · ruled by {current.lord}
                </div>
              </div>
            </div>
            {current.theme && (
              <div className="mt-3 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#FF9933] mt-1 shrink-0" />
                <p className={`font-body ${compact ? "text-xs" : "text-sm"} text-[#FF9933] italic leading-snug`}>
                  {current.theme}
                </p>
              </div>
            )}
            <div className={`mt-4 grid grid-cols-2 gap-3 text-xs font-body`}>
              {current.lucky_color && (
                <div>
                  <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">
                    Lucky Colour
                  </div>
                  <div className="text-zinc-200 mt-0.5">{current.lucky_color}</div>
                </div>
              )}
              {current.lucky_number > 0 && (
                <div>
                  <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">
                    Lucky Number
                  </div>
                  <div className="text-zinc-200 mt-0.5">{current.lucky_number}</div>
                </div>
              )}
            </div>
          </div>

          <div className={compact ? "" : "md:col-span-2"}>
            <p
              className={`font-body text-zinc-200 leading-relaxed ${
                compact ? "text-sm line-clamp-5" : ""
              }`}
              data-testid="rashifal-forecast-text"
            >
              {current.forecast}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
