import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Check } from "lucide-react";

const services = [
  "Personal Numerology Readings",
  "Birth Chart & Astrology Consultations",
  "Tarot Card Readings",
  "Love & Relationship Guidance",
  "Career & Business Insights",
  "Life Path & Purpose Analysis",
  "Compatibility Reports",
  "Yearly Forecasts and Future Trends",
  "Business Analysis",
  "Name Corrections and aligning with positive numbers",
];

export default function About() {
  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]" data-testid="about-page">
      {/* HERO */}
      <section className="sb-section">
        <div className="sb-container">
          <div className="sb-hero-grid">
            <div className="fade-up">
              <span className="sb-eyebrow" data-testid="about-eyebrow">About the astrologer</span>
              <h1 className="sb-h1" data-testid="about-heading">
                Welcome — I&apos;m{" "}
                <span className="italic font-medium" style={{ color: "#5C3A09" }}>Satissh Jhalki.</span>
              </h1>
              <p className="sb-lead mt-8">
                A professional Numerologist, Astrologer, and Tarot Reader dedicated to helping individuals
                gain clarity, confidence, and direction in their lives.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/basic" data-testid="about-cta-reading">
                  <button className="sb-btn-primary">
                    Begin a Reading <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <Link to="/book" data-testid="about-cta-book">
                  <button className="sb-btn-outline">Book a 1:1 Consultation</button>
                </Link>
              </div>
            </div>

            <div className="fade-up delay-200">
              <div className="relative rounded-3xl overflow-hidden border border-[rgba(212,175,55,0.35)] shadow-[0_25px_60px_-15px_rgba(92,58,9,0.35)] bg-[#FDFBF7]">
                <img
                  src="https://customer-assets.emergentagent.com/job_kundali-chart-1/artifacts/l8wzt5o0_1762450702486.jfif"
                  alt="Satissh Jhalki, professional Vedic astrologer and numerologist"
                  className="w-full h-[440px] md:h-[500px] object-cover object-center"
                  data-testid="about-astrologer-photo"
                />
                {/* soft golden top-highlight */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(212,175,55,0.15)] to-transparent" />
                {/* Name plate below the photo — never covers the face */}
                <div className="px-6 py-5 border-t border-[rgba(212,175,55,0.35)] bg-white">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#FF8C00]" strokeWidth={1.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#5C3A09]">
                      The astrologer
                    </span>
                  </div>
                  <p className="font-heading text-2xl md:text-3xl leading-tight text-[#2A1A05] mt-1">
                    Satissh Jhalki
                  </p>
                  <p className="text-[13px] text-[#6B3410] mt-0.5">
                    Numerologist • Vedic Astrologer • Tarot Reader
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MY APPROACH */}
      <section className="sb-section pt-0">
        <div className="sb-container">
          <div className="max-w-3xl mx-auto fade-up">
            <div className="sb-card sb-card-hover">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-[#FF8C00]" strokeWidth={1.5} />
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#5C3A09]">My approach</span>
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-[#2A1A05] mb-5 tracking-tight">
                Traditional knowledge, intuitive interpretation, practical guidance.
              </h3>
              <p className="text-[15px] text-[#6B3410] leading-relaxed">
                Every reading is personalized because no two individuals share the same journey.
                Whether you are seeking answers about love, marriage, career growth, finances, family
                matters, or spiritual development, my goal is to provide meaningful insights that help
                you make informed decisions with greater confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY / STORY */}
      <section className="sb-section pt-0">
        <div className="sb-container">
          <div className="max-w-3xl mx-auto space-y-10 fade-up">
            <div>
              <span className="sb-eyebrow">The journey</span>
              <h2 className="sb-h2">A lifetime studying the sacred sciences.</h2>
            </div>
            <p className="text-[18px] leading-[1.75] text-[#5C3A09]">
              I have been guiding clients through life&apos;s important questions using the powerful insights
              of <strong className="font-semibold text-[#2A1A05]">Numerology, Astrology, and Tarot</strong>.
              These ancient systems offer a deeper understanding of personality, relationships, career
              opportunities, life purpose, and the challenges and opportunities that lie ahead.
            </p>
            <p className="text-[18px] leading-[1.75] text-[#5C3A09]">
              I believe that spiritual guidance is not about predicting a fixed future — it&apos;s about
              understanding the energies, patterns, and possibilities that can help you navigate life
              more effectively. My readings are designed to empower you with knowledge, self-awareness,
              and a clearer perspective on your journey.
            </p>
            <p className="text-[18px] leading-[1.75] text-[#5C3A09]">
              Thousands of people turn to Numerology, Astrology, and Tarot for guidance during times of
              uncertainty, transformation, and personal growth. If you&apos;re looking for honest insights,
              compassionate support, and a deeper understanding of your life&apos;s path, I would be honored
              to assist you.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES BAND */}
      <section className="sb-band-dark">
        <div className="sb-container relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="sb-eyebrow" style={{ color: "#D4AF37" }}>My services</span>
            <h2 className="font-heading font-bold tracking-tight text-4xl md:text-5xl text-[#FDFBF7] leading-tight">
              Ten doors into your unfolding story.
            </h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-5 max-w-4xl mx-auto" data-testid="about-services-list">
            {services.map((s) => (
              <li key={s} className="flex items-start gap-4 text-[16px] text-[#FDFBF7] leading-relaxed">
                <Check className="h-5 w-5 mt-1 flex-shrink-0 text-[#B8860B]" strokeWidth={2} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="sb-section">
        <div className="sb-container">
          <div className="max-w-3xl mx-auto text-center fade-up">
            <span className="sb-eyebrow">Begin here</span>
            <h2 className="sb-h2 mb-6">
              Your journey of self-discovery{" "}
              <span className="italic font-medium" style={{ color: "#5C3A09" }}>begins here.</span>
            </h2>
            <p className="sb-lead mx-auto mb-10">
              Let&apos;s uncover the guidance the universe has in store for you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/pricing" data-testid="about-cta-pricing">
                <button className="sb-btn-primary">
                  View Readings & Pricing <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/book" data-testid="about-cta-book-bottom">
                <button className="sb-btn-outline">Book a Consultation</button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
