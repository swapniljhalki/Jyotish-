import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import {
  Mail,
  ShieldCheck,
  Crown,
  LogOut,
  BookOpen,
  KeyRound,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Video,
  ExternalLink,
  Loader2,
} from "lucide-react";
import UpgradeButton from "../components/UpgradeButton";

const TIER_META = {
  free:    { label: "Seeker",  blurb: "Free tier · Browse the basics", color: "#6B3410" },
  basic:   { label: "Sadhaka", blurb: "Basic tier · AI birth readings", color: "#5C3A09" },
  premium: { label: "Jyotishi", blurb: "Premium tier · Full Kundali, Dasha & 1:1 consults", color: "#FF8C00" },
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState(null); // null = loading, [] = empty
  const [meetingsErr, setMeetingsErr] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/scheduled-meetings/me");
        if (active) setMeetings(data.items || []);
      } catch (e) {
        if (active) {
          setMeetingsErr(e?.response?.data?.detail || "Could not load your meetings.");
          setMeetings([]);
        }
      }
    })();
    return () => { active = false; };
  }, [user]);

  if (!user) return null; // ProtectedRoute already guards this; safety net

  const tier = TIER_META[user.tier] || TIER_META.free;
  const initials =
    (user.name || user.email || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?";

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="bg-[#FDFBF7] min-h-[calc(100vh-64px)]" data-testid="profile-page">
      <div className="sb-container sb-section">
        {/* HEADER */}
        <div className="max-w-3xl mb-12 fade-up">
          <span className="sb-eyebrow">Your account</span>
          <h1 className="sb-h1">
            Hello,{" "}
            <span className="italic font-medium" style={{ color: "#5C3A09" }}>
              {user.name || "Seeker"}.
            </span>
          </h1>
          <p className="sb-lead mt-6">
            Manage your account, check your tier, and jump straight back to your readings.
          </p>
        </div>

        {/* IDENTITY CARD */}
        <div className="sb-card sb-card-hover max-w-4xl fade-up" data-testid="profile-identity-card">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div
              className="h-20 w-20 shrink-0 rounded-full flex items-center justify-center text-3xl font-heading font-semibold"
              style={{ background: "linear-gradient(135deg,#FFEBC9 0%,#FFB36B 100%)", color: "#5C3A09" }}
              data-testid="profile-avatar"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="font-heading text-2xl md:text-3xl tracking-tight"
                  style={{ color: "#2A1A05" }}
                  data-testid="profile-name"
                >
                  {user.name || "Unnamed Seeker"}
                </h2>
                {user.role === "admin" && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
                    style={{ background: "rgba(255,140,0,0.12)", color: "#B85C00" }}
                    data-testid="profile-admin-badge"
                  >
                    <ShieldCheck className="h-3 w-3" strokeWidth={2.25} />
                    Admin
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[14px]" style={{ color: "#6B3410" }}>
                <Mail className="h-4 w-4" strokeWidth={1.75} />
                <span data-testid="profile-email">{user.email}</span>
                {user.email_verified ? (
                  <span
                    className="inline-flex items-center gap-1 ml-1 text-[11px] font-semibold"
                    style={{ color: "#1E7B47" }}
                    data-testid="profile-email-verified"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 ml-1 text-[11px] font-semibold"
                    style={{ color: "#B85C00" }}
                    data-testid="profile-email-unverified"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Not verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-4xl fade-up">
          {/* TIER */}
          <div className="sb-card" data-testid="profile-tier-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="sb-eyebrow">Your tier</span>
                <div
                  className="font-heading text-3xl mt-2 flex items-center gap-2"
                  style={{ color: tier.color }}
                  data-testid="profile-tier-label"
                >
                  {user.tier === "premium" && <Crown className="h-6 w-6" strokeWidth={1.75} />}
                  {tier.label}
                </div>
                <p className="text-[14px] mt-2" style={{ color: "#6B3410" }}>
                  {tier.blurb}
                </p>
              </div>
            </div>
            {user.tier !== "premium" && (
              <div className="mt-4 pt-4 border-t border-[rgba(139,94,26,0.12)] flex flex-wrap items-center gap-3">
                <UpgradeButton
                  tier={user.tier === "free" ? "basic" : "premium"}
                  data-testid="profile-upgrade-btn"
                />
                <Link
                  to="/pricing"
                  className="text-[12px] font-semibold tracking-widest uppercase text-[#5C3A09] hover:text-[#FF8C00] transition-colors"
                  data-testid="profile-pricing-link"
                >
                  Compare all tiers
                </Link>
              </div>
            )}
          </div>

          {/* META */}
          <div className="sb-card" data-testid="profile-meta-card">
            <span className="sb-eyebrow">Account details</span>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <dt
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "#5C3A09" }}
                >
                  Sign-in method
                </dt>
                <dd style={{ color: "#2A1A05" }} data-testid="profile-auth-provider">
                  {user.auth_provider === "google" ? "Google" : "Email & Password"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "#5C3A09" }}
                >
                  Member since
                </dt>
                <dd
                  className="inline-flex items-center gap-1.5"
                  style={{ color: "#2A1A05" }}
                  data-testid="profile-created-at"
                >
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {formatDate(user.created_at)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "#5C3A09" }}
                >
                  Role
                </dt>
                <dd
                  className="capitalize"
                  style={{ color: "#2A1A05" }}
                  data-testid="profile-role"
                >
                  {user.role || "user"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "#5C3A09" }}
                >
                  User ID
                </dt>
                <dd
                  className="font-mono text-[11px]"
                  style={{ color: "#6B3410" }}
                  data-testid="profile-user-id"
                  title={user.id}
                >
                  {user.id?.slice(0, 8)}…{user.id?.slice(-4)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* SCHEDULED MEETINGS */}
        <div className="mt-8 max-w-4xl fade-up" data-testid="profile-meetings-section">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="sb-eyebrow">Scheduled meetings</span>
            <Link
              to="/book"
              className="text-[12px] font-semibold tracking-widest uppercase text-[#5C3A09] hover:text-[#FF8C00] transition-colors"
              data-testid="profile-book-link"
            >
              Book new →
            </Link>
          </div>

          {meetings === null ? (
            <div className="sb-card flex items-center gap-3" data-testid="profile-meetings-loading">
              <Loader2 className="h-4 w-4 animate-spin text-[#FF8C00]" strokeWidth={2} />
              <span className="text-[14px]" style={{ color: "#6B3410" }}>
                Loading your scheduled meetings…
              </span>
            </div>
          ) : meetingsErr ? (
            <div className="sb-card" data-testid="profile-meetings-error">
              <p className="text-[14px]" style={{ color: "#B85C00" }}>{meetingsErr}</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="sb-card text-center py-10" data-testid="profile-meetings-empty">
              <Video className="h-10 w-10 text-[#FF8C00] mx-auto mb-3" strokeWidth={1.5} />
              <p className="font-heading text-xl" style={{ color: "#2A1A05" }}>
                No 1:1 meetings booked yet.
              </p>
              <p className="text-[14px] mt-2 max-w-sm mx-auto" style={{ color: "#6B3410" }}>
                When you book a consultation, it&apos;ll show up here with a quick link to reschedule or cancel.
              </p>
              <Link to="/book" className="inline-block mt-5" data-testid="profile-meetings-empty-cta">
                <button className="sb-btn-primary">
                  Book a 1:1 consultation <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-3" data-testid="profile-meetings-list">
              {meetings.map((m) => {
                const startsAt = formatDateTime(m.scheduled_at);
                const bookedAt = formatDate(m.booked_at);
                return (
                  <li
                    key={m.id}
                    className="sb-card sb-card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    data-testid={`profile-meeting-${m.id}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-[#FF8C00]" strokeWidth={1.75} />
                        <span className="font-heading text-lg" style={{ color: "#2A1A05" }}>
                          {m.event_type_name || "1:1 Consultation with Satissh"}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
                          style={{
                            background: m.status === "canceled"
                              ? "rgba(184,92,0,0.10)"
                              : "rgba(30,123,71,0.10)",
                            color: m.status === "canceled" ? "#B85C00" : "#1E7B47",
                          }}
                        >
                          {m.status || "active"}
                        </span>
                      </div>
                      <div className="text-[13px] mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: "#6B3410" }}>
                        {startsAt && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {startsAt}
                          </span>
                        )}
                        <span className="text-[12px]" style={{ color: "#5C3A09" }}>
                          Booked on {bookedAt}
                        </span>
                      </div>
                    </div>
                    {m.invitee_uri && (
                      <a
                        href={m.invitee_uri.startsWith("http") ? m.invitee_uri : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-widest uppercase text-[#FF8C00] hover:text-[#E67A00] shrink-0"
                        data-testid={`profile-meeting-view-${m.id}`}
                      >
                        Manage on Calendly <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="mt-8 max-w-4xl fade-up">
          <span className="sb-eyebrow">Quick actions</span>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Link
              to="/readings"
              className="sb-card sb-card-hover flex items-center justify-between gap-3"
              data-testid="profile-readings-link"
            >
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#5C3A09]" strokeWidth={1.75} />
                  <span className="font-heading text-lg" style={{ color: "#2A1A05" }}>
                    My readings
                  </span>
                </div>
                <p className="text-[13px] mt-1" style={{ color: "#6B3410" }}>
                  Open your saved Kundali interpretations.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#5C3A09] shrink-0" strokeWidth={1.75} />
            </Link>

            {user.auth_provider === "email" && (
              <Link
                to="/forgot-password"
                className="sb-card sb-card-hover flex items-center justify-between gap-3"
                data-testid="profile-change-password-link"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[#5C3A09]" strokeWidth={1.75} />
                    <span className="font-heading text-lg" style={{ color: "#2A1A05" }}>
                      Change password
                    </span>
                  </div>
                  <p className="text-[13px] mt-1" style={{ color: "#6B3410" }}>
                    We&apos;ll email you a secure reset link.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5C3A09] shrink-0" strokeWidth={1.75} />
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="sb-card sb-card-hover flex items-center justify-between gap-3 text-left"
              data-testid="profile-logout-btn"
            >
              <div>
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-[#B85C00]" strokeWidth={1.75} />
                  <span className="font-heading text-lg" style={{ color: "#2A1A05" }}>
                    Sign out
                  </span>
                </div>
                <p className="text-[13px] mt-1" style={{ color: "#6B3410" }}>
                  End your session on this device.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#B85C00] shrink-0" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
