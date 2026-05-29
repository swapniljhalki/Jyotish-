import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Lock } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const PLANET_GLYPH = {
  Surya: "☉",
  Chandra: "☾",
  Guru: "♃",
  Rahu: "☊",
  Budha: "☿",
  Shukra: "♀",
  Ketu: "☋",
  Shani: "♄",
  Mangala: "♂",
};

function NumberCard({ block, accent }) {
  if (!block || !block.planet) {
    return (
      <div className="glass-card p-6">
        <div className="font-accent text-[10px] text-[#D4AF37] mb-2">{block?.label}</div>
        <div className="text-zinc-500 font-body text-sm">{block?.derivation}</div>
      </div>
    );
  }
  return (
    <div
      className="glass-card p-6 hover:-translate-y-1 transition-all duration-300"
      data-testid={`numerology-card-${block.label.toLowerCase().split(" ")[0]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest">
            {block.label}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className={`font-heading text-6xl ${accent}`}>{block.number}</span>
            <span className="font-heading text-2xl text-zinc-400">
              {PLANET_GLYPH[block.planet] || "✦"}
            </span>
          </div>
          <div className="mt-1 font-body text-xs text-zinc-500">{block.derivation}</div>
        </div>
        <div className="text-right">
          <div className="font-heading text-lg text-zinc-100">{block.planet}</div>
          <div className="font-body text-xs text-zinc-500">{block.planet_english}</div>
        </div>
      </div>

      <div className="font-body text-sm text-zinc-300 leading-relaxed">{block.traits}</div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs font-body">
        <Field label="Gemstone" value={block.gemstone} />
        <Field label="Deity" value={block.deity} />
        <Field label="Mantra" value={block.mantra} />
        <Field label="Lucky Days" value={block.lucky_days?.join(", ")} />
        <Field label="Lucky Colors" value={block.lucky_colors?.join(", ")} />
        <Field label="Lucky Numbers" value={block.lucky_numbers?.join(", ")} />
      </div>

      <div className="mt-4 pt-4 border-t border-[rgba(212,175,55,0.12)] grid grid-cols-1 gap-2 text-xs font-body">
        <Field label="Career" value={block.career} stack />
        <Field label="Challenges" value={block.challenges} stack />
      </div>
    </div>
  );
}

function Field({ label, value, stack }) {
  if (!value) return null;
  if (stack) {
    return (
      <div>
        <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{label}</div>
        <div className="text-zinc-300 mt-0.5">{value}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-between gap-3">
      <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className="text-zinc-300 text-right">{value}</span>
    </div>
  );
}

export default function Numerology() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [result, setResult] = useState(null);
  const [advice, setAdvice] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [readingLoading, setReadingLoading] = useState(false);

  // Mobile number state
  const [mobile, setMobile] = useState("");
  const [mobileResult, setMobileResult] = useState(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileErr, setMobileErr] = useState("");

  const calculateMobile = async (e) => {
    e.preventDefault();
    setMobileErr("");
    setMobileResult(null);
    setMobileLoading(true);
    try {
      const { data } = await api.post("/numerology/mobile", { mobile_number: mobile });
      setMobileResult(data);
    } catch (e2) {
      setMobileErr(formatApiError(e2.response?.data?.detail) || e2.message);
    } finally {
      setMobileLoading(false);
    }
  };

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
                <div
                  className="font-body text-zinc-200 leading-relaxed whitespace-pre-wrap"
                  data-testid="numerology-advice"
                >
                  {advice}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Number Numerology — separate section, accessible without DOB */}
        <div className="mt-20 fade-up" data-testid="mobile-numerology-section">
          <div className="mb-8">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">Mobile Number Ank</p>
            <h2 className="font-heading text-3xl md:text-4xl text-zinc-50">
              Your phone number, <span className="text-gold-gradient italic">vibrating with you.</span>
            </h2>
            <p className="mt-3 font-body text-zinc-400 max-w-2xl leading-relaxed text-sm">
              Every number you carry — including the one you give out a hundred times a week —
              radiates a planetary frequency. The sum of your mobile number's digits reveals
              the graha quietly shaping every call, every message.
            </p>
          </div>

          <form
            onSubmit={calculateMobile}
            className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
            data-testid="mobile-form"
          >
            <div className="md:col-span-2">
              <label className="font-accent text-[10px] text-[#D4AF37] block mb-2 tracking-widest">
                MOBILE NUMBER
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g., +91 98765 43210"
                data-testid="mobile-input"
                className="w-full bg-[#0F1320] border border-[rgba(212,175,55,0.25)] rounded-md px-3 py-2 text-zinc-100 font-body focus:outline-none focus:border-[#FF9933]"
              />
            </div>
            <button
              type="submit"
              disabled={mobileLoading}
              data-testid="mobile-calculate-btn"
              className="btn-saffron w-full md:w-auto disabled:opacity-50"
            >
              {mobileLoading ? "Reading…" : "Reveal Vibration"}
            </button>
          </form>

          {mobileErr && (
            <div className="mt-4 text-sm text-red-400 font-body glass-card p-4" data-testid="mobile-error">
              {mobileErr}
            </div>
          )}

          {mobileResult && (
            <div className="mt-8 grid md:grid-cols-3 gap-6" data-testid="mobile-result">
              <div className="md:col-span-2">
                <NumberCard block={mobileResult.mobile_number_ank} accent="text-[#FFD700]" />
              </div>
              <div className="glass-card p-6">
                <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest mb-3">
                  Digit Composition
                </div>
                <div className="font-body text-sm text-zinc-300 mb-4">
                  Number: <span className="text-zinc-100 font-mono">{mobileResult.digits_used}</span>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-5">
                  {Object.entries(mobileResult.frequency).map(([d, count]) => (
                    <div
                      key={d}
                      className={`text-center p-2 rounded border ${
                        count > 0
                          ? "border-[rgba(212,175,55,0.3)] bg-[rgba(255,153,51,0.04)]"
                          : "border-[rgba(255,255,255,0.06)] opacity-40"
                      }`}
                      data-testid={`mobile-digit-${d}`}
                    >
                      <div className="font-heading text-lg text-[#FFD700]">{d}</div>
                      <div className="font-accent text-[9px] text-zinc-500 tracking-widest">
                        ×{count}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-xs font-body">
                  <div className="flex justify-between gap-3">
                    <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">Sum of all digits</span>
                    <span className="text-zinc-200">{mobileResult.digit_sum}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">Dominant digit</span>
                    <span className="text-zinc-200">{mobileResult.dominant_digit}</span>
                  </div>
                  {mobileResult.missing_digits.length > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">Missing digits</span>
                      <span className="text-zinc-200">{mobileResult.missing_digits.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
