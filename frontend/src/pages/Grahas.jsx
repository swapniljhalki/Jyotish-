import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Sparkles } from "lucide-react";

export default function Grahas() {
  const { t, i18n } = useTranslation();
  const [grahas, setGrahas] = useState([]);
  const [selected, setSelected] = useState(null);
  const lang = i18n.resolvedLanguage;

  useEffect(() => {
    api.get(`/grahas?lang=${lang}`).then((r) => setGrahas(r.data.grahas)).catch(() => {});
  }, [lang]);

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-12 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">{t("grahas_page.eyebrow")}</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            {t("grahas_page.title_a")} <span className="text-gold-gradient italic">{t("grahas_page.title_b")}</span>
          </h1>
          <p className="mt-4 font-body text-zinc-400 max-w-2xl leading-relaxed">
            {t("grahas_page.intro")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6" data-testid="grahas-grid">
          {grahas.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              data-testid={`graha-card-${g.id}`}
              className={`glass-card p-6 text-center fade-up delay-${Math.min((i % 5 + 1) * 100, 400)} hover:-translate-y-1 hover:border-[#FF9933] transition-all duration-300`}
            >
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.06)]">
                <span className="font-heading text-3xl text-[#FFD700]">{g.symbol}</span>
              </div>
              <div className="font-accent text-[10px] text-[#D4AF37] mb-1">{g.sanskrit}</div>
              <div className="font-heading text-xl text-zinc-50">{g.name}</div>
              <div className="mt-1 text-xs font-body text-zinc-500">{g.english}</div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-[#121824] border-[rgba(212,175,55,0.3)] text-zinc-100 max-w-2xl" data-testid="graha-dialog">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.06)]">
                    <span className="font-heading text-2xl text-[#FFD700]">{selected.symbol}</span>
                  </div>
                  <div>
                    <div className="font-accent text-[10px] text-[#D4AF37]">{selected.sanskrit}</div>
                    <DialogTitle className="font-heading text-3xl text-zinc-50">
                      {selected.name} <span className="text-zinc-500 italic text-xl">({selected.english})</span>
                    </DialogTitle>
                  </div>
                </div>
                <DialogDescription className="font-body text-zinc-300 text-base leading-relaxed pt-2">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm font-body">
                {[
                  ["Deity", selected.deity],
                  ["Day", selected.day],
                  ["Element", selected.element],
                  ["Gemstone", selected.gemstone],
                  ["Rules", selected.rules],
                  ["Exalted in", selected.exalted],
                  ["Debilitated in", selected.debilitated],
                  ["Color", selected.color],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-[rgba(212,175,55,0.1)] pb-2">
                    <span className="text-zinc-500 font-accent text-[10px] uppercase tracking-widest">{k}</span>
                    <span className="text-zinc-200">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="font-accent text-[10px] text-[#D4AF37] mb-2">Qualities</div>
                <div className="flex flex-wrap gap-2">
                  {selected.qualities.map((q) => (
                    <span key={q} className="text-xs px-3 py-1 rounded-full border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.05)] text-zinc-300">
                      <Sparkles className="inline h-3 w-3 text-[#FFD700] mr-1" />{q}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
