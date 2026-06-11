import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Star, Moon, Sun, Check, ArrowRight } from "lucide-react";
import PanchangSection from "../components/PanchangSection";
import RashifalTile from "../components/RashifalTile";
import VisitorStats from "../components/VisitorStats";

export default function Landing() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const tiers = [
    {
      key: "free",
      name: t("landing.tier_seeker_name"),
      price: t("pricing.tier_seeker.price"),
      tagline: t("landing.tier_seeker_tag"),
      features: [
        t("landing.tier_seeker_f1"),
        t("landing.tier_seeker_f2"),
        t("landing.tier_seeker_f3"),
      ],
      cta: { to: "/grahas", label: t("landing.tier_seeker_cta") },
      style: "glass-card",
    },
    {
      key: "basic",
      name: t("landing.tier_sadhaka_name"),
      price: t("pricing.tier_sadhaka.price"),
      period: t("landing.tier_sadhaka_price_suffix"),
      tagline: t("landing.tier_sadhaka_tag"),
      features: [
        t("landing.tier_sadhaka_f1"),
        t("landing.tier_sadhaka_f2"),
      ],
      cta: { to: "/pricing?need=basic", label: t("landing.tier_sadhaka_cta") },
      style: "glass-card border-[rgba(255,153,51,0.4)]",
    },
    {
      key: "premium",
      name: t("landing.tier_jyotishi_name"),
      price: t("pricing.tier_jyotishi.price"),
      period: t("landing.tier_jyotishi_price_suffix"),
      tagline: t("landing.tier_jyotishi_tag"),
      features: [
        t("landing.tier_jyotishi_f1"),
        t("landing.tier_jyotishi_f2"),
        t("landing.tier_jyotishi_f3"),
        t("landing.tier_jyotishi_f4"),
        t("landing.tier_jyotishi_f5"),
        t("landing.tier_jyotishi_f6"),
        t("landing.tier_jyotishi_f7"),
      ],
      cta: { to: "/pricing?need=premium", label: t("landing.tier_jyotishi_cta") },
      style: "premium-card",
      popular: true,
    },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden cosmic-bg">
        <div className="absolute inset-0 starfield opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0D14]/40 to-[#0A0D14]" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-7 fade-up">
              <div className="mandala-border inline-flex items-center gap-2 text-[#D4AF37] mb-8">
                <span className="font-accent text-[10px]">{t("landing.hero_eyebrow")}</span>
              </div>
              <h1 className="font-heading text-5xl md:text-7xl font-medium leading-[1.05] tracking-tight text-zinc-50" data-testid="hero-title">
                {t("landing.hero_title_a")}<br />
                <span className="text-gold-gradient italic">{t("landing.hero_title_b")}</span>
              </h1>
              <p className="mt-8 text-lg text-zinc-300 font-body leading-relaxed max-w-xl">
                {t("landing.hero_subtitle")}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to={user ? "/basic" : "/register"} data-testid="hero-cta-primary">
                  <button className="btn-saffron">
                    {t("landing.hero_cta_begin")} <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link to="/grahas" data-testid="hero-cta-secondary">
                  <button className="px-8 py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body">
                    {t("landing.hero_cta_learn")}
                  </button>
                </Link>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-6 max-w-xl">
                {[
                  { icon: Sun,  label: t("landing.stat_grahas") },
                  { icon: Moon, label: t("landing.stat_nakshatras") },
                  { icon: Star, label: t("landing.stat_bhavas") },
                ].map(({ icon: Icon, label }, i) => (
                  <div key={label} className={`flex items-center gap-3 fade-up delay-${(i + 1) * 100}`}>
                    <Icon className="h-5 w-5 text-[#FFD700]" />
                    <span className="font-accent text-[11px] text-zinc-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <RashifalTile compact />
            </div>
          </div>
        </div>
      </section>

      <PanchangSection />

      <section className="relative cosmic-bg py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 fade-up">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">{t("landing.pricing_eyebrow")}</p>
            <h2 className="font-heading text-4xl md:text-5xl text-zinc-50">
              {t("landing.pricing_title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier, i) => (
              <div
                key={tier.key}
                className={`${tier.style} p-10 fade-up delay-${(i + 1) * 100} relative hover:-translate-y-1 transition-transform duration-500`}
                data-testid={`pricing-card-${tier.key}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#8B0000] text-[#FFD700] font-accent text-[10px] px-4 py-1">
                    {t("landing.most_sought")}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                  <span className="font-accent text-xs text-[#D4AF37]">{tier.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-heading text-5xl text-zinc-50">{tier.price}</span>
                  {tier.period && <span className="font-body text-sm text-zinc-500">{tier.period}</span>}
                </div>
                <p className="font-body text-zinc-400 italic mb-6">{tier.tagline}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-body text-zinc-300">
                      <Check className="h-4 w-4 text-[#FF9933] mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={tier.cta.to} data-testid={`pricing-cta-${tier.key}`}>
                  <button
                    className={
                      tier.popular
                        ? "w-full bg-gradient-to-r from-[#D4AF37] to-[#FF9933] text-[#0A0D14] font-medium py-3 rounded-full shadow-[0_0_30px_rgba(255,153,51,0.3)] hover:shadow-[0_0_40px_rgba(255,153,51,0.5)] transition-all"
                        : "w-full py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body"
                    }
                  >
                    {tier.cta.label}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-y border-[rgba(212,175,55,0.15)] bg-[#121824]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-20 text-center">
          <div className="ornate-divider mb-6">
            <span className="font-accent text-xs text-[#D4AF37]">ज्योतिष</span>
          </div>
          <p className="font-heading italic text-3xl md:text-4xl text-zinc-200 leading-snug">
            {t("landing.invocation")}
          </p>
        </div>
      </section>

      <VisitorStats />
    </div>
  );
}
