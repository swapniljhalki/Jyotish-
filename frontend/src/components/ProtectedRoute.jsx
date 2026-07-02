import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, minTier }) {
  const { user, loading } = useAuth();

  if (loading || user === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="font-accent text-xs text-[#B8860B] tracking-widest animate-pulse">
          consulting the stars...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (minTier) {
    const order = { free: 0, basic: 1, premium: 2 };
    if ((order[user.tier] ?? 0) < order[minTier]) {
      return <Navigate to={`/pricing?need=${minTier}`} replace />;
    }
  }

  return children;
}
