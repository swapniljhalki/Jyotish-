import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";

const TIERS = [
  {
    key: "free",
    name: "Seeker",
    price: "Free",
    features: ["9 Grahas library", "27 Nakshatras library", "Foundational knowledge"],
  },
  {
    key: "basic",
    name: "Sadhaka",
    price: "$9",
    features: ["Everything in Seeker", "AI birth reading", "One remedial practice"],
  },
  {
    key: "premium",
    name: "Jyotishi",
    price: "$29",
    features: ["Everything in Sadhaka", "Visual Kundali chart", "Detailed 700-word reading", "Seven life domains"],
    popular: true,
  },
];

export default function Pricing() {
  const { user, subscribe } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const recommend = params.get("need");
  const [pending, setPending] = useState("");

  const upgrade = async (tier) => {
    if (!user) return nav("/login");
    setPending(tier);
    try {
      await subscribe(tier);
      toast.success(`Upgraded to ${tier}. The stars are aligned.`);
      if (tier === "basic") nav("/basic");
      else if (tier === "premium") nav("/premium");
    } catch {
      toast.error("Upgrade failed. Try again.");
    } finally {
      setPending("");
    }
  };

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="text-center mb-14 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">Subscription</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            Choose your <span className="text-gold-gradient italic">tier.</span>
          </h1>
          <p className="mt-3 font-body text-zinc-500 text-sm italic">
            (Payments are mocked — one click upgrade for demo purposes.)
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((t, i) => {
            const isCurrent = user && user.tier === t.key;
            const isRecommended = recommend === t.key;
            return (
              <div
                key={t.key}
                className={`${t.popular ? "premium-card" : "glass-card"} p-8 fade-up delay-${(i + 1) * 100} ${
                  isRecommended ? "ring-2 ring-[#FF9933]" : ""
                }`}
                data-testid={`tier-card-${t.key}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                    <span className="font-accent text-xs text-[#D4AF37]">{t.name}</span>
                  </div>
                  {t.popular && (
                    <span className="text-[9px] font-accent text-[#FFD700] bg-[#8B0000] px-2 py-0.5">
                      Most Sought
                    </span>
                  )}
                </div>
                <div className="font-heading text-5xl text-zinc-50 mb-6">{t.price}</div>
                <ul className="space-y-2 mb-8">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-body text-zinc-300">
                      <Check className="h-4 w-4 text-[#FF9933] mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] font-body opacity-70"
                    data-testid={`tier-current-${t.key}`}
                  >
                    Current tier
                  </button>
                ) : user ? (
                  <button
                    onClick={() => upgrade(t.key)}
                    disabled={pending === t.key}
                    className={
                      t.popular
                        ? "w-full bg-gradient-to-r from-[#D4AF37] to-[#FF9933] text-[#0A0D14] font-medium py-3 rounded-full shadow-[0_0_30px_rgba(255,153,51,0.3)] hover:shadow-[0_0_40px_rgba(255,153,51,0.5)] transition-all disabled:opacity-60"
                        : "w-full py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body disabled:opacity-60"
                    }
                    data-testid={`tier-upgrade-${t.key}`}
                  >
                    {pending === t.key ? "Aligning..." : t.key === "free" ? "Switch to Free" : `Subscribe to ${t.name}`}
                  </button>
                ) : (
                  <Link to="/login" className="block w-full text-center py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body">
                    Sign in to subscribe
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
