import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

/**
 * Static privacy policy page. Kept lean and human-readable — the popup
 * shown post-login links here. Update the effective date whenever the
 * policy is materially changed.
 */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="sb-container py-10 md:py-16 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-[#5C3A09] text-sm hover:text-[#FF8C00]"
          data-testid="privacy-back-home"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-[#FF8C00]" strokeWidth={2} />
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#2A1A05]">
            Privacy Policy
          </h1>
        </div>
        <p className="mt-2 text-[13px] text-[#8B5E1A]">
          Effective: 15 July 2026 · Satish Numero World (satishnumeroworld.com)
        </p>

        <div
          className="mt-8 space-y-6 text-[15px] text-[#3E2708] leading-relaxed font-body"
          data-testid="privacy-content"
        >
          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">1. Who we are</h2>
            <p className="mt-2">
              Satish Numero World is a Vedic astrology and numerology
              consultation service. This policy explains what personal data
              we collect when you use satishnumeroworld.com and how we use it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">2. Information we collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li><b>Account details</b>: name, email, password (hashed).</li>
              <li><b>Birth details</b>: date, time and place of birth — used to compute your kundli/numerology charts.</li>
              <li><b>Focus area</b> you type on the Premium form (career, health, etc.), used only to personalise your AI reading.</li>
              <li><b>Payment metadata</b>: order ID and transaction reference from Razorpay. We do NOT see or store your card / UPI details.</li>
              <li><b>Basic analytics</b>: anonymous visit counts, browser type, and cookies for session management. No profiling.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">3. How we use it</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>Generate your personalised astrology and numerology reports.</li>
              <li>Send transactional emails (booking confirmations, receipts).</li>
              <li>Provide customer support if you contact us.</li>
              <li>Improve the service (aggregated, non-identifying insights only).</li>
            </ul>
            <p className="mt-2">
              <b>We do not sell, rent or share your personal data with third parties for marketing.</b>
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">4. AI-generated readings</h2>
            <p className="mt-2">
              Your birth details and focus area are sent to our AI provider
              (Anthropic Claude, via Emergent Integrations) purely to generate
              your reading text. The AI provider processes the request without
              persistent storage of your inputs on their side. The finished
              reading is stored on our servers so you can revisit it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">5. Payments</h2>
            <p className="mt-2">
              Payments are processed by <b>Razorpay</b> under their PCI-DSS
              compliant systems. We only receive a confirmation that the
              payment succeeded, plus the transaction reference.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">6. Your rights</h2>
            <p className="mt-2">
              You can request a copy of your data, correction of inaccuracies,
              or full deletion of your account at any time by emailing{" "}
              <a href="mailto:satishnumeroworld7@gmail.com" className="underline">
                satishnumeroworld7@gmail.com
              </a>. We honour requests within 15 working days.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">7. Security</h2>
            <p className="mt-2">
              Passwords are stored using bcrypt hashing. Traffic to and from
              the site is served over HTTPS. Only authorised administrators
              can access user records.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">8. Cookies</h2>
            <p className="mt-2">
              We use a small number of cookies strictly required for login
              sessions and language preference. We do not use advertising or
              cross-site tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">9. Changes to this policy</h2>
            <p className="mt-2">
              If we materially update this policy, we will bump the effective
              date at the top and prompt you to re-acknowledge on your next
              login.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-[#2A1A05]">10. Contact</h2>
            <p className="mt-2">
              Questions? Reach us at{" "}
              <a href="mailto:satishnumeroworld7@gmail.com" className="underline">
                satishnumeroworld7@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
