import { useEffect, useState } from "react";
import api from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";

export default function Nakshatras() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/nakshatras").then((r) => setItems(r.data.nakshatras)).catch(() => {});
  }, []);

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-12 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Free Tier</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            The <span className="text-gold-gradient italic">27 Nakshatras</span>
          </h1>
          <p className="mt-4 font-body text-zinc-400 max-w-2xl leading-relaxed">
            The Moon spends roughly one day in each nakshatra — the sacred lunar mansions.
            Older than the zodiac, these 27 starfields reveal the subtle texture of one's nature.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="nakshatras-grid">
          {items.map((n, i) => (
            <button
              key={n.id}
              onClick={() => setSelected(n)}
              data-testid={`nakshatra-card-${n.id}`}
              className={`glass-card p-5 text-left hover:-translate-y-1 hover:border-[#FF9933] transition-all duration-300 fade-up`}
              style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-accent text-[10px] text-[#D4AF37]">#{n.id}</span>
                <span className="text-xs text-zinc-500 font-body">{n.ruler}</span>
              </div>
              <div className="font-heading text-xl text-zinc-50 leading-tight">{n.name}</div>
              <div className="font-accent text-[10px] text-[#FFD700] mt-1">{n.sanskrit}</div>
              <div className="mt-3 text-xs text-zinc-400 font-body italic line-clamp-2">{n.quality}</div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-[#121824] border-[rgba(212,175,55,0.3)] text-zinc-100 max-w-xl" data-testid="nakshatra-dialog">
          {selected && (
            <>
              <DialogHeader>
                <div className="font-accent text-[10px] text-[#D4AF37] mb-1">Nakshatra #{selected.id} • {selected.sanskrit}</div>
                <DialogTitle className="font-heading text-3xl text-zinc-50">{selected.name}</DialogTitle>
                <DialogDescription className="font-body text-zinc-300 text-base leading-relaxed pt-2">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm font-body">
                {[
                  ["Deity", selected.deity],
                  ["Symbol", selected.symbol],
                  ["Ruler", selected.ruler],
                  ["Range", selected.range],
                  ["Gana", selected.gana],
                  ["Quality", selected.quality],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-[rgba(212,175,55,0.1)] pb-2">
                    <span className="text-zinc-500 font-accent text-[10px] uppercase tracking-widest">{k}</span>
                    <span className="text-zinc-200 text-right ml-2">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
