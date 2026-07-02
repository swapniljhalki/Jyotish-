import { useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] cosmic-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md glass-card p-10 fade-up" data-testid="forgot-password-page">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-[#FFD700]" />
          <span className="font-accent text-xs text-[#B8860B]">Password Reset</span>
        </div>
        <h1 className="font-heading text-4xl text-zinc-50 mb-2">Forgot password?</h1>
        <p className="font-body text-zinc-700 mb-8">
          Enter your email and we'll send a reset link.
        </p>

        {sent ? (
          <div className="text-sm font-body text-zinc-800 space-y-3" data-testid="forgot-password-success">
            <p>If an account exists for <span className="text-[#FFD700]">{email}</span>, a reset link has been sent.</p>
            <p className="text-xs text-zinc-800 italic">
              (Dev mode: emails are logged to the admin outbox — check <Link to="/admin" className="text-[#FF9933]">/admin</Link> if you're an admin.)
            </p>
            <Link to="/login" className="text-[#FF9933] hover:text-[#FFD700] text-sm">← Back to login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" data-testid="forgot-password-form">
            <div>
              <Label className="font-accent text-[10px] text-zinc-700">Email</Label>
              <Input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100"
                data-testid="forgot-password-email"
              />
            </div>
            {err && <div className="text-sm text-red-400" data-testid="forgot-password-error">{err}</div>}
            <button type="submit" disabled={loading} className="btn-saffron w-full justify-center" data-testid="forgot-password-submit">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <Link to="/login" className="text-sm text-[#FF9933] hover:text-[#FFD700] block text-center">
              ← Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
