import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles } from "lucide-react";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] cosmic-bg grid md:grid-cols-2">
      {/* Left decorative panel — Lord Narasimha & Devi Lakshmi */}
      <div className="hidden md:flex relative overflow-hidden border-r border-[rgba(212,175,55,0.15)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://customer-assets.emergentagent.com/job_kundali-chart-1/artifacts/ygnek7sx_download%20%282%29.jfif')" }}
          data-testid="login-deity-image"
          aria-label="Lord Lakshmi Narasimha with Goddess Lakshmi and Prahlada"
        />
        {/* Stronger dark gradient anchored to the bottom so the overlay text
            stays legible against the bright deity portrait. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/70 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 w-full">
          <div
            className="max-w-md rounded-2xl p-6 backdrop-blur-md"
            style={{ background: "rgba(10,13,20,0.55)", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <div className="ornate-divider mb-4">
              <span className="font-accent text-xs" style={{ color: "#FFD700" }}>स्वागतम्</span>
            </div>
            <h2
              className="font-heading text-4xl leading-tight"
              style={{ color: "#FFFFFF", textShadow: "0 2px 12px rgba(0,0,0,0.65)" }}
            >
              Return to the{" "}
              <span className="italic" style={{ color: "#FFD700", textShadow: "0 2px 12px rgba(0,0,0,0.65)" }}>
                celestial court.
              </span>
            </h2>
            <p
              className="mt-4 font-body"
              style={{ color: "#F5F5F5", textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
            >
              Sign in to access your saved readings and deepen your practice.
            </p>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8 md:p-16">
        <form onSubmit={submit} className="w-full max-w-md fade-up" data-testid="login-form">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="h-4 w-4 text-[#FFD700]" />
            <span className="font-accent text-xs text-[#B8860B]">Login</span>
          </div>
          <h1 className="font-heading text-4xl text-zinc-50 mb-2">Welcome back.</h1>
          <p className="font-body text-zinc-700 mb-8">Enter your credentials to continue.</p>

          <div className="space-y-5">
            <div>
              <Label htmlFor="email" className="font-accent text-[10px] text-zinc-700">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933] focus:ring-[#FF9933]"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-accent text-[10px] text-zinc-700">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933] focus:ring-[#FF9933]"
                data-testid="login-password-input"
              />
            </div>
            {err && (
              <div className="text-sm text-red-400 font-body" data-testid="login-error">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-saffron w-full justify-center disabled:opacity-60"
              data-testid="login-submit-btn"
            >
              {loading ? "Consulting stars..." : "Sign In"}
            </button>
            <div className="flex justify-between text-sm font-body">
              <Link to="/forgot-password" className="text-zinc-700 hover:text-[#FF9933]" data-testid="login-forgot-link">
                Forgot password?
              </Link>
              <Link to="/register" className="text-[#FF9933] hover:text-[#FFD700]" data-testid="login-to-register">
                Begin your journey
              </Link>
            </div>
            <GoogleButton label="Sign in with Google" />
          </div>
        </form>
      </div>
    </div>
  );
}
