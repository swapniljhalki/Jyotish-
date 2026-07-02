import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Quote, Star, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

/** Same five testimonials as /testimonials, lightly trimmed for the strip. */
const TESTIMONIALS = [
  {
    text:
      "It was really soul filling having a conversation with you. There were some incidents which you told exactly with exact date and I was shocked. Your guidance over my chart has really helped me to figure out things in my life. Thank you so much.",
    author: "Rachana",
    place: "Bangalore",
  },
  {
    text:
      "It was insightful and clear guidance shared, really helpful and I would like to do reading for one more family member soon. Thank you.",
    author: "Thomas",
    place: "Kerala",
  },
  {
    text:
      "Thank you Satish Jhalki ji, your wonderful tailored consultations — particularly for career or relationship issues — are often 'spot on' and reassuring. Very genuine person. Thank you.",
    author: "Priraj",
    place: "",
  },
  {
    text:
      "I went to Mr. Satish for my son's numerology prediction. What he said first about his personality is accurate and I am very much satisfied. If someone asks me about numerology predictions I definitely suggest him.",
    author: "Madhavi",
    place: "Hyderabad",
  },
  {
    text:
      "Thank you Satish for such a detailed and insightful numerology reading. Your explanation of my Mulank 9 & Bhagyank 1 felt incredibly accurate — especially the balance of leadership and purpose. Grateful for your guidance!",
    author: "R.P",
    place: "Chennai",
  },
];

const ROTATION_MS = 7000;

export default function TestimonialStrip() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback((i) => {
    const len = TESTIMONIALS.length;
    setIndex(((i % len) + len) % len);
  }, []);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, ROTATION_MS);
    return () => window.clearInterval(timerRef.current);
  }, [paused]);

  const current = TESTIMONIALS[index];

  return (
    <section
      className="sb-section"
      style={{ background: "#FDFBF7" }}
      data-testid="landing-testimonial-strip"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="sb-container">
        <div className="flex items-end justify-between gap-6 mb-8 fade-up">
          <div>
            <span className="sb-eyebrow">Loved by seekers</span>
            <h2 className="sb-h2">
              Words from{" "}
              <span className="italic font-medium" style={{ color: "#5C3A09" }}>our community.</span>
            </h2>
          </div>
          <Link
            to="/testimonials"
            className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold tracking-widest uppercase text-[#5C3A09] hover:text-[#FF8C00] transition-colors shrink-0"
            data-testid="strip-view-all-link"
          >
            View all <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>

        <div
          className="relative sb-card sb-card-hover max-w-5xl mx-auto fade-up"
          style={{ minHeight: 280 }}
          data-testid="strip-card"
        >
          {/* Decorative quote mark */}
          <Quote
            className="absolute -top-4 left-8 h-8 w-8"
            style={{ color: "#FF8C00", opacity: 0.85 }}
            strokeWidth={1.5}
            aria-hidden="true"
          />

          <div key={index} className="testimonial-fade px-4 sm:px-8 py-6">
            <p
              className="font-heading text-2xl md:text-3xl leading-snug"
              style={{ color: "#2A1A05", fontWeight: 500 }}
              data-testid="strip-text"
            >
              {current.text}
            </p>

            <div className="mt-7 pt-5 border-t border-[rgba(139,94,26,0.15)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div
                  className="font-heading text-lg"
                  style={{ color: "#5C3A09" }}
                  data-testid="strip-author"
                >
                  — {current.author}
                </div>
                {current.place && (
                  <div className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: "#6B3410" }}>
                    {current.place}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5" aria-label="5 star rating">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#FF8C00] text-[#FF8C00]" aria-hidden="true" />
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute inset-y-0 left-0 hidden md:flex items-center -translate-x-1/2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              data-testid="strip-prev-btn"
              className="h-10 w-10 rounded-full bg-white shadow-md border border-[rgba(139,94,26,0.12)] hover:bg-[#FFF7ED] hover:border-[#FF8C00] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-[#5C3A09]" strokeWidth={2} />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 hidden md:flex items-center translate-x-1/2">
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              data-testid="strip-next-btn"
              className="h-10 w-10 rounded-full bg-white shadow-md border border-[rgba(139,94,26,0.12)] hover:bg-[#FFF7ED] hover:border-[#FF8C00] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-[#5C3A09]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Testimonial pager">
          {TESTIMONIALS.map((tx, i) => (
            <button
              key={tx.author}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show testimonial from ${tx.author}`}
              onClick={() => goTo(i)}
              data-testid={`strip-dot-${i}`}
              className="transition-all rounded-full"
              style={{
                width: i === index ? 24 : 8,
                height: 8,
                background: i === index ? "#FF8C00" : "rgba(139,94,26,0.25)",
              }}
            />
          ))}
        </div>

        {/* Mobile "View all" link */}
        <div className="sm:hidden text-center mt-6">
          <Link
            to="/testimonials"
            className="inline-flex items-center gap-1 text-[12px] font-semibold tracking-widest uppercase text-[#5C3A09] hover:text-[#FF8C00]"
            data-testid="strip-view-all-link-mobile"
          >
            View all reviews <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
