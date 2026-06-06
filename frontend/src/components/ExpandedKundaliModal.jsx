// Expanded kundali modal — wraps the existing <KundaliChart> in a traditional
// ornate North Indian frame (green outer border + saffron-gold inner frame
// with decorative petal curves + central swastika), as per the reference
// image attached by the user.
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import KundaliChart from "./KundaliChart";

export default function ExpandedKundaliModal({ open, onClose, title, ascendantLabel, ascendantName, chart, accentColor = "#D4AF37" }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent
        className="max-w-3xl w-[92vw] p-0 border-0 bg-transparent shadow-none [&>button]:hidden"
        data-testid="kundali-expanded-modal"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Expanded view of the {title}{ascendantName ? ` — ascendant ${ascendantName}` : ""}.
        </DialogDescription>

        <div className="relative bg-white p-3 rounded-md" style={{ border: "3px solid #2E8B57" }}>
          {/* Inner saffron / gold frame */}
          <div
            className="relative p-6 md:p-8 rounded-sm"
            style={{
              background: "linear-gradient(135deg, #FF8C00 0%, #FFD700 50%, #FF8C00 100%)",
              boxShadow: "inset 0 0 12px rgba(184,67,18,0.45)",
            }}
          >
            {/* White interior */}
            <div className="relative bg-white p-4 md:p-6">

              {/* Decorative petal-arch overlay — 4 cusped arcs framing the four sides */}
              <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="petalStroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="50%" stopColor="#FF8C00" />
                    <stop offset="100%" stopColor="#C0392B" />
                  </linearGradient>
                  <filter id="petalGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" />
                  </filter>
                </defs>

                {/* Top cusped petal */}
                <path
                  d="M 200,0 C 300,150 420,260 500,260 C 580,260 700,150 800,0"
                  fill="none"
                  stroke="url(#petalStroke)"
                  strokeWidth="6"
                  filter="url(#petalGlow)"
                  opacity="0.4"
                />
                <path
                  d="M 200,0 C 300,150 420,260 500,260 C 580,260 700,150 800,0"
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth="2"
                />

                {/* Right cusped petal */}
                <path
                  d="M 1000,200 C 850,300 740,420 740,500 C 740,580 850,700 1000,800"
                  fill="none"
                  stroke="url(#petalStroke)"
                  strokeWidth="6"
                  filter="url(#petalGlow)"
                  opacity="0.4"
                />
                <path
                  d="M 1000,200 C 850,300 740,420 740,500 C 740,580 850,700 1000,800"
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth="2"
                />

                {/* Bottom cusped petal */}
                <path
                  d="M 200,1000 C 300,850 420,740 500,740 C 580,740 700,850 800,1000"
                  fill="none"
                  stroke="url(#petalStroke)"
                  strokeWidth="6"
                  filter="url(#petalGlow)"
                  opacity="0.4"
                />
                <path
                  d="M 200,1000 C 300,850 420,740 500,740 C 580,740 700,850 800,1000"
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth="2"
                />

                {/* Left cusped petal */}
                <path
                  d="M 0,200 C 150,300 260,420 260,500 C 260,580 150,700 0,800"
                  fill="none"
                  stroke="url(#petalStroke)"
                  strokeWidth="6"
                  filter="url(#petalGlow)"
                  opacity="0.4"
                />
                <path
                  d="M 0,200 C 150,300 260,420 260,500 C 260,580 150,700 0,800"
                  fill="none"
                  stroke="#C0392B"
                  strokeWidth="2"
                />

                {/* Diagonal corner-to-corner faint guides (subtle teal) */}
                <line x1="0" y1="0" x2="500" y2="500" stroke="#2E8B57" strokeWidth="1" opacity="0.4" />
                <line x1="1000" y1="0" x2="500" y2="500" stroke="#2E8B57" strokeWidth="1" opacity="0.4" />
                <line x1="0" y1="1000" x2="500" y2="500" stroke="#2E8B57" strokeWidth="1" opacity="0.4" />
                <line x1="1000" y1="1000" x2="500" y2="500" stroke="#2E8B57" strokeWidth="1" opacity="0.4" />
              </svg>

              {/* Header inside the frame */}
              <div className="relative text-center mb-4">
                <p className="font-accent text-[11px] tracking-[0.3em]" style={{ color: "#C0392B" }}>
                  {title}
                </p>
                {ascendantName && (
                  <p className="font-heading text-2xl md:text-3xl mt-1" style={{ color: accentColor }}>
                    {ascendantLabel ? `${ascendantLabel} · ` : ""}{ascendantName}
                  </p>
                )}
              </div>

              {/* The actual chart — scaled up for the modal */}
              <div className="relative max-w-[560px] mx-auto">
                <KundaliChart chart={chart} />
                {/* Tiny swastika at the centre (sacred mark from the reference image) */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                  style={{ fontSize: 22, lineHeight: 1, color: "#C0392B" }}
                >
                  卐
                </div>
              </div>

              {/* Footer caption */}
              <p className="relative text-center mt-4 text-[10px] font-accent tracking-[0.25em]" style={{ color: "#7a5b1a" }}>
                ॥ शुभं भवतु ॥
              </p>
            </div>
          </div>

          {/* Close button anchored outside the green border */}
          <button
            onClick={onClose}
            data-testid="kundali-expanded-close"
            className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-zinc-700 border border-zinc-300 shadow-md hover:bg-zinc-100 transition-colors flex items-center justify-center text-lg font-body"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
