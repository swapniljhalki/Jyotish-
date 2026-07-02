import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

/**
 * Handles the Emergent Google OAuth redirect landing.
 * URL arrives like: /#session_id=xxxxx
 * We exchange that via backend, receive user+cookies, then navigate home.
 */
export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sid = m ? decodeURIComponent(m[1]) : "";
    if (!sid) { nav("/login", { replace: true }); return; }

    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", null, {
          headers: { "X-Session-ID": sid },
        });
        setUser(data);
        // Clean the hash then go home
        window.history.replaceState(null, "", "/");
        nav("/", { replace: true });
      } catch {
        nav("/login?oauth=failed", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center">
      <div className="font-accent text-xs text-[#B8860B] tracking-widest animate-pulse">
        aligning your stars...
      </div>
    </div>
  );
}
