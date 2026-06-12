import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";
import UpgradeButton from "../components/UpgradeButton";
import api from "../lib/api";

const TIER_KEYS = ["free", "basic", "premium"];

export default function Pricing() {
  const { user, subscribe } = useAuth();
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const recommend = params.get("need");
  const [pending, setPending] = useState("");
  const [payMode, setPayMode] = useState(null);

  useEffect(() => {
    api.get("/payments/config").then((r) => setPayMode(r.data?.mode)).catch(() => {});
  }, []);

  const TIERS = [
    {
      key: "free",
      name: t("pricing.tier_seeker.name"),
      price: t("pricing.tier_seeker.price"),
      features: [t("pricing.tier_seeker.f1"), t("pricing.tier_seeker.f2"), t("pricing.tier_seeker.f3")],
    },
    {
      key: "basic",
      name: t("pricing.tier_sadhaka.name"),
      price: t("pricing.tier_sadhaka.price"),
      features: [t("pricing.tier_sadhaka.f1"), t("pricing.tier_sadhaka.f2")],
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
      popular: true,
    },
  ];

  const upgrade = async (tier) => {
    if (!user) return nav("/login");
    if (tier !== "free") return; // paid tiers handled by <UpgradeButton />
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

  // Suppress unused-var
  void TIER_KEYS;

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="text-center mb-14 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">{t("pricing.eyebrow")}</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            {t("pricing.title_a")} <span className="text-gold-gradient italic">{t("pricing.title_b")}</span>
          </h1>
          <p className="mt-3 font-body text-zinc-500 text-sm italic" data-testid="pricing-pay-mode">
            {t("pricing.pay_note")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((tier, i) => {
            const isCurrent = user && user.tier === tier.key;
            const isRecommended = recommend === tier.key;
            return (
              <div
                key={tier.key}
                className={`${tier.popular ? "premium-card" : "glass-card"} p-8 fade-up delay-${(i + 1) * 100} ${
                  isRecommended ? "ring-2 ring-[#FF9933]" : ""
                }`}
                data-testid={`tier-card-${tier.key}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                    <span className="font-accent text-xs text-[#D4AF37]">{tier.name}</span>
                  </div>
                  {tier.popular && (
                    <span className="text-[9px] font-accent text-[#FFD700] bg-[#8B0000] px-2 py-0.5">
                      {t("pricing.most_sought")}
                    </span>
                  )}
                </div>
                <div className="font-heading text-5xl text-zinc-50 mb-6">{tier.price}</div>
                <ul className="space-y-2 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-body text-zinc-300">
                      <Check className="h-4 w-4 text-[#FF9933] mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] font-body opacity-70"
                    data-testid={`tier-current-${tier.key}`}
                  >
                    {t("common.current_tier")}
                  </button>
                ) : user ? (
                  tier.key === "free" ? (
                    <button
                      onClick={() => upgrade(tier.key)}
                      disabled={pending === tier.key}
                      className="w-full py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body disabled:opacity-60"
                      data-testid={`tier-upgrade-${tier.key}`}
                    >
                      {pending === tier.key ? t("common.switching") : t("pricing.switch_to_free")}
                    </button>
                  ) : (
                    <UpgradeButton
                      tier={tier.key}
                      variant="unstyled"
                      onSuccess={() => onPaidSuccess(tier.key)}
                      className={`w-full justify-center py-3 ${
                        tier.popular
                          ? "bg-gradient-to-r from-[#D4AF37] to-[#FF9933] text-[#0A0D14] font-medium rounded-full shadow-[0_0_30px_rgba(255,153,51,0.3)] hover:shadow-[0_0_40px_rgba(255,153,51,0.5)]"
                          : "border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] font-body"
                      }`}
                    />
                  )
                ) : (
                  <Link to="/login" className="block w-full text-center py-3 border border-[rgba(212,175,55,0.4)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-colors font-body">
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
