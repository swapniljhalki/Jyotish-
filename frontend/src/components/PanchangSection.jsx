import { useEffect, useState } from "react";
import api from "../lib/api";
import { Sparkles, Calendar, Sun, Moon } from "lucide-react";

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1 bg-[rgba(212,175,55,0.15)] rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FF9933]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function PanchangSection() {
  const [p, setP] = useState(null);
  const [festivals, setFestivals] = useState([]);

  useEffect(() => {
    api.get("/panchang/today").then((r) => setP(r.data)).catch(() => {});
    api.get("/festivals/upcoming?limit=8").then((r) => setFestivals(r.data.festivals)).catch(() => {});
  }, []);

  return (
    <section className="relative cosmic-bg py-24 md:py-28 border-y border-[rgba(212,175,55,0.15)]" data-testid="panchang-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Today's Sky</p>
          <h2 className="font-heading text-4xl md:text-5xl text-zinc-50">
            Panchang & <span className="text-gold-gradient italic">festivals.</span>
          </h2>
          <p className="mt-3 font-body text-zinc-400 text-sm max-w-xl mx-auto">
            The five limbs of Vedic time-keeping for today, plus what to celebrate next.
          </p>
        </div>

        <div className="grid lg:grid-cols-1 gap-8">
          {/* Combined Panchang + Festivals card — full width */}
          <div className="premium-card p-8 fade-up" data-testid="panchang-card">
            {p ? (
              <>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                    <span className="font-accent text-xs text-[#D4AF37]">
                      {new Date(p.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <span className="text-[10px] font-accent text-zinc-500">{p.timezone}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6">
                  <div data-testid="panchang-tithi">
                    <div className="font-accent text-[10px] text-zinc-500 mb-1">Tithi</div>
                    <div className="font-heading text-2xl text-[#FFD700]">{p.tithi.name}</div>
                    <div className="text-xs text-zinc-400 font-body italic">{p.tithi.paksha} Paksha · {p.tithi.index}</div>
                    <div className="mt-2"><ProgressBar value={p.tithi.progress} /></div>
                  </div>
                  <div data-testid="panchang-nakshatra">
                    <div className="font-accent text-[10px] text-zinc-500 mb-1">Nakshatra</div>
                    <div className="font-heading text-2xl text-[#FF9933]">{p.nakshatra.name}</div>
                    <div className="text-xs text-zinc-400 font-body italic">Pada {p.nakshatra.pada}</div>
                    <div className="mt-2"><ProgressBar value={p.nakshatra.progress} /></div>
                  </div>
                  <div data-testid="panchang-yoga">
                    <div className="font-accent text-[10px] text-zinc-500 mb-1">Yoga</div>
                    <div className="font-heading text-2xl text-[#D4AF37]">{p.yoga.name}</div>
                    <div className="text-xs text-zinc-400 font-body italic">#{p.yoga.index}</div>
                    <div className="mt-2"><ProgressBar value={p.yoga.progress} /></div>
                  </div>
                  <div data-testid="panchang-vara">
                    <div className="font-accent text-[10px] text-zinc-500 mb-1">Vara</div>
                    <div className="font-heading text-2xl text-zinc-100">{p.vara.sanskrit}</div>
                    <div className="text-xs text-zinc-400 font-body italic">{p.vara.english}</div>
                  </div>
                  <div className="flex items-center gap-2" data-testid="panchang-sun">
                    <Sun className="h-5 w-5 text-[#FF9933]" />
                    <div>
                      <div className="font-accent text-[10px] text-zinc-500">Sun in</div>
                      <div className="font-heading text-lg text-zinc-100">{p.sun_sign}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" data-testid="panchang-moon">
                    <Moon className="h-5 w-5 text-[#D4AF37]" />
                    <div>
                      <div className="font-accent text-[10px] text-zinc-500">Moon in</div>
                      <div className="font-heading text-lg text-zinc-100">{p.moon_sign}</div>
                    </div>
                  </div>
                </div>

                {/* Divider between panchang and festivals */}
                <div className="my-8 ornate-divider">
                  <span className="font-accent text-xs text-[#D4AF37]">
                    <Calendar className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                    Upcoming Festivals
                  </span>
                </div>

                {/* Horizontal festival strip */}
                {festivals.length === 0 ? (
                  <div className="text-zinc-500 font-body text-sm italic text-center py-4">
                    No festivals on the horizon.
                  </div>
                ) : (
                  <div
                    className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin"
                    data-testid="festivals-list"
                  >
                    {festivals.map((f, i) => (
                      <div
                        key={f.date}
                        className="flex-shrink-0 w-64 snap-start glass-card p-5 fade-up hover:-translate-y-1 hover:border-[#FF9933] transition-all"
                        style={{ animationDelay: `${i * 60}ms` }}
                        data-testid={`festival-row-${i}`}
                      >
                        <div className="flex items-baseline gap-3 mb-2">
                          <div className="flex-shrink-0 text-center">
                            <div className="font-accent text-[10px] text-[#D4AF37]">
                              {new Date(f.date).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}
                            </div>
                            <div className="font-heading text-3xl text-[#FFD700] leading-none">
                              {new Date(f.date).getDate()}
                            </div>
                            <div className="text-[9px] font-body text-zinc-500 mt-1">{f.weekday.slice(0, 3)}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-heading text-base text-zinc-50 leading-tight line-clamp-2">{f.name}</div>
                            <div className="text-[10px] font-accent text-[#FF9933] mt-1">
                              {f.days_until === 0 ? "TODAY" : `IN ${f.days_until} DAY${f.days_until === 1 ? "" : "S"}`}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 font-body line-clamp-2">{f.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="font-accent text-xs text-[#D4AF37] animate-pulse text-center py-12">
                consulting the heavens...
              </div>
            )}
          </div>

          {/* Rashifal moved to landing hero — top right */}
        </div>
      </div>
    </section>
  );
}
