import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import LanguagePicker from "./LanguagePicker";

const navItems = [
  { to: "/grahas",     k: "nav.grahas" },
  { to: "/nakshatras", k: "nav.nakshatras" },
  { to: "/numerology", k: "nav.numerology" },
  { to: "/basic",      k: "nav.basic_reading" },
  { to: "/premium",    k: "nav.premium_numerology" },
  { to: "/book",       k: "nav.book_1on1",  authOnly: true, accent: true },
  { to: "/readings",   k: "nav.my_readings", authOnly: true },
  { to: "/pricing",    k: "nav.pricing" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(212,175,55,0.15)] bg-[#0A0D14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
          <img
            src="/snw-logo.jpg"
            alt="Satish Numero World"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-[rgba(212,175,55,0.4)] group-hover:ring-[#FF9933] transition-all"
          />
          <span className="font-heading text-xl md:text-2xl tracking-tight leading-tight">
            <span className="text-gold-gradient font-semibold">Satish</span>
            <span className="text-zinc-200"> Numero</span>
            <span className="text-zinc-400"> World</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.filter((item) => !item.authOnly || user).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.to.slice(1)}`}
              className={({ isActive }) =>
                `text-sm font-body transition-colors hover:text-[#FF9933] ${
                  isActive
                    ? "text-[#FF9933]"
                    : item.accent
                    ? "text-[#D4AF37]"
                    : "text-zinc-300"
                }`
              }
            >
              {t(item.k)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguagePicker />
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
                <UserIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-xs font-body text-zinc-300" data-testid="nav-user-email">
                  {user.email}
                </span>
                <span className="text-[10px] font-accent text-[#FFD700] pl-2 border-l border-[rgba(212,175,55,0.25)]" data-testid="nav-user-tier">
                  {user.tier}
                </span>
              </div>
              {user.role === "admin" && (
                <Link to="/admin" data-testid="nav-admin-link" className="hidden md:block text-[10px] font-accent text-[#FFD700] hover:text-[#FF9933]">
                  {t("nav.admin")}
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="nav-logout-btn"
                className="text-zinc-300 hover:text-[#FF9933] hover:bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-1" /> {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-link">
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-[#FF9933] hover:bg-transparent">
                  {t("nav.login")}
                </Button>
              </Link>
              <Link to="/register" data-testid="nav-register-link">
                <button className="btn-saffron text-sm">{t("nav.begin_journey")}</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
