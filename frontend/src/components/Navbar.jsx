import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { LogOut, Menu, X } from "lucide-react";

const navItems = [
  { to: "/grahas",       k: "nav.grahas" },
  { to: "/nakshatras",   k: "nav.nakshatras" },
  { to: "/numerology",   k: "nav.numerology" },
  { to: "/basic",        k: "nav.basic_reading" },
  { to: "/premium",      k: "nav.premium_numerology" },
  { to: "/book",         k: "nav.book_1on1",  authOnly: true, accent: true },
  { to: "/readings",     k: "nav.my_readings", authOnly: true },
  { to: "/pricing",      k: "nav.pricing" },
  { to: "/testimonials", k: "nav.testimonials" },
];

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
          {navItems.filter((item) => !item.authOnly || user).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.to.slice(1)}`}
              className={linkClass}
            >
              {t(item.k)}
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
            {navItems.filter((item) => !item.authOnly || user).map((item) => (
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
                {t(item.k)}
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
