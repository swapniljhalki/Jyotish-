// Razorpay upgrade button — gracefully falls back to mock-mode when
// RAZORPAY_KEY_ID is not configured on the backend.
import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const RAZORPAY_CDN = "https://checkout.razorpay.com/v1/checkout.js";

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

export default function UpgradeButton({ tier = "premium", className = "", onSuccess }) {
  const { refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    api.get("/payments/config").then((r) => setCfg(r.data)).catch(() => {});
  }, []);

  const price = cfg?.pricing?.[tier];
  const label = price?.label || (tier === "premium" ? "Jyotishi" : "Sadhaka");
  const inr = price ? `₹${price.amount_inr.toLocaleString("en-IN")}` : "";

  const start = async () => {
    setBusy(true);
    try {
      const { data: order } = await api.post("/payments/create-order", { tier });

      if (order.mode === "mock") {
        // Mock mode — payments aren't wired to a real gateway. Verify immediately.
        await api.post("/payments/verify", {
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: "",
          tier,
        });
        toast.success(`Demo upgrade successful — you are now ${label}!`);
        await refreshUser();
        onSuccess?.();
        return;
      }

      // Live mode — load Razorpay Checkout and verify on success
      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Could not load payment gateway. Please try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Satish Numero World",
        description: `${label} tier — one-time unlock`,
        order_id: order.order_id,
        prefill: order.prefill,
        theme: { color: "#FF9933" },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier,
            });
            toast.success(`Payment successful — you are now ${label}!`);
            await refreshUser();
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

  return (
    <button
      onClick={start}
      disabled={busy || !cfg}
      data-testid={`upgrade-btn-${tier}`}
      className={`btn-saffron disabled:opacity-50 inline-flex items-center gap-2 ${className}`}
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
  );
}
