import { useEffect, useState } from "react";
import { Users, Eye, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SESSION_KEY = "snw_visit_recorded_v1";

export default function VisitorStats() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Record visit once per browser session (avoid double-counting refreshes).
      // Fires for EVERY visitor — anonymous, logged-in, admin — so the counter
      // reflects actual traffic even though the display is admin-only.
      if (!sessionStorage.getItem(SESSION_KEY)) {
        try {
          await api.post("/stats/visit");
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch (e) {
          console.warn("VisitorStats: failed to record visit", e?.message || e);
        }
      }
      // Only admins can see the counters — skip the fetch for everyone else
      // (endpoint would return 403 anyway; skipping saves a network round-trip
      // and prevents noisy console errors).
      if (!isAdmin) return;
      try {
        const { data } = await api.get("/stats/visitors");
        if (!cancelled) setStats(data);
      } catch (e) {
        console.warn("VisitorStats: failed to fetch stats", e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const handleReset = async () => {
    // Two-step confirm so a stray click can't nuke the counters.
    if (!window.confirm("Reset all visitor counters to 0?\n\nThis clears Total Visits, Unique Seekers and Today.\nThis action cannot be undone.")) return;
    const typed = window.prompt('Type RESET (all caps) to confirm:', "");
    if (typed !== "RESET") {
      toast.info("Cancelled — counters unchanged.");
      return;
    }
    setResetting(true);
    try {
      await api.post("/stats/reset");
      setStats({ total_views: 0, unique_visitors: 0, today_views: 0 });
      // Clear this browser's session flag so admin's next page load re-counts
      // as a fresh visit (otherwise the counter would stay at 0 until they
      // open a new browser).
      sessionStorage.removeItem(SESSION_KEY);
      toast.success("Visitor counters reset to 0.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to reset counters.");
    } finally {
      setResetting(false);
    }
  };

  // Non-admins see nothing. The section (with the border-top divider) is
  // simply not rendered so the landing page ends cleanly for them.
  if (!isAdmin || !stats) return null;

  const items = [
    { icon: Eye, label: "Total Visits", value: stats.total_views, accent: "text-[#FFD700]" },
    { icon: Users, label: "Unique Seekers", value: stats.unique_visitors, accent: "text-[#FF9933]" },
    { icon: Sparkles, label: "Today", value: stats.today_views, accent: "text-[#B8860B]" },
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
                <div className="font-accent text-[9px] md:text-[10px] text-zinc-800 tracking-widest mt-1 uppercase">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            data-testid="admin-reset-visitor-stats-btn"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.35)] bg-white/60 px-4 py-1.5 text-[11px] font-accent tracking-widest uppercase text-zinc-700 hover:bg-white hover:text-[#FF9933] hover:border-[#FF9933] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resetting ? "Resetting…" : "Reset counters"}
          </button>
        </div>
      </div>
    </section>
  );
}
