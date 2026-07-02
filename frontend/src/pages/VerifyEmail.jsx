import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { refresh } = useAuth();
  const [status, setStatus] = useState(token ? "working" : "missing");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await api.post("/auth/verify-email", { token });
        setStatus("ok");
        refresh();
      } catch (e) {
        setErr(formatApiError(e.response?.data?.detail) || e.message);
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-64px)] cosmic-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md glass-card p-10 fade-up text-center" data-testid="verify-email-page">
        <h1 className="font-heading text-4xl text-zinc-50 mb-4">Email Verification</h1>
        {status === "working" && <p className="text-zinc-700">Verifying...</p>}
        {status === "missing" && <p className="text-red-400" data-testid="verify-email-missing">Missing token in URL.</p>}
        {status === "ok" && (
          <div className="space-y-4" data-testid="verify-email-ok">
            <p className="text-[#FFD700] text-lg">✦ Your email is verified ✦</p>
            <Link to="/" className="text-[#FF9933] text-sm">Continue to the app</Link>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-3" data-testid="verify-email-error">
            <p className="text-red-400">{err}</p>
            <Link to="/" className="text-[#FF9933] text-sm">Back home</Link>
          </div>
        )}
      </div>
    </div>
  );
}
