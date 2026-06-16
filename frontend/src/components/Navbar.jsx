import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { LogOut, Menu, X, ChevronDown, Sun, Moon } from "lucide-react";

// Dropdown grouping for "Know the Basics"
const KNOW_BASICS_ITEMS = [
  { to: "/grahas",     label: "Grahas",     blurb: "The 9 planetary deities",     icon: Sun },
  { to: "/nakshatras", label: "Nakshatras", blurb: "The 27 lunar mansions",       icon: Moon },
];

// Flat items (excluding the two that moved into the dropdown)
const navItems = [
  { to: "/about",        k: "nav.about", fallback: "About" },
  { to: "/numerology",   k: "nav.numerology" },
  { to: "/basic",        k: "nav.basic_reading" },
  { to: "/premium",      k: "nav.premium_numerology" },
  { to: "/book",         k: "nav.book_1on1",  accent: true },
  { to: "/readings",     k: "nav.my_readings", authOnly: true },
  { to: "/pricing",      k: "nav.pricing" },
  { to: "/testimonials", k: "nav.testimonials" },
];

function KnowBasicsDropdown({ linkClass }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const location = useLocation();
  const isActive = KNOW_BASICS_ITEMS.some((i) => location.pathname.startsWith(i.to));

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on route change
  // eslint-disable-next-line
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="nav-know-basics-trigger"
        className={`flex items-center gap-1 text-[13px] font-medium tracking-wide transition-colors hover:text-[#FF8C00] ${
          isActive ? "text-[#FF8C00]" : "text-[#2A1A05]"
        }`}
      >
        Know the Basics
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {/* Invisible bridge so hover doesn't drop while moving cursor into the menu */}
      <div className={`absolute left-0 right-0 h-3 top-full ${open ? "" : "pointer-events-none"}`} aria-hidden="true" />

      {open && (
        <div
          role="menu"
          data-testid="nav-know-basics-menu"
          className="absolute left-1/2 top-[calc(100%+0.75rem)] -translate-x-1/2 w-[340px] bg-white border border-[rgba(92,58,9,0.10)] rounded-2xl shadow-[0_16px_40px_rgba(26,28,41,0.10)] p-2 z-50"
        >
          {KNOW_BASICS_ITEMS.map(({ to, label, blurb, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              data-testid={`nav-know-basics-${to.slice(1)}`}
              className="flex items-start gap-4 px-4 py-3 rounded-xl hover:bg-[rgba(255,140,0,0.07)] transition-colors group"
            >
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,140,0,0.10)] group-hover:bg-[rgba(255,140,0,0.18)] transition-colors">
                <Icon className="h-4 w-4 text-[#FF8C00]" strokeWidth={1.75} />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-semibold text-[#2A1A05] group-hover:text-[#FF8C00] transition-colors">{label}</span>
                <span className="block text-[12px] text-[#6B3410] mt-0.5">{blurb}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
      {/* keep linter happy */}
      <span className="sr-only">{linkClass ? "" : ""}</span>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    nav("/");
  };

  const linkClass = ({ isActive }) =>
    `text-[13px] font-medium tracking-wide transition-colors hover:text-[#FF8C00] ${
      isActive ? "text-[#FF8C00]" : "text-[#2A1A05]"
    }`;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(253,251,247,0.85)] border-b border-[rgba(92,58,9,0.08)]">
      <div className="sb-container h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0" data-testid="nav-logo">
          <img
            src="/snw-logo.jpg"
            alt="Satish Numero World"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-[rgba(92,58,9,0.15)] group-hover:ring-[#FF8C00] transition-all"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {/* About sits first */}
          <NavLink
            key="/about"
            to="/about"
            data-testid="nav-about"
            className={linkClass}
          >
            About
          </NavLink>

          {/* Know the Basics dropdown (Grahas + Nakshatras) */}
          <KnowBasicsDropdown linkClass={linkClass} />

          {/* Remaining flat items */}
          {navItems.filter((item) => item.to !== "/about" && (!item.authOnly || user)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.to.slice(1)}`}
              className={linkClass}
            >
              {t(item.k, item.fallback ?? item.k)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-[11px] font-medium tracking-wider uppercase text-[#8B5E1A]" data-testid="nav-user-tier">
                {user.tier}
              </span>
              {user.role === "admin" && (
                <Link to="/admin" data-testid="nav-admin-link" className="text-[11px] font-bold tracking-wider uppercase text-[#FF8C00] hover:text-[#E67A00]">
                  {t("nav.admin")}
                </Link>
              )}
              <button
                onClick={handleLogout}
                data-testid="nav-logout-btn"
                className="sb-btn-ghost"
              >
                <LogOut className="h-4 w-4" /> {t("nav.logout")}
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" data-testid="nav-login-link" className="sb-btn-ghost">
                {t("nav.login")}
              </Link>
              <Link to="/register" data-testid="nav-register-link">
                <button className="sb-btn-primary text-sm py-2.5 px-5">{t("nav.begin_journey")}</button>
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 rounded-full hover:bg-black/5 transition"
            aria-label="Toggle menu"
            data-testid="nav-mobile-toggle"
          >
            {open ? <X className="h-5 w-5 text-[#2A1A05]" /> : <Menu className="h-5 w-5 text-[#2A1A05]" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden border-t border-[rgba(92,58,9,0.08)] bg-[#FDFBF7]" data-testid="nav-mobile-drawer">
          <nav className="sb-container py-6 flex flex-col gap-1">
            {/* About */}
            <NavLink
              to="/about"
              onClick={() => setOpen(false)}
              data-testid="nav-mobile-about"
              className={({ isActive }) =>
                `block px-4 py-3 rounded-2xl text-sm font-medium transition ${
                  isActive ? "bg-[rgba(255,140,0,0.10)] text-[#FF8C00]" : "text-[#2A1A05] hover:bg-black/5"
                }`
              }
            >
              About
            </NavLink>

            {/* Know the Basics group (mobile: shown as a labelled cluster, not collapsed) */}
            <div className="mt-2 px-4 pb-1 text-[11px] font-bold tracking-widest uppercase text-[#8B5E1A]">
              Know the Basics
            </div>
            {KNOW_BASICS_ITEMS.map(({ to, label, blurb, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                data-testid={`nav-mobile-${to.slice(1)}`}
                className={({ isActive }) =>
                  `flex items-start gap-3 px-4 py-3 rounded-2xl transition ${
                    isActive ? "bg-[rgba(255,140,0,0.10)] text-[#FF8C00]" : "text-[#2A1A05] hover:bg-black/5"
                  }`
                }
              >
                <Icon className="h-4 w-4 mt-1 text-[#FF8C00]" strokeWidth={1.75} />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[12px] text-[#6B3410]">{blurb}</span>
                </span>
              </NavLink>
            ))}

            {/* Remaining flat items */}
            {navItems.filter((item) => item.to !== "/about" && (!item.authOnly || user)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                data-testid={`nav-mobile-${item.to.slice(1)}`}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-2xl text-sm font-medium transition ${
                    isActive ? "bg-[rgba(255,140,0,0.10)] text-[#FF8C00]" : "text-[#2A1A05] hover:bg-black/5"
                  }`
                }
              >
                {t(item.k, item.fallback ?? item.k)}
              </NavLink>
            ))}

            <div className="mt-4 pt-4 border-t border-[rgba(92,58,9,0.08)] flex flex-col gap-2">
              {user ? (
                <>
                  {user.role === "admin" && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="px-4 py-3 rounded-2xl text-sm font-semibold text-[#FF8C00] hover:bg-black/5">
                      {t("nav.admin")}
                    </Link>
                  )}
                  <button onClick={handleLogout} className="sb-btn-outline w-full justify-center">
                    <LogOut className="h-4 w-4" /> {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <button className="sb-btn-outline w-full justify-center">{t("nav.login")}</button>
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    <button className="sb-btn-primary w-full justify-center">{t("nav.begin_journey")}</button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
