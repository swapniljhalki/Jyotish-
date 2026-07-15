import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Per-user localStorage key so a user acknowledges the notice exactly once
// per account per browser. New users see the notice on their next login;
// returning users don't get nagged.
const KEY_PREFIX = "snw_privacy_ack_v1_";

/**
 * Small, unobtrusive privacy-policy toast that appears in the bottom-left
 * corner after login. Dismissed by tapping the ✕ button OR "Accept & Close".
 * Both actions persist the acknowledgement in localStorage so the toast
 * stays hidden on subsequent visits for the same user + browser.
 */
export default function PrivacyNotice() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setVisible(false);
      return;
    }
    try {
      const acked = localStorage.getItem(KEY_PREFIX + user.id);
      if (!acked) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [user?.id]);

  if (!user?.id || !visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY_PREFIX + user.id, new Date().toISOString());
    } catch { /* ignore private-mode storage errors */ }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="privacy-notice-title"
      data-testid="privacy-notice"
      className="fixed bottom-4 left-4 z-[60] w-[92vw] max-w-sm rounded-xl border border-[rgba(212,175,55,0.4)] bg-white shadow-[0_20px_50px_-15px_rgba(92,58,9,0.35)] backdrop-blur-sm"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-[#FF8C00]" strokeWidth={2} />
          <div className="flex-1 min-w-0">
            <p
              id="privacy-notice-title"
              className="font-heading font-semibold text-[15px] text-[#2A1A05] leading-snug"
            >
              Your privacy matters
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#5C3A09]">
              We only use your birth details and readings to generate your
              personalised report. We never sell your data. Please review our{" "}
              <Link
                to="/privacy"
                className="underline decoration-[#FF8C00] underline-offset-2 hover:text-[#FF8C00]"
                data-testid="privacy-notice-link"
              >
                Privacy Policy
              </Link>{" "}
              — click Accept &amp; Close when done.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={dismiss}
                data-testid="privacy-notice-accept"
                className="px-3 py-1.5 rounded-full bg-[#FF8C00] hover:bg-[#E67E00] text-white text-[11px] font-accent tracking-widest transition-colors"
              >
                Accept &amp; Close
              </button>
              <Link
                to="/privacy"
                className="text-[11px] font-accent tracking-widest text-[#5C3A09] hover:text-[#FF8C00]"
              >
                Read policy
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss privacy notice"
            data-testid="privacy-notice-close"
            className="shrink-0 p-1 rounded-full hover:bg-[rgba(255,140,0,0.15)] transition-colors"
          >
            <X className="h-4 w-4 text-[#5C3A09]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
