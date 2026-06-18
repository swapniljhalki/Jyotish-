import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, Lock } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import NumberCard from "../components/NumberCard";
import AdviceMarkdown from "../components/AdviceMarkdown";

export default function Numerology() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [result, setResult] = useState(null);
  const [advice, setAdvice] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [readingLoading, setReadingLoading] = useState(false);

  const isPremium = user?.tier === "premium";

  const calculate = async (e) => {
    e.preventDefault();
    setErr("");
    setAdvice("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/numerology", {
        full_name: fullName,
        date_of_birth: dob,
      });
      setResult(data);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReading = async () => {
    setErr("");
    setAdvice("");
    setReadingLoading(true);
    try {
      const { data } = await api.post("/numerology/reading", {
        full_name: fullName,
        date_of_birth: dob,
        lang: i18n.resolvedLanguage,
      });
      setAdvice(data.advice);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setReadingLoading(false);
    }
  };

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-12 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Vedic Numerology • Ank Jyotish</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            The numbers of <span className="text-gold-gradient italic">your soul.</span>
          </h1>
          <p className="mt-4 font-body text-zinc-400 max-w-2xl leading-relaxed">
            In Vedic numerology, every soul vibrates to a triad of numbers — your{" "}
            <em>Mulank</em> (root, from your day of birth), your <em>Bhagyank</em> (destiny,
            from your full date) and your <em>Naamank</em> (name vibration, by Chaldean values).
            Each is governed by a graha that colours your nature, choices and fortune.
          </p>
        </div>

        <form
          onSubmit={calculate}
          className="glass-card p-6 md:p-8 fade-up grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          data-testid="numerology-form"
        >
          <div className="md:col-span-1">
            <label className="font-accent text-[10px] text-[#D4AF37] block mb-2 tracking-widest">
              FULL NAME (AT BIRTH)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Rahul Sharma"
              data-testid="numerology-name-input"
              className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
            />
          </div>
          <div className="md:col-span-1">
            <label className="font-accent text-[10px] text-[#D4AF37] block mb-2 tracking-widest">
              DATE OF BIRTH
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              data-testid="numerology-dob-input"
              className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="numerology-calculate-btn"
            className="btn-saffron w-full md:w-auto disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate"}
          </button>
        </form>

        {err && (
          <div
            className="mt-6 text-sm text-red-400 font-body glass-card p-4"
            data-testid="numerology-error"
          >
            {err}
          </div>
        )}

        {result && (
          <div className="mt-12 space-y-8" data-testid="numerology-result">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <NumberCard block={result.mulank} accent="text-[#FFD700]" />
              <NumberCard block={result.bhagyank} accent="text-[#FF9933]" />
              <NumberCard block={result.naamank} accent="text-[#D4AF37]" />
            </div>

            {/* AI Reading section */}
            <div className="premium-card p-8 md:p-12">
              <div className="ornate-divider mb-6">
                <span className="font-accent text-xs text-[#D4AF37]">AI Numerology Reading</span>
              </div>

              {!user ? (
                <div className="text-center py-6">
                  <Lock className="h-8 w-8 text-[#D4AF37] mx-auto mb-3" />
                  <p className="font-body text-zinc-300 mb-5 max-w-lg mx-auto">
                    A personalised AI-authored reading is available for{" "}
                    <span className="text-[#FFD700]">Jyotishi (Premium)</span> members.
                    Sign in or begin your journey.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link to="/login">
                      <button className="px-5 py-2 rounded-md border border-[rgba(212,175,55,0.4)] text-zinc-200 hover:border-[#FF9933] hover:text-[#FF9933] font-body text-sm transition-colors" data-testid="numerology-login-btn">
                        Login
                      </button>
                    </Link>
                    <Link to="/register">
                      <button className="btn-saffron" data-testid="numerology-register-btn">
                        Begin Journey
                      </button>
                    </Link>
                  </div>
                </div>
              ) : !isPremium ? (
                <div className="text-center py-6">
                  <Lock className="h-8 w-8 text-[#D4AF37] mx-auto mb-3" />
                  <p className="font-body text-zinc-300 mb-5 max-w-lg mx-auto">
                    Unlock a personalised AI numerology reading by upgrading to the{" "}
                    <span className="text-[#FFD700]">Jyotishi</span> tier.
                  </p>
                  <Link to="/pricing?need=premium">
                    <button className="btn-saffron" data-testid="numerology-upgrade-btn">
                      Upgrade to Premium
                    </button>
                  </Link>
                </div>
              ) : !advice ? (
                <div className="text-center py-6">
                  <Sparkles className="h-8 w-8 text-[#FFD700] mx-auto mb-3" />
                  <p className="font-body text-zinc-300 mb-5 max-w-lg mx-auto">
                    Generate a personalised reading weaving your Mulank, Bhagyank and Naamank
                    into a single voice.
                  </p>
                  <button
                    onClick={fetchReading}
                    disabled={readingLoading}
                    data-testid="numerology-reading-btn"
                    className="btn-saffron disabled:opacity-50"
                  >
                    {readingLoading ? "Composing your reading…" : "Generate AI Reading"}
                  </button>
                </div>
              ) : (
                <AdviceMarkdown testId="numerology-advice">{advice}</AdviceMarkdown>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
