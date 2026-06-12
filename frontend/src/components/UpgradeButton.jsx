// Upgrade button — wired to Razorpay when enabled, falls back to mock-mode
// when RAZORPAY_KEY_ID is absent on the backend.
//
// PAYMENTS_DISABLED kills online checkout. FREE_TIER_UNLOCK lets users still
// grant themselves the tier with one click (no charge). Both flags are
// admin-toggleable here — flip and restart.
import { useState, useEffect } from "react";
import { Sparkles, Loader2, X, Gift } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const PAYMENTS_DISABLED = true;
const FREE_TIER_UNLOCK  = true;   // when payments are disabled, allow free self-unlock

const RAZORPAY_CDN = "https://checkout.razorpay.com/v1/checkout.js";
const PHONE_KEY = "snw_phone";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = RAZORPAY_CDN;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function isValidIndianMobile(phone) {
  const p = (phone || "").replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(p);
}

export default function UpgradeButton({ tier = "premium", className = "", variant = "default", onSuccess }) {
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [askPhone, setAskPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneErr, setPhoneErr] = useState("");

  useEffect(() => {
    api.get("/payments/config").then((r) => setCfg(r.data)).catch(() => {});
    // Try to recall the user's last-used mobile
    const saved = localStorage.getItem(PHONE_KEY);
    if (saved) setPhone(saved);
  }, []);

  const price = cfg?.pricing?.[tier];
  const label = price?.label || (tier === "premium" ? "Jyotishi" : "Sadhaka");
  const inr = price ? `₹${price.amount_inr.toLocaleString("en-IN")}` : "";

  const openCheckout = async (contactNumber) => {
    setBusy(true);
    try {
      const { data: order } = await api.post("/payments/create-order", { tier });

      if (order.mode === "mock") {
        await api.post("/payments/verify", {
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "",
          tier,
        });
        toast.success(`Demo upgrade successful — you are now ${label}!`);
        await refresh();
        onSuccess?.();
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Could not load payment gateway. Please try again.");
        return;
      }

      const cleanContact = String(contactNumber || "").replace(/\D/g, "").slice(-10);
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Satish Numero World",
        description: `${label} tier — one-time unlock`,
        image: "/snw-logo.jpg",
        order_id: order.order_id,
        prefill: {
          name:    order.prefill?.name || user?.name || "",
          email:   order.prefill?.email || user?.email || "",
          contact: cleanContact,
        },
        // Tells Razorpay to not re-ask for the prefilled fields.
        readonly: { contact: !!cleanContact },
        theme: { color: "#1B4D8E" },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier,
            });
            toast.success(`Payment successful — you are now ${label}!`);
            await refresh();
            onSuccess?.();
          } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail) || "Verification failed");
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (cfg?.mode === "mock") {
      // Skip phone prompt in mock mode.
      await openCheckout("");
      return;
    }
    // Live mode: require a valid Indian mobile so Razorpay's contact overlay is skipped.
    const saved = localStorage.getItem(PHONE_KEY) || user?.phone || "";
    if (isValidIndianMobile(saved)) {
      setPhone(saved);
      await openCheckout(saved.replace(/\D/g, "").slice(-10));
    } else {
      setAskPhone(true);
    }
  };

  const submitPhone = async () => {
    if (!isValidIndianMobile(phone)) {
      setPhoneErr("Please enter a valid 10-digit Indian mobile (starts with 6/7/8/9).");
      return;
    }
    const clean = phone.replace(/\D/g, "").slice(-10);
    localStorage.setItem(PHONE_KEY, clean);
    setPhoneErr("");
    setAskPhone(false);
    await openCheckout(clean);
  };

  const baseCls =
    variant === "unstyled"
      ? "inline-flex items-center gap-2 transition-all disabled:opacity-50"
      : "btn-saffron disabled:opacity-50 inline-flex items-center gap-2";

  return (
    <>
      <button
        onClick={start}
        disabled={busy || !cfg}
        data-testid={`upgrade-btn-${tier}`}
        className={`${baseCls} ${className}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span>
          Unlock {label} {inr && <span className="opacity-90">— {inr}</span>}
          {cfg?.mode === "mock" && <span className="ml-2 text-[10px] opacity-70 font-accent uppercase">demo</span>}
        </span>
      </button>

      {askPhone && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setAskPhone(false)}
          data-testid="phone-modal"
        >
          <div className="relative bg-white border border-[rgba(212,175,55,0.4)] rounded-xl p-8 max-w-md w-full shadow-2xl">
            <button
              onClick={() => setAskPhone(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600"
              data-testid="phone-modal-close"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="font-accent text-xs text-[#D96600] mb-2">One moment</p>
            <h3 className="font-heading text-2xl text-zinc-900 mb-2">
              Your mobile number?
            </h3>
            <p className="font-body text-sm text-zinc-600 mb-5">
              Razorpay needs your mobile for the payment receipt. We don't store it on our servers — only in your browser for next time.
            </p>
            <div className="flex items-stretch gap-2 mb-1">
              <span className="px-3 py-2.5 rounded-md border border-zinc-300 bg-zinc-50 text-zinc-700 font-body text-sm flex items-center">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && submitPhone()}
                className="flex-1 px-3 py-2.5 rounded-md border border-zinc-300 focus:border-[#FF9933] focus:outline-none font-body text-zinc-900"
                data-testid="phone-modal-input"
              />
            </div>
            {phoneErr && (
              <p className="text-xs text-red-500 font-body mt-1" data-testid="phone-modal-error">{phoneErr}</p>
            )}
            <button
              onClick={submitPhone}
              className="btn-saffron w-full mt-5 justify-center"
              data-testid="phone-modal-submit"
            >
              Continue to payment →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
