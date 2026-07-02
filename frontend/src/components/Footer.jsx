import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-white border-t border-[rgba(92,58,9,0.08)] mt-24 relative overflow-hidden">
      <div className="sb-container pt-20 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-5">
              <img
                src="/snw-logo.jpg"
                alt="Satish Numero World"
                className="h-12 w-12 rounded-full object-cover ring-1 ring-[rgba(92,58,9,0.15)]"
              />
              <h4 className="font-heading text-2xl text-[#2A1A05] leading-tight font-bold tracking-tight">Satish Numero World</h4>
            </div>
            <p className="text-[15px] text-[#6B3410] leading-relaxed max-w-md">
              Ancient sidereal wisdom, read through a modern lens. Charts computed deterministically;
              interpretations offered as guidance — not destiny.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="sb-eyebrow" style={{ marginBottom: "1rem" }}>Explore</p>
            <ul className="space-y-3 text-[14px] text-[#5C3A09]">
              <li><Link to="/about" className="hover:text-[#FF8C00] transition-colors">About</Link></li>
              <li><Link to="/grahas" className="hover:text-[#FF8C00] transition-colors">{t("nav.grahas")}</Link></li>
              <li><Link to="/nakshatras" className="hover:text-[#FF8C00] transition-colors">{t("nav.nakshatras")}</Link></li>
              <li><Link to="/numerology" className="hover:text-[#FF8C00] transition-colors">{t("nav.numerology")}</Link></li>
              <li><Link to="/pricing" className="hover:text-[#FF8C00] transition-colors">{t("nav.pricing")}</Link></li>
              <li><Link to="/testimonials" className="hover:text-[#FF8C00] transition-colors">{t("nav.testimonials")}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="sb-eyebrow" style={{ marginBottom: "1rem" }}>Disclaimer</p>
            <p className="text-[14px] text-[#6B3410] leading-relaxed">
              Readings are for reflection and cultural exploration. This service is not a substitute
              for medical, legal or financial advice.
            </p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[rgba(92,58,9,0.08)] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#5C3A09] font-medium">
            © {new Date().getFullYear()} Satish Numero World. All sacred rights reserved.
          </p>
          <p className="font-accent text-[11px] text-[#5C3A09]">ॐ शान्ति · शान्ति · शान्ति</p>
        </div>
      </div>

      {/* Massive subtle brand watermark */}
      <div className="absolute bottom-[-1.5rem] left-1/2 -translate-x-1/2 sb-brand-watermark" aria-hidden="true">
        SATISH NUMERO
      </div>
    </footer>
  );
}
