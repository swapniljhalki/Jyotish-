import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";
import UpgradeButton from "../components/UpgradeButton";
import api from "../lib/api";

export default function Pricing() {
  const { user, subscribe } = useAuth();
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const recommend = params.get("need");
  const [pending, setPending] = useState("");

  useEffect(() => {
    // Fetch payment config eagerly so any downstream <UpgradeButton /> gets a
    // warm HTTP cache. We don't need to store the value here.
    api.get("/payments/config").catch(() => {});
  }, []);

  const TIERS = [
    {
      key: "free",
      name: t("pricing.tier_seeker.name"),
      price: t("pricing.tier_seeker.price"),
      features: [t("pricing.tier_seeker.f1"), t("pricing.tier_seeker.f2"), t("pricing.tier_seeker.f3")],
      variant: "minimal",
    },
    {
      key: "basic",
      name: t("pricing.tier_sadhaka.name"),
      price: t("pricing.tier_sadhaka.price"),
      features: [
        t("pricing.tier_sadhaka.f1"),
        t("pricing.tier_sadhaka.f2"),
        t("pricing.tier_sadhaka.f3"),
        t("pricing.tier_sadhaka.f4"),
        t("pricing.tier_sadhaka.f5"),
        t("pricing.tier_sadhaka.f6"),
        t("pricing.tier_sadhaka.f7"),
        t("pricing.tier_sadhaka.f8"),
      ],
      variant: "default",
    },
    {
      key: "premium",
      name: t("pricing.tier_jyotishi.name"),
      price: t("pricing.tier_jyotishi.price"),
      features: [
        t("pricing.tier_jyotishi.f1"),
        t("pricing.tier_jyotishi.f2"),
        t("pricing.tier_jyotishi.f3"),
        t("pricing.tier_jyotishi.f4"),
        t("pricing.tier_jyotishi.f5"),
        t("pricing.tier_jyotishi.f6"),
        t("pricing.tier_jyotishi.f7"),
      ],
      variant: "dark",
      popular: true,
    },
  ];

  const upgrade = async (tier) => {
    if (!user) return nav("/login");
    if (tier !== "free") return;
    setPending(tier);
    try {
      await subscribe(tier);
      toast.success(t("common.switching"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending("");
    }
  };

  const onPaidSuccess = (tier) => {
    if (tier === "basic") nav("/basic");
    else if (tier === "premium") nav("/premium");
  };

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]">
      <div className="sb-container sb-section">
        <div className="max-w-3xl mb-16 fade-up">
          <span className="sb-eyebrow">{t("pricing.eyebrow")}</span>
          <h1 className="sb-h1">
            {t("pricing.title_a")}{" "}
            <span className="italic font-medium" style={{ color: "#5C3A09" }}>{t("pricing.title_b")}</span>
          </h1>
          <p className="sb-lead mt-6" data-testid="pricing-pay-mode">
            {t("pricing.pay_note")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {TIERS.map((tier, i) => {
            const isCurrent = user && user.tier === tier.key;
            const isRecommended = recommend === tier.key;
            const isDark = tier.variant === "dark";
            // Rank comparison — a tier "below" the user's current plan is
            // already unlocked for them via backend `require_tier` (which
            // uses the same rank ordering). We show it as an included plan
            // instead of offering a downgrade CTA that the API would reject.
            const RANK = { free: 0, basic: 1, premium: 2 };
            const isIncluded =
              user && !isCurrent && RANK[tier.key] < RANK[user.tier];
            const cardCls = tier.variant === "minimal"
              ? "sb-card sb-card-hover"
              : isDark
              ? "sb-card-dark relative"
              : "sb-card sb-card-hover border-[rgba(255,140,0,0.35)]";
            return (
              <div
                key={tier.key}
                className={`${cardCls} ${isRecommended && !isDark ? "ring-2 ring-[#FF8C00]" : ""} fade-up delay-${(i + 1) * 100} flex flex-col`}
                data-testid={`tier-card-${tier.key}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-8 bg-[#FF8C00] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                    {t("pricing.most_sought")}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className={`h-4 w-4 ${isDark ? "text-[#B8860B]" : "text-[#FF8C00]"}`} strokeWidth={1.5} />
                  <span className={`text-[11px] font-bold tracking-widest uppercase ${isDark ? "text-[#B8860B]" : "text-[#5C3A09]"}`}>{tier.name}</span>
                </div>
                <div className={`font-heading font-bold text-5xl md:text-6xl tracking-tight mb-8 ${isDark ? "text-white" : "text-[#2A1A05]"}`}>
                  {tier.price}
                </div>
                <ul className="space-y-3 mb-10 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-start gap-3 text-[14px] leading-relaxed ${isDark ? "text-[#FDFBF7]/90" : "text-[#5C3A09]"}`}>
                      <Check className={`h-4 w-4 mt-1 flex-shrink-0 ${isDark ? "text-[#B8860B]" : "text-[#FF8C00]"}`} strokeWidth={2} /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className={isDark ? "sb-btn-outline w-full opacity-70" : "sb-btn-outline w-full opacity-70"}
                    style={isDark ? { borderColor: "#D4AF37", color: "#D4AF37" } : {}}
                    data-testid={`tier-current-${tier.key}`}
                  >
                    {t("common.current_tier")}
                  </button>
                ) : isIncluded ? (
                  <button
                    disabled
                    className="sb-btn-outline w-full opacity-70"
                    data-testid={`tier-included-${tier.key}`}
                    title={`Included in your ${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} plan`}
                  >
                    {t("pricing.included_in_your_plan", "Included in your plan")}
                  </button>
                ) : user ? (
                  tier.key === "free" ? (
                    <button
                      onClick={() => upgrade(tier.key)}
                      disabled={pending === tier.key}
                      className="sb-btn-outline w-full"
                      data-testid={`tier-upgrade-${tier.key}`}
                    >
                      {pending === tier.key ? t("common.switching") : t("pricing.switch_to_free")}
                    </button>
                  ) : (
                    <UpgradeButton
                      tier={tier.key}
                      variant="unstyled"
                      onSuccess={() => onPaidSuccess(tier.key)}
                      className={isDark ? "sb-btn-saffron w-full" : "sb-btn-primary w-full"}
                    />
                  )
                ) : (
                  <Link to="/login" className={isDark ? "sb-btn-saffron w-full" : "sb-btn-outline w-full"}>
                    {t("common.sign_in_to_subscribe")}
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
