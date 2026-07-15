import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Check, ArrowRight, Sun, Moon, Star } from "lucide-react";
import PanchangSection from "../components/PanchangSection";
import RashifalTile from "../components/RashifalTile";
import VisitorStats from "../components/VisitorStats";
import TestimonialStrip from "../components/TestimonialStrip";

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
      variant: "minimal",
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
      variant: "default",
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
      variant: "dark",
      popular: true,
    },
  ];

  return (
    <div className="bg-[#FDFBF7]">
      {/* HERO — split 50/50 */}
      <section className="relative">
        <div className="sb-container py-20 md:py-28 lg:py-32">
          <div className="sb-hero-grid">
            <div className="fade-up">
              <span className="sb-eyebrow" data-testid="hero-eyebrow">{t("landing.hero_eyebrow")}</span>
              <h1 className="sb-h1" data-testid="hero-title">
                {t("landing.hero_title_a")}{" "}
                <span className="italic font-medium" style={{ color: "#5C3A09" }}>{t("landing.hero_title_b")}</span>
              </h1>
              <p className="sb-lead mt-8">
                {t("landing.hero_subtitle")}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link to={user ? "/basic" : "/register"} data-testid="hero-cta-primary">
                  <button className="sb-btn-primary">
                    {t("landing.hero_cta_begin")} <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link to="/grahas" data-testid="hero-cta-secondary">
                  <button className="sb-btn-outline">
                    {t("landing.hero_cta_learn")}
                  </button>
                </Link>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-8 max-w-md">
                {[
                  { icon: Sun,  label: t("landing.stat_grahas") },
                  { icon: Moon, label: t("landing.stat_nakshatras") },
                  { icon: Star, label: t("landing.stat_bhavas") },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-[#FF8C00]" strokeWidth={1.5} />
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#5C3A09]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fade-up delay-200">
              <div className="sb-card sb-card-hover">
                <RashifalTile compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PANCHANG */}
      <PanchangSection />

      {/* PRICING */}
      <section className="sb-section">
        <div className="sb-container">
          <div className="max-w-2xl mb-16 fade-up">
            <span className="sb-eyebrow">{t("landing.pricing_eyebrow")}</span>
            <h2 className="sb-h2">
              {t("landing.pricing_title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {tiers.map((tier, i) => {
              const isDark = tier.variant === "dark";
              const cardCls = tier.variant === "minimal"
                ? "sb-card sb-card-hover"
                : tier.variant === "dark"
                ? "sb-card-dark relative"
                : "sb-card sb-card-hover border-[rgba(255,140,0,0.35)]";
              return (
                <div
                  key={tier.key}
                  className={`${cardCls} fade-up delay-${(i + 1) * 100} flex flex-col`}
                  data-testid={`pricing-card-${tier.key}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-8 bg-[#FF8C00] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                      {t("landing.most_sought")}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles className={`h-4 w-4 ${isDark ? "text-[#B8860B]" : "text-[#FF8C00]"}`} strokeWidth={1.5} />
                    <span className={`text-[11px] font-bold tracking-widest uppercase ${isDark ? "text-[#B8860B]" : "text-[#5C3A09]"}`}>{tier.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className={`font-heading font-bold text-5xl md:text-6xl tracking-tight ${isDark ? "!text-white" : "text-[#2A1A05]"}`}>{tier.price}</span>
                    {tier.period && <span className={`text-sm ${isDark ? "text-[#B8860B]/70" : "text-[#5C3A09]"}`}>{tier.period}</span>}
                  </div>
                  <p className={`text-[15px] italic mb-8 ${isDark ? "text-[#FDFBF7]/80" : "text-[#6B3410]"}`}>{tier.tagline}</p>
                  <ul className="space-y-3 mb-10 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className={`flex items-start gap-3 text-[14px] leading-relaxed ${isDark ? "text-[#FDFBF7]/90" : "text-[#5C3A09]"}`}>
                        <Check className={`h-4 w-4 mt-1 flex-shrink-0 ${isDark ? "text-[#B8860B]" : "text-[#FF8C00]"}`} strokeWidth={2} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={tier.cta.to} data-testid={`pricing-cta-${tier.key}`}>
                    <button className={isDark ? "sb-btn-saffron w-full" : tier.variant === "minimal" ? "sb-btn-outline w-full" : "sb-btn-primary w-full"}>
                      {tier.cta.label}
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL STRIP — auto-rotating */}
      <TestimonialStrip />

      {/* FULL-WIDTH INVOCATION BAND */}
      <section className="sb-band-dark">
        <div className="sb-container relative z-10 text-center">
          <span className="sb-eyebrow" style={{ color: "#D4AF37" }}>ज्योतिष</span>
          <p className="font-heading italic font-medium text-3xl md:text-5xl leading-snug max-w-4xl mx-auto text-[#FDFBF7]">
            {t("landing.invocation")}
          </p>
        </div>
      </section>

      {/* VISITOR STATS */}
      <VisitorStats />
    </div>
  );
}
