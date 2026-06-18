import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Sparkles, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function TierPill({ tier }) {
  const map = {
    basic: "border-[#FF9933] text-[#FF9933]",
    premium: "border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.08)]",
  };
  return (
    <span className={`text-[10px] font-accent uppercase tracking-widest px-2 py-0.5 border ${map[tier] || ""}`}>
      {tier}
    </span>
  );
}

export default function ReadingsList() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/readings");
      setItems(data.readings);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this reading permanently?")) return;
    try {
      await api.delete(`/readings/${id}`);
      toast.success("Reading deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-16">
        <div className="mb-10 fade-up flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="font-accent text-xs text-[#D4AF37] mb-3">Archive</p>
            <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
              My <span className="text-gold-gradient italic">readings.</span>
            </h1>
            <p className="mt-3 font-body text-zinc-400 max-w-xl">
              Every kundali and reading you've cast, preserved in the archive.
            </p>
          </div>
          <Link to="/basic">
            <button className="btn-saffron">Cast a new reading</button>
          </Link>
        </div>

        {err && <div className="text-red-400 text-sm mb-4" data-testid="readings-error">{err}</div>}

        {items === null ? (
          <div className="text-center font-accent text-xs text-[#D4AF37] animate-pulse py-20">
            consulting the archive...
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card p-12 text-center fade-up" data-testid="readings-empty">
            <Sparkles className="h-8 w-8 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="font-heading text-2xl text-zinc-100 mb-2">No readings yet</h3>
            <p className="font-body text-zinc-400 mb-6">Your archive is empty. Cast your first reading.</p>
            <Link to="/basic"><button className="btn-saffron">Begin →</button></Link>
          </div>
        ) : (
          <div className="space-y-4" data-testid="readings-list">
            {items.map((r, i) => (
              <div
                key={r.id}
                className="glass-card p-6 flex flex-col md:flex-row md:items-center gap-5 fade-up hover:border-[#FF9933] transition-colors"
                style={{ animationDelay: `${i * 50}ms` }}
                data-testid={`reading-row-${r.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <TierPill tier={r.tier} />
                    <span className="text-[11px] font-body text-zinc-500">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.is_shared && (
                      <span className="text-[10px] font-accent text-green-400">● SHARED</span>
                    )}
                  </div>
                  {r.summary && (
                    <div className="flex gap-5 mb-3 text-sm font-body">
                      <span><span className="text-zinc-500">Lagna:</span> <span className="text-[#FFD700]">{r.summary.ascendant}</span></span>
                      <span><span className="text-zinc-500">Sun:</span> <span className="text-[#FF9933]">{r.summary.sun_sign}</span></span>
                      <span><span className="text-zinc-500">Moon:</span> <span className="text-[#D4AF37]">{r.summary.moon_sign}</span></span>
                    </div>
                  )}
                  <p className="text-sm text-zinc-400 font-body italic line-clamp-2">
                    {(r.advice_preview || "").replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/readings/${r.id}`} data-testid={`reading-open-${r.id}`}>
                    <button className="px-4 py-2 text-[#D4AF37] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.08)] text-sm font-body flex items-center gap-1">
                      Open <ArrowRight className="h-3 w-3" />
                    </button>
                  </Link>
                  <button
                    onClick={() => remove(r.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-[rgba(220,38,38,0.08)]"
                    data-testid={`reading-delete-${r.id}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
