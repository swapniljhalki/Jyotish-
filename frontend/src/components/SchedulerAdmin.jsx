// Admin-side scheduler panel — weekly availability rules, Google Meet connect,
// and bookings table. Lives inside <Admin /> as a tab.
import { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Plus, Trash2, Link as LinkIcon, CheckCircle2, AlertCircle } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SchedulerAdmin() {
  const [cfg, setCfg] = useState(null);
  const [rules, setRules] = useState([]);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [tz, setTz] = useState("Asia/Kolkata");
  const [bookings, setBookings] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadCfg = async () => {
    const { data } = await api.get("/scheduler/config");
    setCfg(data);
    setRules(data.weekly_rules || []);
    setSlotMinutes(data.slot_minutes);
    setTz(data.tz);
  };
  const loadBookings = async () => {
    try {
      const { data } = await api.get("/scheduler/all-bookings");
      setBookings(data.bookings);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  useEffect(() => {
    loadCfg();
    loadBookings();
    // Handle oauth=success/error redirect after admin connects Google
    const p = new URLSearchParams(window.location.search);
    if (p.get("oauth") === "success") {
      toast.success("Google Calendar connected.");
      window.history.replaceState({}, "", "/admin?tab=scheduler");
    } else if (p.get("oauth") === "error") {
      toast.error(`Google connection failed: ${p.get("msg") || "unknown"}`);
      window.history.replaceState({}, "", "/admin?tab=scheduler");
    }
  }, []);

  const addRule = () => setRules([...rules, { day: 1, start: "10:00", end: "11:00" }]);
  const updateRule = (i, k, v) => setRules(rules.map((r, idx) => idx === i ? { ...r, [k]: k === "day" ? Number(v) : v } : r));
  const removeRule = (i) => setRules(rules.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/scheduler/availability", { weekly_rules: rules, slot_minutes: Number(slotMinutes), tz });
      setCfg(data);
      toast.success("Availability saved.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setSaving(false); }
  };

  const connectGoogle = async () => {
    try {
      const { data } = await api.get("/scheduler/oauth/start");
      window.location.href = data.authorization_url;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };
  const disconnectGoogle = async () => {
    if (!window.confirm("Disconnect Google Calendar? New bookings will receive stub Meet links until reconnected.")) return;
    try {
      await api.post("/scheduler/oauth/disconnect");
      toast.success("Disconnected.");
      loadCfg();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail) || e.message); }
  };

  if (!cfg) return <div className="text-zinc-800 font-body italic py-10 text-center">Loading scheduler…</div>;

  return (
    <div className="space-y-6" data-testid="admin-scheduler-panel">
      {/* Google Calendar connection */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-accent text-xs text-[#B8860B] mb-2">Google Calendar / Meet</p>
            <h3 className="font-heading text-2xl text-zinc-50">
              {cfg.google_connected ? "Connected" : "Not connected"}
              {cfg.google_connected
                ? <CheckCircle2 className="inline-block h-5 w-5 ml-2 text-green-400" />
                : <AlertCircle className="inline-block h-5 w-5 ml-2 text-orange-400" />}
            </h3>
            <p className="font-body text-sm text-zinc-700 mt-2 max-w-xl">
              {cfg.google_connected
                ? "Bookings will receive real Google Meet links and land on the astrologer's calendar."
                : "Until you connect, paid bookings receive a placeholder meet.google.com link (stub mode). Connect once with the astrologer's Gmail to enable real Meet auto-generation."}
            </p>
          </div>
          {cfg.google_connected ? (
            <Button onClick={disconnectGoogle} variant="outline" className="border-red-400/40 text-red-300 hover:bg-red-500/10" data-testid="scheduler-google-disconnect">
              Disconnect
            </Button>
          ) : (
            <Button onClick={connectGoogle} className="bg-[#FF9933] text-[#0A0D14] hover:bg-[#E68A2E]" data-testid="scheduler-google-connect">
              <LinkIcon className="h-4 w-4 mr-2" /> Connect Google
            </Button>
          )}
        </div>
      </div>

      {/* Weekly availability */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-accent text-xs text-[#B8860B] mb-1">Weekly availability</p>
            <h3 className="font-heading text-2xl text-zinc-50">Recurring slots</h3>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="font-accent text-[10px] text-zinc-700 uppercase tracking-widest">Duration</label>
            <select value={slotMinutes} onChange={(e) => setSlotMinutes(e.target.value)} className="bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded" data-testid="scheduler-slot-minutes">
              <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
            </select>
            <input value={tz} onChange={(e) => setTz(e.target.value)} className="bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded text-sm w-44" data-testid="scheduler-tz" />
          </div>
        </div>
        <div className="space-y-3">
          {rules.length === 0 && <p className="text-zinc-800 italic text-sm font-body">No availability rules yet — add one to start accepting bookings.</p>}
          {rules.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded border border-[rgba(212,175,55,0.12)] bg-[#0A0D14]" data-testid={`scheduler-rule-${i}`}>
              <select value={r.day} onChange={(e) => updateRule(i, "day", e.target.value)} className="bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded text-sm">
                {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
              </select>
              <input type="time" value={r.start} onChange={(e) => updateRule(i, "start", e.target.value)} className="bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded text-sm" />
              <span className="text-zinc-800 text-sm">to</span>
              <input type="time" value={r.end} onChange={(e) => updateRule(i, "end", e.target.value)} className="bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded text-sm" />
              <Button variant="ghost" size="sm" onClick={() => removeRule(i)} className="text-red-400 hover:text-red-300 ml-auto" data-testid={`scheduler-rule-remove-${i}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button onClick={addRule} variant="outline" className="border-[rgba(212,175,55,0.4)] text-[#B8860B] hover:bg-[rgba(212,175,55,0.08)]" data-testid="scheduler-add-rule">
            <Plus className="h-4 w-4 mr-2" /> Add rule
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#FF9933] text-[#0A0D14] hover:bg-[#E68A2E]" data-testid="scheduler-save">
            {saving ? "Saving..." : "Save availability"}
          </Button>
        </div>
      </div>

      {/* Bookings */}
      <div className="glass-card p-6">
        <p className="font-accent text-xs text-[#B8860B] mb-1">Bookings</p>
        <h3 className="font-heading text-2xl text-zinc-50 mb-4">All consultations ({bookings.length})</h3>
        {bookings.length === 0 ? (
          <p className="text-zinc-800 italic font-body text-sm">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="text-left text-zinc-700 font-accent text-[10px] uppercase tracking-widest border-b border-[rgba(212,175,55,0.15)]">
                  <th className="py-2 pr-3">Slot (UTC)</th>
                  <th className="pr-3">Customer</th>
                  <th className="pr-3">Status</th>
                  <th className="pr-3">Meet</th>
                  <th className="pr-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-[rgba(212,175,55,0.08)]" data-testid={`scheduler-booking-${b.id}`}>
                    <td className="py-2 pr-3 text-zinc-200 whitespace-nowrap">{new Date(b.slot_start_utc).toLocaleString()}</td>
                    <td className="pr-3 text-zinc-200">{b.customer_name} <span className="text-zinc-800 text-xs">({b.user_email})</span></td>
                    <td className="pr-3"><span className={b.status === "paid" ? "text-green-400" : "text-orange-300"}>{b.status}</span></td>
                    <td className="pr-3"><a href={b.meet_url || "#"} target="_blank" rel="noopener noreferrer" className="text-[#FF9933] hover:text-[#FFD700] underline-offset-4 hover:underline">{b.meet_url ? "open" : "—"}</a></td>
                    <td className="pr-3 text-zinc-700 text-xs">{b.customer_phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
