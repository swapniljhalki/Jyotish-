import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import KundaliChart from "../components/KundaliChart";
import { Sparkles, ArrowRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function PublicReading() {
  const { token } = useParams();
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Public endpoint — no cookies needed
        const { data } = await axios.get(`${BACKEND_URL}/api/public/readings/${token}`);
        setR(data);
      } catch (e) {
        setErr(e.response?.status === 404 ? "This reading is no longer shared." : (e.message || "Failed to load"));
      }
    })();
  }, [token]);

  if (err) return (
    <div className="cosmic-bg min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md" data-testid="public-reading-error">
        <p className="font-heading text-3xl text-zinc-100 mb-3">Reading unavailable</p>
        <p className="text-zinc-400 font-body mb-6">{err}</p>
        <Link to="/" className="btn-saffron inline-flex">Discover Jyotish</Link>
      </div>
    </div>
  );
  if (!r) return (
    <div className="cosmic-bg min-h-screen flex items-center justify-center">
      <div className="font-accent text-xs text-[#D4AF37] animate-pulse">loading...</div>
    </div>
  );

  return (
    <div className="cosmic-bg min-h-screen">
      {/* Minimal top bar */}
      <div className="border-b border-[rgba(212,175,55,0.15)] bg-[#0A0D14]/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Sparkles className="h-5 w-5 text-[#FFD700]" />
            <span className="font-heading text-2xl">
              <span className="text-gold-gradient font-semibold">Jyotish</span>
              <span className="text-zinc-400"> • Vedic</span>
            </span>
          </Link>
          <Link to="/register">
            <button className="btn-saffron text-sm" data-testid="public-reading-cta-top">
              Cast your own
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-16" data-testid="public-reading-page">
        {/* Header */}
        <div className="text-center mb-12 fade-up">
          <div className="ornate-divider mb-4">
            <span className="font-accent text-xs text-[#D4AF37]">A Shared Reading</span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl text-zinc-50">
            The kundali of <span className="text-gold-gradient italic" data-testid="public-reading-author">{r.author_name}</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-500 font-body">
            {r.tier === "premium" ? "Premium Reading" : "Basic Reading"} · {new Date(r.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Content */}
        {r.tier === "premium" && r.chart ? (
          <div className="grid md:grid-cols-2 gap-8 fade-up">
            <div className="premium-card p-6">
              <div className="ornate-divider mb-4">
                <span className="font-accent text-xs text-[#D4AF37]">Kundali</span>
              </div>
              <KundaliChart chart={r.chart} />
              <div className="mt-4 text-center">
                <div className="font-accent text-[10px] text-zinc-500">Ascendant</div>
                <div className="font-heading text-2xl text-[#FFD700]">{r.chart.ascendant_english}</div>
              </div>
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
        ) : (
          <div className="premium-card p-8 md:p-12 fade-up">
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

        {/* Conversion CTA */}
        <div className="mt-16 text-center fade-up">
          <div className="glass-card p-10 max-w-2xl mx-auto">
            <div className="ornate-divider mb-4">
              <span className="font-accent text-xs text-[#D4AF37]">ज्योतिष</span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50 mb-3">
              Curious about your <span className="text-gold-gradient italic">own kundali?</span>
            </h2>
            <p className="text-zinc-400 font-body mb-6">
              Cast your personal Vedic reading in under a minute — AI-authored by a seasoned Jyotishi.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link to="/register">
                <button className="btn-saffron" data-testid="public-reading-cta-register">
                  Cast My Reading <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/grahas">
                <button className="px-8 py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] font-body">
                  Explore Free Wisdom
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
