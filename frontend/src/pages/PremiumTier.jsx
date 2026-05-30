import { useState } from "react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import BirthForm from "../components/BirthForm";
import KundaliChart from "../components/KundaliChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import PlanetStates from "../components/PlanetStates";
import NumDashaTimeline from "../components/NumDashaTimeline";

export default function PremiumTier() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Chaldean Name Numerology
  const [chaldeanName, setChaldeanName] = useState("");
  const [chaldeanResult, setChaldeanResult] = useState(null);
  const [chaldeanLoading, setChaldeanLoading] = useState(false);
  const [chaldeanErr, setChaldeanErr] = useState("");

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

  const submitChaldean = async (e) => {
    e.preventDefault();
    setChaldeanErr("");
    setChaldeanResult(null);
    setChaldeanLoading(true);
    try {
      const { data } = await api.post("/numerology/chaldean-name", {
        full_name: chaldeanName,
      });
      setChaldeanResult(data);
    } catch (e2) {
      setChaldeanErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setChaldeanLoading(false);
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
          <div className="mt-10 space-y-8 fade-up" data-testid="premium-result">
            {/* Charts row — D1 Lagna + Chandra Rashi + D9 Navamsha side by side */}
            <div className="grid md:grid-cols-3 gap-6">
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
              {result.chart.chandra && (
                <div className="premium-card p-6">
                  <div className="ornate-divider mb-4">
                    <span className="font-accent text-xs text-[#D4AF37]">Chandra Rashi Chart</span>
                  </div>
                  <KundaliChart chart={result.chart.chandra} />
                  <div className="mt-4 text-center">
                    <div className="font-accent text-[10px] text-zinc-500">Chandra Lagna</div>
                    <div className="font-heading text-2xl text-[#FF9933]">
                      {result.chart.chandra.ascendant_english}
                    </div>
                  </div>
                </div>
              )}
              {result.chart.navamsha && (
                <div className="premium-card p-6">
                  <div className="ornate-divider mb-4">
                    <span className="font-accent text-xs text-[#D4AF37]">Navamsha Chart · D9</span>
                  </div>
                  <KundaliChart chart={result.chart.navamsha} />
                  <div className="mt-4 text-center">
                    <div className="font-accent text-[10px] text-zinc-500">Navamsha Ascendant</div>
                    <div className="font-heading text-2xl text-[#D4AF37]">
                      {result.chart.navamsha.ascendant_english}
                    </div>
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
                      <TableHead className="text-zinc-400 font-accent text-[10px]">States</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.chart.planets.map((p) => (
                      <TableRow key={p.code} className="border-[rgba(212,175,55,0.1)]">
                        <TableCell className="font-body text-zinc-100">
                          {p.name}
                        </TableCell>
                        <TableCell className="font-body text-zinc-300">{p.rashi_english}</TableCell>
                        <TableCell className="font-body text-zinc-400">{p.degree}°</TableCell>
                        <TableCell className="font-body text-[#FFD700]">{p.house}</TableCell>
                        <TableCell className="font-body text-[#D4AF37]">{p.navamsha_sign_english || "—"}</TableCell>
                        <TableCell>
                          <PlanetStates states={p.states} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

            {result.chart.numerology_dasha && (
              <div className="premium-card p-6 md:p-8">
                <div className="ornate-divider mb-4">
                  <span className="font-accent text-xs text-[#D4AF37]">
                    Numerology Dasha · 81-year ank cycle (Mulank {result.chart.mulank})
                  </span>
                </div>
                <p className="font-body text-zinc-400 text-sm mb-4 max-w-3xl">
                  Driven by your Mulank ({result.chart.mulank}), this 81-year cycle of nine
                  ank-mahadashas tracks the numerological vibration of your unfolding life.
                </p>
                <NumDashaTimeline dasha={result.chart.numerology_dasha} />
              </div>
            )}
          </div>
        )}

        {/* Chaldean Name Numerology — standalone section, always visible */}
        <div className="mt-20 fade-up" data-testid="chaldean-section">
          <div className="mb-8">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">Chaldean Name Numerology</p>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50">
              The hidden numbers of <span className="text-gold-gradient italic">your name.</span>
            </h2>
            <p className="mt-3 font-body text-zinc-400 max-w-2xl leading-relaxed text-sm">
              In the Chaldean tradition, every letter carries a numeric vibration (no letter is
              assigned 9 — it is sacred). The compound total of your name's letters reveals the
              graha guiding how the world receives you.
            </p>
          </div>

          <form
            onSubmit={submitChaldean}
            className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="chaldean-form"
          >
            <div className="md:col-span-2">
              <label className="font-accent text-[10px] text-[#D4AF37] block mb-2 tracking-widest">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={chaldeanName}
                onChange={(e) => setChaldeanName(e.target.value)}
                placeholder="e.g., Satish Kumar"
                data-testid="chaldean-input"
                className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
              />
            </div>
            <button
              type="submit"
              disabled={chaldeanLoading}
              data-testid="chaldean-calculate-btn"
              className="btn-saffron w-full md:w-auto disabled:opacity-50"
            >
              {chaldeanLoading ? "Reading…" : "Reveal Name Number"}
            </button>
          </form>

          {chaldeanErr && (
            <div className="mt-4 text-sm text-red-400 font-body glass-card p-4" data-testid="chaldean-error">
              {chaldeanErr}
            </div>
          )}

          {chaldeanResult && (
            <div className="mt-8 space-y-6" data-testid="chaldean-result">
              {/* Letter-by-letter breakdown */}
              <div className="glass-card p-6">
                <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest mb-4">
                  Letter-by-letter values
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {chaldeanResult.letters.map((l, i) => (
                    l.space ? (
                      <div key={i} className="w-3" />
                    ) : (
                      <div
                        key={i}
                        className={`flex flex-col items-center justify-center w-10 h-12 rounded border ${
                          l.value != null
                            ? "border-[rgba(212,175,55,0.3)] bg-[rgba(255,153,51,0.05)]"
                            : "border-[rgba(255,255,255,0.06)] opacity-40"
                        }`}
                        data-testid={`chaldean-letter-${i}`}
                      >
                        <div className="font-heading text-lg text-zinc-100">{l.letter}</div>
                        <div className="font-accent text-[9px] text-[#FF9933]">
                          {l.value != null ? l.value : "—"}
                        </div>
                      </div>
                    )
                  ))}
                </div>
                <div className="flex items-baseline gap-4 mt-4 pt-4 border-t border-[rgba(212,175,55,0.15)]">
                  <div>
                    <div className="font-accent text-[10px] text-zinc-500 uppercase tracking-widest">Compound Total</div>
                    <div className="font-heading text-3xl text-[#D4AF37]">
                      {chaldeanResult.compound_total}
                    </div>
                  </div>
                  <div className="text-zinc-500 font-heading text-2xl">→</div>
                  <div>
                    <div className="font-accent text-[10px] text-zinc-500 uppercase tracking-widest">Reduced</div>
                    <div className="font-heading text-3xl text-[#FFD700]">
                      {chaldeanResult.name_number.number}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planet profile card — reuse same look as NumberCard from Numerology page */}
              <div className="premium-card p-6 md:p-8">
                <div className="font-accent text-[10px] text-[#D4AF37] mb-3 tracking-widest">
                  {chaldeanResult.name_number.label}
                </div>
                <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
                  <div>
                    <div className="font-heading text-7xl text-[#FFD700] leading-none">
                      {chaldeanResult.name_number.number}
                    </div>
                    <div className="mt-1 font-body text-xs text-zinc-500">
                      {chaldeanResult.name_number.derivation}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-2xl text-zinc-100">
                      {chaldeanResult.name_number.planet}
                    </div>
                    <div className="font-body text-xs text-zinc-500">
                      {chaldeanResult.name_number.planet_english}
                    </div>
                  </div>
                </div>
                <p className="font-body text-zinc-200 leading-relaxed mb-5">
                  {chaldeanResult.name_number.traits}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-xs font-body">
                  {[
                    ["Gemstone", chaldeanResult.name_number.gemstone],
                    ["Deity", chaldeanResult.name_number.deity],
                    ["Mantra", chaldeanResult.name_number.mantra],
                    ["Lucky Days", (chaldeanResult.name_number.lucky_days || []).join(", ")],
                    ["Lucky Colors", (chaldeanResult.name_number.lucky_colors || []).join(", ")],
                    ["Lucky Numbers", (chaldeanResult.name_number.lucky_numbers || []).join(", ")],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{label}</span>
                      <span className="text-zinc-300 text-right">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[rgba(212,175,55,0.12)] grid grid-cols-1 gap-2 text-xs font-body">
                  <div>
                    <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">Career</div>
                    <div className="text-zinc-300 mt-0.5">{chaldeanResult.name_number.career}</div>
                  </div>
                  <div>
                    <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">Challenges</div>
                    <div className="text-zinc-300 mt-0.5">{chaldeanResult.name_number.challenges}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
