// Reusable number card used across Numerology + Premium Numerology pages.
import { useTranslation } from "react-i18next";

const PLANET_GLYPH = {
  Surya: "☉",
  Chandra: "☾",
  Guru: "♃",
  Rahu: "☊",
  Budha: "☿",
  Shukra: "♀",
  Ketu: "☋",
  Shani: "♄",
  Mangala: "♂",
};

function Field({ label, value, stack }) {
  if (!value) return null;
  if (stack) {
    return (
      <div>
        <div className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{label}</div>
        <div className="text-zinc-300 mt-0.5">{value}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-between gap-3">
      <span className="font-accent text-[9px] text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className="text-zinc-300 text-right">{value}</span>
    </div>
  );
}

export default function NumberCard({ block, accent }) {
  const { t } = useTranslation();
  if (!block || !block.planet) {
    return (
      <div className="glass-card p-6">
        <div className="font-accent text-[10px] text-[#D4AF37] mb-2">{block?.label}</div>
        <div className="text-zinc-500 font-body text-sm">{block?.derivation}</div>
      </div>
    );
  }
  return (
    <div
      className="glass-card p-6 hover:-translate-y-1 transition-all duration-300"
      data-testid={`numerology-card-${block.label.toLowerCase().split(" ")[0]}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-accent text-[10px] text-[#D4AF37] tracking-widest">
            {block.label}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className={`font-heading text-6xl ${accent}`}>{block.number}</span>
            <span className="font-heading text-2xl text-zinc-400">
              {PLANET_GLYPH[block.planet] || "✦"}
            </span>
          </div>
          <div className="mt-1 font-body text-xs text-zinc-500">{block.derivation}</div>
        </div>
        <div className="text-right">
          <div className="font-heading text-lg text-zinc-100">{block.planet}</div>
          <div className="font-body text-xs text-zinc-500">{block.planet_english}</div>
        </div>
      </div>

      <div className="font-body text-sm text-zinc-300 leading-relaxed">{block.traits}</div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs font-body">
        <Field label={t("premium_numerology.gemstone")} value={block.gemstone} />
        <Field label={t("premium_numerology.deity")} value={block.deity} />
        <Field label={t("premium_numerology.mantra")} value={block.mantra} />
        <Field label={t("premium_numerology.lucky_days")} value={block.lucky_days?.join(", ")} />
        <Field label={t("premium_numerology.lucky_colors")} value={block.lucky_colors?.join(", ")} />
        <Field label={t("premium_numerology.lucky_numbers")} value={block.lucky_numbers?.join(", ")} />
      </div>

      <div className="mt-4 pt-4 border-t border-[rgba(212,175,55,0.12)] grid grid-cols-1 gap-2 text-xs font-body">
        <Field label={t("premium_numerology.career")} value={block.career} stack />
        <Field label={t("premium_numerology.challenges")} value={block.challenges} stack />
      </div>
    </div>
  );
}
