export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[rgba(212,175,55,0.15)] bg-[#0A0D14]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="ornate-divider mb-8">
          <span className="font-accent text-xs text-[#D4AF37]">ॐ शान्ति</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-zinc-400">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/snw-logo.jpg"
                alt="Satish Numero World"
                className="h-10 w-10 rounded-full object-cover ring-1 ring-[rgba(212,175,55,0.4)]"
              />
              <h4 className="font-heading text-lg text-[#FFD700] leading-tight">Satish Numero World</h4>
            </div>
            <p className="font-body leading-relaxed">
              Ancient sidereal wisdom, read through a modern lens. Charts computed deterministically;
              interpretations offered as guidance — not destiny.
            </p>
          </div>
          <div>
            <h4 className="font-accent text-xs text-[#D4AF37] mb-3">Disclaimer</h4>
            <p className="font-body leading-relaxed">
              Readings are for reflection and cultural exploration. This service is not a substitute
              for medical, legal or financial advice.
            </p>
          </div>
        </div>
        <p className="mt-10 text-xs text-zinc-600 font-body text-center">
          © {new Date().getFullYear()} Satish Numero World. All sacred rights reserved.
        </p>
      </div>
    </footer>
  );
}
