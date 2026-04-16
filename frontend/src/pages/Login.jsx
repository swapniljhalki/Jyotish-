import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles } from "lucide-react";

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
      {/* Left decorative panel */}
      <div className="hidden md:flex relative overflow-hidden border-r border-[rgba(212,175,55,0.15)]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1760715756584-9a88f2b272c6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHw0fHxhc3Ryb2xvZ3klMjBtYW5kYWxhJTIwZ29sZHxlbnwwfHx8fDE3NzYzNjk3MTh8MA&ixlib=rb-4.1.0&q=85')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0D14] via-transparent to-[#0A0D14]/80" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="ornate-divider mb-4">
            <span className="font-accent text-xs text-[#D4AF37]">स्वागतम्</span>
          </div>
          <h2 className="font-heading text-4xl text-zinc-50 leading-tight">
            Return to the <span className="text-gold-gradient italic">celestial court.</span>
          </h2>
          <p className="mt-4 font-body text-zinc-400 max-w-sm">
            Sign in to access your saved readings and deepen your practice.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8 md:p-16">
        <form onSubmit={submit} className="w-full max-w-md fade-up" data-testid="login-form">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="h-4 w-4 text-[#FFD700]" />
            <span className="font-accent text-xs text-[#D4AF37]">Login</span>
          </div>
          <h1 className="font-heading text-4xl text-zinc-50 mb-2">Welcome back.</h1>
          <p className="font-body text-zinc-400 mb-8">Enter your credentials to continue.</p>

          <div className="space-y-5">
            <div>
              <Label htmlFor="email" className="font-accent text-[10px] text-zinc-400">Email</Label>
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
              <Label htmlFor="password" className="font-accent text-[10px] text-zinc-400">Password</Label>
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
            <p className="text-sm text-zinc-400 font-body text-center">
              New seeker?{" "}
              <Link to="/register" className="text-[#FF9933] hover:text-[#FFD700]" data-testid="login-to-register">
                Begin your journey
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
