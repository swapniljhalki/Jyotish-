import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Star, Moon, Sun, Check, ArrowRight } from "lucide-react";
import PanchangSection from "../components/PanchangSection";

const tiers = [
  {
    key: "free",
    name: "Seeker",
    price: "Free",
    tagline: "Begin your journey through the sky",
    features: [
      "The 9 Grahas — planetary deities",
      "The 27 Nakshatras — lunar mansions",
      "Daily Vedic wisdom & traditions",
    ],
    cta: { to: "/grahas", label: "Explore Grahas" },
    style: "glass-card",
  },
  {
    key: "basic",
    name: "Sadhaka",
    price: "₹99",
    period: "/ reading",
    tagline: "Your birth, read by the stars",
    features: [
      "Everything in Seeker",
      "Personalised AI birth reading",
      "Core personality & strengths",
      "One remedial practice",
    ],
    cta: { to: "/pricing?need=basic", label: "Unlock Basic" },
    style: "glass-card border-[rgba(255,153,51,0.4)]",
    popular: false,
  },
  {
    key: "premium",
    name: "Jyotishi",
    price: "₹999",
    period: "/ reading",
    tagline: "The full Kundali, illuminated",
    features: [
      "Everything in Sadhaka",
      "Visual North-Indian Kundali chart",
      "Detailed planetary placements",
      "~700-word premium interpretation",
      "Career, wealth, love, health & dharma",
    ],
    cta: { to: "/pricing?need=premium", label: "Unlock Premium" },
    style: "premium-card",
    popular: true,
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden cosmic-bg">
        <div className="absolute inset-0 starfield opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0D14]/40 to-[#0A0D14]" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-28 md:py-40">
          <div className="max-w-3xl fade-up">
            <div className="mandala-border inline-flex items-center gap-2 text-[#D4AF37] mb-8">
              <span className="font-accent text-[10px]">Sidereal Vedic Jyotish</span>
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-medium leading-[1.05] tracking-tight text-zinc-50" data-testid="hero-title">
              The ancient sky,<br />
              <span className="text-gold-gradient italic">read for you.</span>
            </h1>
            <p className="mt-8 text-lg text-zinc-300 font-body leading-relaxed max-w-xl">
              Three doors into the wisdom of Jyotish — the sacred science of light.
              Learn the grahas, meet your nakshatra, or receive a full kundali interpretation
              crafted by AI in the voice of a classical astrologer.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to={user ? "/basic" : "/register"} data-testid="hero-cta-primary">
                <button className="btn-saffron">
                  Cast a Reading <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/grahas" data-testid="hero-cta-secondary">
                <button className="px-8 py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body">
                  Explore Free Wisdom
                </button>
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { icon: Sun, label: "9 Grahas" },
                { icon: Moon, label: "27 Nakshatras" },
                { icon: Star, label: "12 Bhavas" },
              ].map(({ icon: Icon, label }, i) => (
                <div key={label} className={`flex items-center gap-3 fade-up delay-${(i + 1) * 100}`}>
                  <Icon className="h-5 w-5 text-[#FFD700]" />
                  <span className="font-accent text-[11px] text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PANCHANG + FESTIVALS */}
      <PanchangSection />

      {/* PRICING */}
      <section className="relative cosmic-bg py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 fade-up">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">Choose your path</p>
            <h2 className="font-heading text-4xl md:text-5xl text-zinc-50">
              Three tiers, one tradition.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((t, i) => (
              <div
                key={t.key}
                className={`${t.style} p-10 fade-up delay-${(i + 1) * 100} relative hover:-translate-y-1 transition-transform duration-500`}
                data-testid={`pricing-card-${t.key}`}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B0000] text-[#FFD700] font-accent text-[10px] px-4 py-1">
                    Most Sought
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                  <span className="font-accent text-xs text-[#D4AF37]">{t.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-heading text-5xl text-zinc-50">{t.price}</span>
                  {t.period && <span className="font-body text-sm text-zinc-500">{t.period}</span>}
                </div>
                <p className="font-body text-zinc-400 italic mb-6">{t.tagline}</p>
                <ul className="space-y-3 mb-8">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-body text-zinc-300">
                      <Check className="h-4 w-4 text-[#FF9933] mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={t.cta.to} data-testid={`pricing-cta-${t.key}`}>
                  <button
                    className={
                      t.popular
                        ? "w-full bg-gradient-to-r from-[#D4AF37] to-[#FF9933] text-[#0A0D14] font-medium py-3 rounded-full shadow-[0_0_30px_rgba(255,153,51,0.3)] hover:shadow-[0_0_40px_rgba(255,153,51,0.5)] transition-all"
                        : "w-full py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body"
                    }
                  >
                    {t.cta.label}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Invitation strip */}
      <section className="relative border-y border-[rgba(212,175,55,0.15)] bg-[#121824]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-20 text-center">
          <div className="ornate-divider mb-6">
            <span className="font-accent text-xs text-[#D4AF37]">ज्योतिष</span>
          </div>
          <p className="font-heading italic text-3xl md:text-4xl text-zinc-200 leading-snug">
            "The stars incline, they do not compel.<br />
            The kundali shows the field — the soul still plays the game."
          </p>
        </div>
      </section>
    </div>
  );
}
