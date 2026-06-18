import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = no session
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Short timeout + one retry — a single stalled request must never leave the
    // whole app stuck on the auth loading screen.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await api.get("/auth/me", { timeout: 15000 });
        setUser(data);
        setLoading(false);
        return;
      } catch (e) {
        if (e.response) break; // real auth response (401 etc.) — not a network stall
      }
    }
    setUser(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from Emergent Google OAuth callback, skip /me check.
    // AuthCallback page will exchange the session_id and establish the session first.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setUser(data);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { void e; }
    setUser(false);
  };

  const subscribe = async (tier) => {
    const { data } = await api.post("/subscribe", { tier });
    setUser(data);
    return data;
  };

  // Memoised so consumers of `useAuth()` only re-render when something they
  // actually depend on changes (not on every <AuthProvider/> re-render).
  const value = useMemo(
    () => ({ user, loading, login, register, logout, subscribe, refresh, setUser }),
    [user, loading, refresh]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
