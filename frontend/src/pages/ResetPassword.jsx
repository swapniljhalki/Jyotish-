import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
      setTimeout(() => nav("/login"), 1500);
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] cosmic-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md glass-card p-10 fade-up" data-testid="reset-password-page">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-[#FFD700]" />
          <span className="font-accent text-xs text-[#D4AF37]">New Password</span>
        </div>
        <h1 className="font-heading text-4xl text-zinc-50 mb-2">Set new password.</h1>

        {!token && <p className="text-red-400 text-sm mb-4" data-testid="reset-no-token">Missing reset token in URL.</p>}
        {done ? (
          <p className="text-sm text-zinc-300" data-testid="reset-password-success">
            Password updated. Redirecting to login...
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5" data-testid="reset-password-form">
            <div>
              <Label className="font-accent text-[10px] text-zinc-400">New Password (min 6)</Label>
              <Input
                type="password" required minLength={6}
                value={pw} onChange={(e) => setPw(e.target.value)}
                className="mt-2 bg-[#121824] border-[rgba(212,175,55,0.2)] text-zinc-100"
                data-testid="reset-password-input"
              />
            </div>
            {err && <div className="text-sm text-red-400" data-testid="reset-password-error">{err}</div>}
            <button
              type="submit" disabled={loading || !token}
              className="btn-saffron w-full justify-center disabled:opacity-60"
              data-testid="reset-password-submit"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
            <Link to="/login" className="text-sm text-[#FF9933] block text-center">← Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
