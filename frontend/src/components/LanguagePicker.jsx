// Compact language picker — globe icon + native script label.
// Persists choice in localStorage (key "snw_lang") via i18next-browser-languagedetector,
// and mirrors it onto <html lang="…"> so CSS can swap Noto fonts per script.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { LANGUAGES } from "../i18n";

export default function LanguagePicker({ variant = "navbar" }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) || LANGUAGES[0];

  useEffect(() => {
    document.documentElement.setAttribute("lang", current.code);
  }, [current.code]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!e.target.closest("[data-lang-picker]")) setOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  const pick = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  const isCompact = variant === "navbar";

  return (
    <div className="relative" data-lang-picker data-testid="language-picker">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("nav.language")}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[rgba(212,175,55,0.25)] hover:border-[#FF9933] hover:bg-[rgba(255,153,51,0.08)] transition-colors text-xs text-zinc-300"
        data-testid="language-picker-trigger"
      >
        <Globe className="h-3.5 w-3.5 text-[#D4AF37]" />
        <span className="font-body">{isCompact ? current.code.toUpperCase() : current.native}</span>
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-md border border-[rgba(212,175,55,0.25)] bg-[#0A0D14] shadow-2xl shadow-black/60 backdrop-blur-xl z-50 overflow-hidden"
          data-testid="language-picker-menu"
        >
          {LANGUAGES.map((l) => {
            const active = l.code === current.code;
            return (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                data-testid={`language-option-${l.code}`}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-body text-left transition-colors ${
                  active
                    ? "bg-[rgba(255,153,51,0.12)] text-[#FFD700]"
                    : "text-zinc-200 hover:bg-[rgba(212,175,55,0.06)]"
                }`}
              >
                <span>
                  <span className="block leading-tight">{l.native}</span>
                  <span className="block text-[10px] text-zinc-500 leading-tight">{l.label}</span>
                </span>
                {active && <Check className="h-3.5 w-3.5 text-[#FFD700]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
