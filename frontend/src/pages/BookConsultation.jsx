import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Loader2, ExternalLink } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/satishnumeroworld7";

export default function BookConsultation() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduled, setScheduled] = useState(false);

  // Build the prefilled URL using URLSearchParams; safe URL encoding handled automatically.
  const calendlyUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (user?.name) params.append("name", user.name);
    if (user?.email) params.append("email", user.email);
    const qs = params.toString();
    return qs ? `${CALENDLY_URL}?${qs}` : CALENDLY_URL;
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

      {/* CALENDLY EMBED */}
      <section className="pb-24">
        <div className="sb-container">
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
              url={calendlyUrl}
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
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#FF8C00] hover:text-[#E67A00] underline-offset-2 hover:underline"
              data-testid="book-fallback-link"
            >
              Open Calendly directly <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          </p>
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
