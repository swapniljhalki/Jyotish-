import { useState } from "react";
import api from "../lib/api";
import { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import BirthForm from "../components/BirthForm";

export default function BasicTier() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (values) => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/astrology/basic", values);
      setResult(data);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const canRead = user && (user.tier === "basic" || user.tier === "premium");

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-10 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Basic Tier • Sadhaka</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            Your <span className="text-gold-gradient italic">birth reading.</span>
          </h1>
          <p className="mt-4 font-body text-zinc-400 max-w-2xl leading-relaxed">
            Share your moment of birth and receive a concise AI-authored reading in the voice of a
            traditional Vedic astrologer — personality, strengths, growth edges and a remedial practice.
          </p>
        </div>

        {!canRead ? (
          <div className="glass-card p-10 text-center fade-up" data-testid="basic-upgrade-notice">
            <div className="font-accent text-xs text-[#D4AF37] mb-3">Tier Required</div>
            <h3 className="font-heading text-3xl text-zinc-50 mb-3">Unlock the Basic tier</h3>
            <p className="font-body text-zinc-400 mb-6">
              Upgrade your seeker account to the Sadhaka tier to receive personalised readings.
            </p>
            <Link to="/pricing?need=basic">
              <button className="btn-saffron" data-testid="basic-upgrade-btn">Upgrade to Basic</button>
            </Link>
          </div>
        ) : (
          <div className="glass-card p-8 md:p-10 fade-up">
            <BirthForm onSubmit={submit} loading={loading} cta="Cast Reading" testIdPrefix="basic" />
            {err && <div className="mt-4 text-sm text-red-400 font-body" data-testid="basic-error">{err}</div>}
          </div>
        )}

        {result && (
          <div className="mt-10 premium-card p-8 md:p-12 fade-up" data-testid="basic-result">
            <div className="ornate-divider mb-6">
              <span className="font-accent text-xs text-[#D4AF37]">Your Reading</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div>
                <div className="font-accent text-[10px] text-zinc-500">Ascendant</div>
                <div className="font-heading text-xl text-[#FFD700]">{result.ascendant}</div>
                <div className="font-body text-xs text-zinc-500">{result.ascendant_sanskrit}</div>
              </div>
              <div>
                <div className="font-accent text-[10px] text-zinc-500">Sun Sign</div>
                <div className="font-heading text-xl text-[#FF9933]">{result.sun_sign}</div>
              </div>
              <div>
                <div className="font-accent text-[10px] text-zinc-500">Moon Sign</div>
                <div className="font-heading text-xl text-[#D4AF37]">{result.moon_sign}</div>
              </div>
            </div>
            <div className="font-body text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {result.advice}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
