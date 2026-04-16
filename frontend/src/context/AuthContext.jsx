import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = no session
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, subscribe, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
