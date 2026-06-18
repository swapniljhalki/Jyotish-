import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Loader2, ExternalLink, Lock } from "lucide-react";
import UpgradeButton from "../components/UpgradeButton";

const CALENDLY_URL = "https://calendly.com/satishnumeroworld7";

export default function BookConsultation() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduled, setScheduled] = useState(false);

  const isPremium = user?.tier === "premium";

  // Split full name into first/last so Calendly fills both fields cleanly
  // (Calendly's default form has separate First name / Last name inputs).
  const prefill = useMemo(() => {
    if (!user?.email) return undefined;
    const parts = (user.name || "").trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName  = parts.slice(1).join(" ");
    return {
      email: user.email,
      name: user.name || user.email,
      firstName,
      lastName,
    };
  }, [user]);

  // Hide the loading state once Calendly signals the widget is ready.
  useCalendlyEventListener({
    onProfilePageViewed: () => setIsLoading(false),
    onEventTypeViewed:   () => setIsLoading(false),
    onPageHeightResize:  () => setIsLoading(false),
    onEventScheduled:    () => setScheduled(true),
  });

  // Fallback timeout in case Calendly events don't fire (ad-blocker / network issues)
  useEffect(() => {
    const t = window.setTimeout(() => setIsLoading(false), 10000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]" data-testid="book-page">
      {/* HERO */}
      <section className="sb-section pb-12">
        <div className="sb-container">
          <div className="max-w-3xl fade-up">
            <span className="sb-eyebrow" data-testid="book-eyebrow">1:1 Consultation</span>
            <h1 className="sb-h1">
              Sit with{" "}
              <span className="italic font-medium" style={{ color: "#8B5E1A" }}>Satissh.</span>
            </h1>
            <p className="sb-lead mt-6">
              A private one-on-one session — for the questions a written reading can't quite answer.
              Pick a time below; you'll receive a confirmation and a video-call link in your inbox.
            </p>
            {scheduled && (
              <div
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[rgba(30,57,50,0.10)] px-5 py-2.5 text-[13px] font-semibold text-[#1E3932]"
                data-testid="book-scheduled-pill"
              >
                ✓ Your session is booked — check your email for the calendar invite.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CALENDLY EMBED (premium-only) */}
      <section className="pb-24">
        <div className="sb-container">
          {isPremium ? (
            <>
              <div className="max-w-4xl mx-auto sb-card" data-testid="book-calendly-card" style={{ padding: 0, overflow: "hidden" }}>
                {isLoading && (
                  <div
                    className="flex items-center justify-center gap-3 py-12 border-b border-[rgba(92,58,9,0.08)]"
                    data-testid="book-loading"
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-[#FF8C00]" strokeWidth={2} />
                    <span className="text-[14px] font-medium text-[#6B3410]">
                      Loading available time slots…
                    </span>
                  </div>
                )}

                <InlineWidget
                  url={CALENDLY_URL}
                  prefill={prefill}
                  styles={{ height: "780px", width: "100%", minWidth: "320px" }}
                  pageSettings={{
                    backgroundColor: "ffffff",
                    primaryColor:    "ff8c00",
                    textColor:       "2A1A05",
                    hideEventTypeDetails: false,
                    hideLandingPageDetails: false,
                    hideGdprBanner: true,
                  }}
                />
              </div>

              {/* Fallback link in case the widget is blocked (privacy tools / restrictive CSP) */}
              <p className="text-center text-[13px] text-[#8B5E1A] mt-6">
                Trouble loading the scheduler?{" "}
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#FF8C00] hover:text-[#E67A00] underline-offset-2 hover:underline"
                  data-testid="book-fallback-link"
                >
                  Open Calendly directly <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                </a>
              </p>
            </>
          ) : (
            <div className="max-w-2xl mx-auto sb-card-dark text-center fade-up" data-testid="book-upgrade-gate">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(212,175,55,0.18)] mb-5">
                <Lock className="h-5 w-5 text-[#D4AF37]" strokeWidth={1.75} />
              </div>
              <div className="sb-eyebrow" style={{ color: "#D4AF37" }}>Premium members only</div>
              <h3 className="font-heading font-bold text-3xl md:text-4xl text-white mb-4 tracking-tight">
                1:1 sessions are reserved for Jyotishi members.
              </h3>
              <p className="text-[15px] text-[#FDFBF7]/80 leading-relaxed mb-8 max-w-md mx-auto">
                Unlock the Premium (Jyotishi) tier to schedule a private one-on-one consultation with Satissh.
                You'll also get the full Kundali reading, Numerology Dasha timeline, and all written insights.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <UpgradeButton tier="premium" data-testid="book-upgrade-btn" />
                <Link
                  to="/pricing?need=premium"
                  className="text-[12px] font-medium tracking-wider uppercase text-[#D4AF37] hover:text-[#FF8C00] transition-colors"
                  data-testid="book-compare-tiers"
                >
                  Compare all tiers
                </Link>
              </div>
              {user?.tier === "basic" && (
                <p className="text-[12px] text-[#FDFBF7]/60 mt-6">
                  You're currently on the Sadhaka (Basic) tier — upgrade unlocks 1:1 consultations.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="pb-24">
        <div className="sb-container">
          <div className="max-w-3xl mx-auto text-center">
            <span className="sb-eyebrow">Prefer a written reading first?</span>
            <h2 className="sb-h2 mb-6">
              Get your full Kundali{" "}
              <span className="italic font-medium" style={{ color: "#8B5E1A" }}>in minutes.</span>
            </h2>
            <p className="sb-lead mx-auto mb-10">
              Detailed AI-crafted birth-chart interpretation — perfect to bring to your consultation.
            </p>
            <Link to="/premium" data-testid="book-cta-premium">
              <button className="sb-btn-primary">
                Explore Premium Reading <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
