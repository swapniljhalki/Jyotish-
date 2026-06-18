import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
} from "lucide-react";
import UpgradeButton from "../components/UpgradeButton";

const TIER_META = {
  free:    { label: "Seeker",  blurb: "Free tier · Browse the basics", color: "#6B3410" },
  basic:   { label: "Sadhaka", blurb: "Basic tier · AI birth readings", color: "#8B5E1A" },
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

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <span className="italic font-medium" style={{ color: "#8B5E1A" }}>
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
                  className="text-[12px] font-semibold tracking-widest uppercase text-[#8B5E1A] hover:text-[#FF8C00] transition-colors"
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
                  style={{ color: "#8B5E1A" }}
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
                  style={{ color: "#8B5E1A" }}
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
                  style={{ color: "#8B5E1A" }}
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
                  style={{ color: "#8B5E1A" }}
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
                  <BookOpen className="h-4 w-4 text-[#8B5E1A]" strokeWidth={1.75} />
                  <span className="font-heading text-lg" style={{ color: "#2A1A05" }}>
                    My readings
                  </span>
                </div>
                <p className="text-[13px] mt-1" style={{ color: "#6B3410" }}>
                  Open your saved Kundali interpretations.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#8B5E1A] shrink-0" strokeWidth={1.75} />
            </Link>

            {user.auth_provider === "email" && (
              <Link
                to="/forgot-password"
                className="sb-card sb-card-hover flex items-center justify-between gap-3"
                data-testid="profile-change-password-link"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-[#8B5E1A]" strokeWidth={1.75} />
                    <span className="font-heading text-lg" style={{ color: "#2A1A05" }}>
                      Change password
                    </span>
                  </div>
                  <p className="text-[13px] mt-1" style={{ color: "#6B3410" }}>
                    We&apos;ll email you a secure reset link.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#8B5E1A] shrink-0" strokeWidth={1.75} />
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
