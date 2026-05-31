// User's own booking history with quick-join Meet links.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Video, Calendar, Loader2 } from "lucide-react";

function fmt(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/scheduler/my-bookings");
        setBookings(data.bookings);
      } catch (e) {
        void formatApiError(e.response?.data?.detail);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="cosmic-bg min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-10 fade-up">
          <p className="font-accent text-xs text-[#D4AF37] mb-3">My bookings</p>
          <h1 className="font-heading text-5xl text-zinc-50">
            Your <span className="text-gold-gradient italic">consultations.</span>
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#D4AF37] mx-auto" /></div>
        ) : bookings.length === 0 ? (
          <div className="glass-card p-10 text-center" data-testid="my-bookings-empty">
            <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <p className="font-body text-zinc-400 mb-6">You haven&rsquo;t booked any consultations yet.</p>
            <Link to="/book" className="btn-saffron inline-block">Book your first sitting</Link>
          </div>
        ) : (
          <div className="space-y-4" data-testid="my-bookings-list">
            {bookings.map((b) => (
              <div key={b.id} className="glass-card p-5 flex items-center justify-between" data-testid={`my-booking-${b.id}`}>
                <div>
                  <div className="font-heading text-lg text-zinc-50">{fmt(b.slot_start_utc)}</div>
                  <div className="font-body text-xs text-zinc-500 mt-1">
                    {b.duration_min} min · ₹{(b.amount_paise / 100).toLocaleString("en-IN")} ·{" "}
                    <span className={b.status === "paid" ? "text-green-400" : "text-orange-300"}>{b.status}</span>
                  </div>
                  {b.notes && <div className="font-body text-xs text-zinc-400 mt-2 italic">"{b.notes.slice(0, 120)}"</div>}
                </div>
                {b.meet_url && b.status === "paid" && (
                  <a href={b.meet_url} target="_blank" rel="noopener" className="btn-saffron inline-flex items-center gap-2" data-testid={`my-booking-join-${b.id}`}>
                    <Video className="h-4 w-4" /> Join
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
