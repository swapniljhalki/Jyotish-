import { useEffect, useState } from "react";
import { Users, Eye, Sparkles } from "lucide-react";
import api from "../lib/api";

const SESSION_KEY = "snw_visit_recorded_v1";

export default function VisitorStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Record visit once per browser session (avoid double-counting refreshes)
      if (!sessionStorage.getItem(SESSION_KEY)) {
        try {
          await api.post("/stats/visit");
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch (e) { /* ignore */ }
      }
      try {
        const { data } = await api.get("/stats/visitors");
        if (!cancelled) setStats(data);
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  const items = [
    { icon: Eye, label: "Total Visits", value: stats.total_views, accent: "text-[#FFD700]" },
    { icon: Users, label: "Unique Seekers", value: stats.unique_visitors, accent: "text-[#FF9933]" },
    { icon: Sparkles, label: "Today", value: stats.today_views, accent: "text-[#D4AF37]" },
  ];

  return (
    <section className="border-t border-[rgba(212,175,55,0.1)]" data-testid="visitor-stats">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {items.map(({ icon: Icon, label, value, accent }) => (
            <div
              key={label}
              className="flex items-center gap-3 md:gap-4 fade-up"
              data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}
            >
              <Icon className={`h-5 w-5 md:h-6 md:w-6 ${accent} shrink-0`} />
              <div className="min-w-0">
                <div className={`font-heading text-2xl md:text-3xl ${accent} leading-none`}>
                  {value.toLocaleString()}
                </div>
                <div className="font-accent text-[9px] md:text-[10px] text-zinc-500 tracking-widest mt-1 uppercase">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
