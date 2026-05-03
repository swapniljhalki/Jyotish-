import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import KundaliChart from "../components/KundaliChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Switch } from "../components/ui/switch";
import { Share2, Copy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ReadingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/readings/${id}`);
        setR(data);
      } catch (e) {
        setErr(formatApiError(e.response?.data?.detail) || e.message);
      }
    })();
  }, [id]);

  const shareUrl = r?.share_token
    ? `${window.location.origin}/r/${r.share_token}`
    : "";

  const toggle = async (enabled) => {
    setToggling(true);
    try {
      const { data } = await api.post(`/readings/${id}/share`, { enabled });
      setR((prev) => ({ ...prev, ...data }));
      toast.success(enabled ? "Reading is now shareable" : "Sharing disabled");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setToggling(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (err) return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 font-body mb-4" data-testid="reading-detail-error">{err}</p>
        <Link to="/readings" className="text-[#FF9933] text-sm">← Back to archive</Link>
      </div>
    </div>
  );
  if (!r) return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="font-accent text-xs text-[#D4AF37] animate-pulse">loading...</div>
    </div>
  );

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12">
        <button
          onClick={() => nav("/readings")}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-[#FF9933] mb-6"
          data-testid="reading-back-btn"
        >
          <ArrowLeft className="h-4 w-4" /> Archive
        </button>

        {/* Share card */}
        <div className="glass-card p-6 mb-8 fade-up" data-testid="reading-share-panel">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Share2 className="h-4 w-4 text-[#D4AF37]" />
                <span className="font-accent text-xs text-[#D4AF37]">Share Publicly</span>
              </div>
              <p className="text-sm text-zinc-400 font-body">
                Anyone with the link can view this reading. No login required.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 font-body">
                {r.is_shared ? "Live" : "Private"}
              </span>
              <Switch
                checked={!!r.is_shared}
                onCheckedChange={toggle}
                disabled={toggling}
                data-testid="reading-share-toggle"
                className="data-[state=checked]:bg-[#FF9933]"
              />
            </div>
          </div>
          {r.is_shared && shareUrl && (
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly value={shareUrl}
                className="flex-1 bg-[#0A0D14] border border-[rgba(212,175,55,0.25)] text-zinc-100 text-sm font-mono px-3 py-2 rounded"
                data-testid="reading-share-url"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copy}
                className="px-3 py-2 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] flex items-center gap-1 text-sm"
                data-testid="reading-share-copy"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Reading content */}
        {r.tier === "premium" && r.chart ? (
          <div className="space-y-8" data-testid="reading-premium-content">
            {/* Charts row — D1 + D9 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="premium-card p-6">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">Kundali Lagna Chart</span>
                </div>
                <KundaliChart chart={r.chart} />
                <div className="mt-4 text-center">
                  <div className="font-accent text-[10px] text-zinc-500">Ascendant</div>
                  <div className="font-heading text-2xl text-[#FFD700]">{r.chart.ascendant_english}</div>
                </div>
              </div>
              {r.chart.navamsha && (
                <div className="premium-card p-6">
                  <div className="ornate-divider mb-4">
                    <span className="font-accent text-xs text-[#D4AF37]">Navamsha Chart · D9</span>
                  </div>
                  <KundaliChart chart={r.chart.navamsha} />
                  <div className="mt-4 text-center">
                    <div className="font-accent text-[10px] text-zinc-500">Navamsha Ascendant</div>
                    <div className="font-heading text-2xl text-[#D4AF37]">{r.chart.navamsha.ascendant_english}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass-card p-6">
                <div className="font-accent text-xs text-[#D4AF37] mb-4">Planetary Positions</div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(212,175,55,0.2)]">
                      <TableHead className="text-zinc-400 font-accent text-[10px]">Graha</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">Rashi</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">°</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">House</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">Navamsha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.chart.planets.map((p) => (
                      <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                        <TableCell className="text-zinc-100 font-body">
                          {p.name} {p.retrograde && <span className="text-[10px] text-[#FF9933]">(R)</span>}
                        </TableCell>
                        <TableCell className="text-zinc-300 font-body">{p.rashi_english}</TableCell>
                        <TableCell className="text-zinc-400 font-body">{p.degree}°</TableCell>
                        <TableCell className="text-[#FFD700] font-body">{p.house}</TableCell>
                        <TableCell className="text-[#D4AF37] font-body">{p.navamsha_sign_english || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="premium-card p-6 md:p-8 max-h-[800px] overflow-auto">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">Reading</span>
                </div>
                <div className="font-body text-zinc-200 whitespace-pre-wrap" style={{ lineHeight: 1.8 }}>
                  {r.advice}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="premium-card p-8 md:p-12" data-testid="reading-basic-content">
            <div className="ornate-divider mb-6">
              <span className="font-accent text-xs text-[#D4AF37]">Basic Reading</span>
            </div>
            {r.summary && (
              <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                <div>
                  <div className="font-accent text-[10px] text-zinc-500">Ascendant</div>
                  <div className="font-heading text-xl text-[#FFD700]">{r.summary.ascendant}</div>
                </div>
                <div>
                  <div className="font-accent text-[10px] text-zinc-500">Sun</div>
                  <div className="font-heading text-xl text-[#FF9933]">{r.summary.sun_sign}</div>
                </div>
                <div>
                  <div className="font-accent text-[10px] text-zinc-500">Moon</div>
                  <div className="font-heading text-xl text-[#D4AF37]">{r.summary.moon_sign}</div>
                </div>
              </div>
            )}
            <div className="font-body text-zinc-200 whitespace-pre-wrap" style={{ lineHeight: 1.8 }}>
              {r.advice}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
