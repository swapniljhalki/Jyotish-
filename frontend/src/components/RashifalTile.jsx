import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { Stars, Sparkles } from "lucide-react";

export default function RashifalTile() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/rashifal/today").then((r) => {
      setData(r.data);
      // Default to today's Moon-rashi for relevance
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

  if (!data) {
    return (
      <div
        className="lg:col-span-5 glass-card p-8 fade-up delay-200"
        data-testid="rashifal-tile-loading"
      >
        <div className="font-accent text-xs text-[#D4AF37] animate-pulse text-center py-12">
          drawing the rashifal...
        </div>
      </div>
    );
  }

  return (
    <div
      className="lg:col-span-5 premium-card p-8 fade-up delay-200"
      data-testid="rashifal-tile"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Stars className="h-4 w-4 text-[#D4AF37]" />
          <span className="font-accent text-xs text-[#D4AF37]">
            Daily Rashifal · for all twelve signs
          </span>
        </div>
        <div className="text-[10px] font-accent text-zinc-500" data-testid="rashifal-meta">
          Moon in <span className="text-[#D4AF37]">{data.moon_sign}</span> ·{" "}
          {data.source === "ai" ? "AI-authored" : "offline reading"}
        </div>
      </div>

      {/* Rashi pills */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="rashifal-pills">
        {data.rashis.map((r, idx) => (
          <button
            key={r.name}
            onClick={() => setSelected(idx)}
            data-testid={`rashifal-pill-${r.name.toLowerCase()}`}
            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              selected === idx
                ? "border-[#FF9933] bg-[rgba(255,153,51,0.12)] text-[#FFD700]"
                : "border-[rgba(212,175,55,0.25)] text-zinc-300 hover:border-[#D4AF37] hover:text-[#FFD700]"
            }`}
          >
            <span className="font-heading text-sm">{r.glyph}</span>
            <span className="font-body text-xs">{r.name}</span>
            <span className="font-accent text-[9px] text-zinc-500 hidden md:inline">
              {r.sanskrit}
            </span>
          </button>
        ))}
      </div>

      {/* Selected forecast */}
      {current && (
        <div className="grid md:grid-cols-3 gap-6" data-testid="rashifal-forecast">
          <div className="md:col-span-1">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-5xl text-[#FFD700]">{current.glyph}</span>
              <div>
                <div className="font-heading text-2xl text-zinc-50">{current.name}</div>
                <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest">
                  {current.sanskrit} · ruled by {current.lord}
                </div>
              </div>
            </div>
            {current.theme && (
              <div className="mt-4 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#FF9933] mt-1 shrink-0" />
                <p className="font-body text-sm text-[#FF9933] italic leading-snug">
                  {current.theme}
                </p>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-body">
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

          <div className="md:col-span-2">
            <p
              className="font-body text-zinc-200 leading-relaxed"
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
