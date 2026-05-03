import { useState } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import BirthForm from "../components/BirthForm";
import KundaliChart from "../components/KundaliChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

export default function PremiumTier() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (values) => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/astrology/premium", values);
      setResult(data);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const canRead = user && user.tier === "premium";

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-10 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Premium Tier • Jyotishi</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            Your full <span className="text-gold-gradient italic">Kundali.</span>
          </h1>
          <p className="mt-4 font-body text-zinc-400 max-w-2xl leading-relaxed">
            A visual North-Indian birth chart, detailed planetary placements, and a ~700-word
            interpretation across life's seven domains.
          </p>
        </div>

        {!canRead ? (
          <div className="premium-card p-10 text-center fade-up" data-testid="premium-upgrade-notice">
            <div className="font-accent text-xs text-[#D4AF37] mb-3">Tier Required</div>
            <h3 className="font-heading text-3xl text-zinc-50 mb-3">Unlock the Premium tier</h3>
            <p className="font-body text-zinc-400 mb-6">
              The Jyotishi tier reveals your full kundali and the deeper interpretation.
            </p>
            <Link to="/pricing?need=premium">
              <button className="btn-saffron" data-testid="premium-upgrade-btn">Upgrade to Premium</button>
            </Link>
          </div>
        ) : (
          <div className="glass-card p-8 md:p-10 fade-up">
            <BirthForm onSubmit={submit} loading={loading} cta="Cast Kundali" testIdPrefix="premium" />
            {err && <div className="mt-4 text-sm text-red-400 font-body" data-testid="premium-error">{err}</div>}
          </div>
        )}

        {result && (
          <div className="mt-10 grid md:grid-cols-2 gap-8 fade-up" data-testid="premium-result">
            <div className="space-y-6">
              <div className="premium-card p-6">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">Kundali Lagna Chart</span>
                </div>
                <KundaliChart chart={result.chart} />
                <div className="mt-4 text-center">
                  <div className="font-accent text-[10px] text-zinc-500">Ascendant (Lagna)</div>
                  <div className="font-heading text-2xl text-[#FFD700]">
                    {result.chart.ascendant_english}
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="font-accent text-xs text-[#D4AF37] mb-4">Planetary Positions</div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[rgba(212,175,55,0.2)]">
                      <TableHead className="text-zinc-400 font-accent text-[10px]">Graha</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">Rashi</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">°</TableHead>
                      <TableHead className="text-zinc-400 font-accent text-[10px]">House</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.chart.planets.map((p) => (
                      <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                        <TableCell className="font-body text-zinc-100">
                          {p.name} {p.retrograde && <span className="text-[10px] text-[#FF9933]">(R)</span>}
                        </TableCell>
                        <TableCell className="font-body text-zinc-300">{p.rashi_english}</TableCell>
                        <TableCell className="font-body text-zinc-400">{p.degree}°</TableCell>
                        <TableCell className="font-body text-[#FFD700]">{p.house}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="premium-card p-6 md:p-8 max-h-[800px] overflow-auto">
              <div className="ornate-divider mb-6">
                <span className="font-accent text-xs text-[#D4AF37]">Detailed Reading</span>
              </div>
              <div
                className="font-body text-zinc-200 leading-relaxed whitespace-pre-wrap prose-invert"
                style={{ lineHeight: 1.8 }}
              >
                {result.advice}
              </div>
              <div className="mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center">
                <Link to={`/readings/${result.id}`} className="text-[#FF9933] text-sm font-body hover:text-[#FFD700]" data-testid="premium-open-in-archive">
                  Open in archive & share →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
