import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Sparkles, LogOut, User as UserIcon } from "lucide-react";

const navItems = [
  { to: "/grahas", label: "Grahas" },
  { to: "/nakshatras", label: "Nakshatras" },
  { to: "/basic", label: "Basic Reading" },
  { to: "/premium", label: "Premium Kundali" },
  { to: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(212,175,55,0.15)] bg-[#0A0D14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <Sparkles className="h-5 w-5 text-[#FFD700] group-hover:rotate-12 transition-transform" />
          <span className="font-heading text-2xl tracking-tight">
            <span className="text-gold-gradient font-semibold">Jyotish</span>
            <span className="text-zinc-400"> • Vedic</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.to.slice(1)}`}
              className={({ isActive }) =>
                `text-sm font-body transition-colors hover:text-[#FF9933] ${
                  isActive ? "text-[#FF9933]" : "text-zinc-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
                  ADMIN
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="nav-logout-btn"
                className="text-zinc-300 hover:text-[#FF9933] hover:bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-link">
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-[#FF9933] hover:bg-transparent">
                  Login
                </Button>
              </Link>
              <Link to="/register" data-testid="nav-register-link">
                <button className="btn-saffron text-sm">Begin Journey</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
