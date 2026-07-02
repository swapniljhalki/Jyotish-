import { useTranslation } from "react-i18next";
import { Quote, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    text:
      "It was really soul filling having a conversation with you. There were some incidents which u told exactly with exact date and I was shocked. Your guidance over my chart has really helped me to figure out things in my life. Thank you so much....",
    author: "Rachana",
    place: "Bangalore",
  },
  {
    text:
      "It was insightful and clear guidance shared, really helpful and I would like to do reading for one more family member soon. Thank you...",
    author: "Thomas",
    place: "Kerala",
  },
  {
    text:
      "Thank you Satish Jhalki ji, your wonderful Tailored consultations, particularly for career or relationship issues, are often seen as 'spot on' and reassuring, according to your forecast. Very Genuine person, Thank you",
    author: "Priraj",
    place: "",
  },
  {
    text:
      "I went to Mr. Satish for my son's numerology prediction. What he said first about his personality is accurate and I am very much satisfied. If someone ask me about Numerology predictions I definitely suggest him.",
    author: "Madhavi",
    place: "Hyderabad",
  },
  {
    text:
      "Thank you Satish for such a detailed and insightful numerology reading. Your explanation of my Mulank 9 & Bhagyank 1 felt incredibly accurate—especially the balance of leadership and purpose. The remedies, Tuesday practices, and simple guidance like grounding and using the colour Red were practical and easy to follow. This report gave me real clarity on my strengths and upcoming phases. Grateful for your guidance!",
    author: "R.P",
    place: "Chennai",
  },
];

function TestimonialCard({ t9l, idx }) {
  return (
    <figure
      className="glass-card p-7 md:p-8 relative flex flex-col fade-up"
      style={{ animationDelay: `${idx * 90}ms` }}
      data-testid={`testimonial-card-${idx}`}
    >
      <Quote className="w-7 h-7 text-[#B8741A] opacity-60 mb-4" aria-hidden="true" />
      <blockquote className="font-body text-zinc-200 leading-relaxed flex-1">
        “{t9l.text}”
      </blockquote>
      <figcaption className="mt-6 pt-4 border-t border-[rgba(212,175,55,0.2)] flex items-center justify-between">
        <div>
          <div className="font-heading text-lg text-[#5C3A09]">— {t9l.author}</div>
          {t9l.place && (
            <div className="font-accent text-[10px] tracking-widest uppercase text-zinc-800 mt-0.5">
              {t9l.place}
            </div>
          )}
        </div>
        <div className="flex gap-0.5" aria-label="5 star rating">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-[#D96600] text-[#D96600]" aria-hidden="true" />
          ))}
        </div>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  const { t } = useTranslation();
  return (
    <div className="cosmic-bg min-h-screen pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-6 md:px-10" data-testid="testimonials-page">
        <p className="font-accent text-xs text-[#B8860B] mb-3 tracking-widest uppercase">
          {t("testimonials.eyebrow")}
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-zinc-50">
          {t("testimonials.title_a")}{" "}
          <span className="text-gold-gradient italic">{t("testimonials.title_b")}</span>
        </h1>
        <p className="mt-4 font-body text-zinc-700 max-w-2xl leading-relaxed">
          {t("testimonials.intro")}
        </p>

        <div className="ornate-divider my-10">
          <span className="font-accent text-xs text-[#B8860B]">ॐ</span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {TESTIMONIALS.slice(0, 4).map((x, i) => (
            <TestimonialCard key={x.author} t9l={x} idx={i} />
          ))}
        </div>
        <div className="mt-6">
          <TestimonialCard t9l={TESTIMONIALS[4]} idx={4} />
        </div>
      </div>
    </div>
  );
}
