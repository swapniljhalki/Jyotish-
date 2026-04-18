import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles } from "lucide-react";
import GoogleButton from "../components/GoogleButton";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      nav("/");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] cosmic-bg grid md:grid-cols-2">
      <div className="hidden md:flex relative overflow-hidden border-r border-[rgba(212,175,55,0.15)]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1677357623576-7c8aab08da22?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHw0fHxnYWxheHklMjBzdGFycyUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzc2MzY5NzI4fDA&ixlib=rb-4.1.0&q=85')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0D14] via-transparent to-[#0A0D14]/80" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="ornate-divider mb-4">
            <span className="font-accent text-xs text-[#D4AF37]">आरम्भ</span>
          </div>
          <h2 className="font-heading text-4xl text-zinc-50 leading-tight">
            Begin the <span className="text-gold-gradient italic">sacred journey.</span>
          </h2>
          <p className="mt-4 font-body text-zinc-400 max-w-sm">
            Create your seeker account to unlock personalised readings.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 md:p-16">
        <form onSubmit={submit} className="w-full max-w-md fade-up" data-testid="register-form">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="h-4 w-4 text-[#FFD700]" />
            <span className="font-accent text-xs text-[#D4AF37]">Register</span>
          </div>
          <h1 className="font-heading text-4xl text-zinc-50 mb-2">Create account.</h1>
          <p className="font-body text-zinc-400 mb-8">It takes a moment — the stars are patient.</p>

          <div className="space-y-5">
            <div>
              <Label htmlFor="name" className="font-accent text-[10px] text-zinc-400">Full Name</Label>
              <Input
                id="name"
                required minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933] focus:ring-[#FF9933]"
                data-testid="register-name-input"
              />
            </div>
            <div>
              <Label htmlFor="email" className="font-accent text-[10px] text-zinc-400">Email</Label>
              <Input
                id="email" type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933] focus:ring-[#FF9933]"
                data-testid="register-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-accent text-[10px] text-zinc-400">Password (min 6)</Label>
              <Input
                id="password" type="password" required minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100 focus:border-[#FF9933] focus:ring-[#FF9933]"
                data-testid="register-password-input"
              />
            </div>
            {err && (
              <div className="text-sm text-red-400 font-body" data-testid="register-error">{err}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-saffron w-full justify-center disabled:opacity-60"
              data-testid="register-submit-btn"
            >
              {loading ? "Casting chart..." : "Begin Journey"}
            </button>
            <p className="text-sm text-zinc-400 font-body text-center">
              Already a seeker?{" "}
              <Link to="/login" className="text-[#FF9933] hover:text-[#FFD700]" data-testid="register-to-login">
                Sign in
              </Link>
            </p>
            <GoogleButton label="Continue with Google" />
          </div>
        </form>
      </div>
    </div>
  );
}
