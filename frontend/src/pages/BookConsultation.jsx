// 1:1 Consultation booking page — premium-tier only.
// Flow: pick day from week tabs → pick slot → fill name/phone/notes → pay
// (Razorpay or mock) → backend creates Google Meet event → show success card
// with the Meet link.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";
import { Calendar, Clock, Video, CheckCircle2, Sparkles, Loader2 } from "lucide-react";

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

function formatTimeLocal(iso, tz) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz,
    }).format(new Date(iso));
  } catch { return iso; }
}
function formatDateLocal(iso, tz) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short", day: "numeric", month: "short", timeZone: tz,
    }).format(new Date(iso));
  } catch { return iso; }
}

export default function BookConsultation() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);
  const [activeDate, setActiveDate] = useState(null);
  const [form, setForm] = useState({ name: user?.name || "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([
          api.get("/scheduler/config"),
          api.get("/scheduler/slots?weeks=4"),
        ]);
        setCfg(c.data);
        setSlots(s.data.slots);
        if (s.data.slots.length) setActiveDate(s.data.slots[0].date);
      } catch (e) {
        toast.error(formatApiError(e.response?.data?.detail) || e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const s of slots) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date).push(s);
    }
    return Array.from(m.entries());
  }, [slots]);

  const isPremium = user && user.tier === "premium";

  const startBooking = async () => {
    if (!picked) return toast.error("Pick a time slot first.");
    if (!form.name.trim()) return toast.error("Please enter your name.");
    setBusy(true);
    try {
      const { data } = await api.post("/scheduler/book", {
        slot_start_utc:  picked.start_utc,
        customer_name:   form.name,
        customer_phone:  form.phone,
        notes:           form.notes,
      });
      const { booking, order } = data;
      const confirm = async (payment) => {
        const { data: paid } = await api.post("/scheduler/confirm", {
          booking_id:           booking.id,
          razorpay_order_id:    order.order_id,
          razorpay_payment_id:  payment.razorpay_payment_id || `pay_mock_${Date.now()}`,
          razorpay_signature:   payment.razorpay_signature || "",
        });
        setConfirmed(paid);
        toast.success("Booking confirmed — check your email!");
      };

      if (order.mode === "mock") {
        await confirm({});
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) return toast.error("Could not load payment gateway.");
      const rzp = new window.Razorpay({
        key:          order.key_id,
        amount:       order.amount,
        currency:     order.currency,
        name:         "Satish Numero World",
        description:  `${order.label} — ${cfg.duration_minutes} min`,
        order_id:     order.order_id,
        prefill:      order.prefill,
        theme:        { color: "#FF9933" },
        handler:      (res) => confirm(res).catch((e) => toast.error(formatApiError(e.response?.data?.detail) || e.message)),
        modal:        { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="cosmic-bg min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  // -- Confirmation screen -----------------------------------------------------
  if (confirmed) {
    return (
      <div className="cosmic-bg min-h-[calc(100vh-64px)]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="premium-card p-10 text-center fade-up" data-testid="booking-confirmed">
            <CheckCircle2 className="h-14 w-14 text-green-400 mx-auto mb-4" />
            <p className="font-accent text-xs text-[#D4AF37] mb-2">Booking confirmed</p>
            <h1 className="font-heading text-4xl md:text-5xl text-zinc-50">
              You&rsquo;re <span className="text-gold-gradient italic">all set.</span>
            </h1>
            <p className="font-body text-zinc-300 mt-4">
              {formatDateLocal(confirmed.slot_start_utc, cfg.tz)} at{" "}
              <span className="text-[#FFD700]">{formatTimeLocal(confirmed.slot_start_utc, cfg.tz)}</span> ({cfg.tz})
            </p>
            <a
              href={confirmed.meet_url}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex items-center gap-2 btn-saffron"
              data-testid="booking-meet-link"
            >
              <Video className="h-4 w-4" /> Join Google Meet
            </a>
            <p className="text-xs font-body text-zinc-500 mt-6 max-w-md mx-auto">
              We&rsquo;ve emailed the meeting link to <span className="text-zinc-300">{confirmed.user_email}</span>.
              {!cfg.google_connected && " (Stub link — astrologer hasn't connected Google Calendar yet.)"}
            </p>
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              <Link to="/my-bookings" className="text-[#D4AF37] hover:text-[#FFD700] font-body" data-testid="my-bookings-link">
                My bookings →
              </Link>
              <button
                onClick={() => { setConfirmed(null); setPicked(null); }}
                className="text-zinc-400 hover:text-zinc-200 font-body"
                data-testid="booking-book-another"
              >
                Book another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Tier gate ---------------------------------------------------------------
  if (!user) {
    return (
      <div className="cosmic-bg min-h-[calc(100vh-64px)]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-24 text-center">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">1:1 Consultation</p>
          <h1 className="font-heading text-5xl text-zinc-50">Sign in to book.</h1>
          <Link to="/login" className="inline-block mt-6 btn-saffron">Sign in</Link>
        </div>
      </div>
    );
  }
  if (!isPremium) {
    return (
      <div className="cosmic-bg min-h-[calc(100vh-64px)]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-24">
          <div className="premium-card p-10 text-center" data-testid="booking-upgrade-notice">
            <p className="font-accent text-xs text-[#D4AF37] mb-3">Premium only</p>
            <h1 className="font-heading text-4xl text-zinc-50">A personal sitting awaits.</h1>
            <p className="font-body text-zinc-400 mt-3 max-w-xl mx-auto">
              1:1 consultations with the astrologer are reserved for the Jyotishi (premium) tier.
              Upgrade once, then book any future slot for ₹{cfg.price_inr}/{cfg.duration_minutes} min.
            </p>
            <Link to="/pricing?need=premium" className="inline-block mt-6 btn-saffron">
              <Sparkles className="inline h-4 w-4 mr-2 -mt-0.5" /> Upgrade to Premium
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -- Booking screen ----------------------------------------------------------
  const todayList = grouped.find(([d]) => d === activeDate)?.[1] || [];

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-10 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">1:1 Consultation</p>
          <h1 className="font-heading text-5xl md:text-6xl text-zinc-50">
            Book a sitting with <span className="text-gold-gradient italic">the astrologer.</span>
          </h1>
          <p className="font-body text-zinc-400 mt-4 max-w-2xl">
            A {cfg.duration_minutes}-minute live session over Google Meet. ₹{cfg.price_inr}.
            Cancel up to 2 hours before — full refund.
          </p>
          {!cfg.google_connected && (
            <p className="text-xs text-orange-300 font-accent mt-3" data-testid="booking-stub-warn">
              ⚠ Astrologer hasn&rsquo;t connected Google yet — bookings will receive a placeholder Meet link for now.
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Slot picker */}
          <div className="lg:col-span-2 glass-card p-6 fade-up">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="font-heading text-xl text-zinc-50">Pick a date</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-3 mb-5" data-testid="booking-date-strip">
              {grouped.map(([date, list]) => {
                const sample = list[0];
                const active = activeDate === date;
                return (
                  <button
                    key={date}
                    onClick={() => setActiveDate(date)}
                    data-testid={`booking-date-${date}`}
                    className={`flex-shrink-0 px-4 py-3 rounded border text-center min-w-[90px] transition-colors ${
                      active
                        ? "bg-[rgba(255,153,51,0.15)] border-[#FF9933] text-[#FFD700]"
                        : "border-[rgba(212,175,55,0.15)] text-zinc-300 hover:border-[rgba(212,175,55,0.4)]"
                    }`}
                  >
                    <div className="font-accent text-[10px] uppercase tracking-widest">{sample.weekday}</div>
                    <div className="font-heading text-lg">{formatDateLocal(sample.start_utc, cfg.tz).split(" ").slice(1).join(" ")}</div>
                    <div className="text-[10px] text-zinc-500">{list.length} slots</div>
                  </button>
                );
              })}
              {grouped.length === 0 && (
                <p className="text-zinc-500 italic font-body text-sm">
                  No availability set yet — please check back later.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-[#D4AF37]" />
              <h2 className="font-heading text-xl text-zinc-50">Pick a time ({cfg.tz})</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" data-testid="booking-slot-grid">
              {todayList.map((s) => {
                const active = picked?.start_utc === s.start_utc;
                return (
                  <button
                    key={s.start_utc}
                    onClick={() => setPicked(s)}
                    data-testid={`booking-slot-${s.start_utc}`}
                    className={`px-3 py-2 rounded border text-sm font-body transition-colors ${
                      active
                        ? "bg-[rgba(255,153,51,0.15)] border-[#FF9933] text-[#FFD700]"
                        : "border-[rgba(212,175,55,0.15)] text-zinc-200 hover:border-[rgba(212,175,55,0.4)]"
                    }`}
                  >
                    {formatTimeLocal(s.start_utc, cfg.tz)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking form */}
          <div className="glass-card p-6 fade-up">
            <p className="font-accent text-xs text-[#D4AF37] mb-2">Your details</p>
            <h2 className="font-heading text-xl text-zinc-50 mb-4">Confirm booking</h2>
            <div className="space-y-3 text-sm font-body">
              <div>
                <label className="block font-accent text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="booking-name"
                  className="w-full bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block font-accent text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Phone (optional)</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="booking-phone"
                  placeholder="+91 ..."
                  className="w-full bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block font-accent text-[10px] text-zinc-400 uppercase tracking-widest mb-1">What would you like to discuss?</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  data-testid="booking-notes"
                  rows={4}
                  placeholder="Career, marriage, health, remedies..."
                  className="w-full bg-[#121824] border border-[rgba(212,175,55,0.2)] text-zinc-100 px-3 py-2 rounded resize-none"
                />
              </div>
              <div className="pt-3 border-t border-[rgba(212,175,55,0.12)]">
                <div className="flex justify-between text-zinc-200">
                  <span>Selected slot</span>
                  <span className="font-heading text-right">
                    {picked
                      ? `${formatDateLocal(picked.start_utc, cfg.tz)}, ${formatTimeLocal(picked.start_utc, cfg.tz)}`
                      : <span className="text-zinc-500 italic font-body">Pick a slot</span>}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-200 mt-1">
                  <span>Duration</span>
                  <span>{cfg.duration_minutes} min</span>
                </div>
                <div className="flex justify-between font-heading text-zinc-50 mt-2 text-lg">
                  <span>Total</span>
                  <span>₹{cfg.price_inr.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <button
                onClick={startBooking}
                disabled={busy || !picked}
                data-testid="booking-pay-btn"
                className="w-full btn-saffron disabled:opacity-50 inline-flex items-center justify-center gap-2 mt-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy ? "Processing..." : `Pay ₹${cfg.price_inr.toLocaleString("en-IN")} & Book`}
                {cfg.payment_mode === "mock" && <span className="text-[10px] opacity-80 font-accent uppercase ml-1">demo</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
