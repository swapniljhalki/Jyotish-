import { Link } from "react-router-dom";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function GoogleButton({ label = "Continue with Google" }) {
  const onClick = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <>
      <div className="ornate-divider my-6">
        <span className="font-accent text-[10px] text-zinc-500">or</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        data-testid="google-login-btn"
        className="w-full flex items-center justify-center gap-3 py-3 border border-[rgba(212,175,55,0.3)] text-zinc-200 hover:bg-[rgba(212,175,55,0.08)] hover:border-[#D4AF37] transition-colors font-body"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.5 2.3 2.1 6.7 2.1 12.2S6.5 22.1 12 22.1c6.9 0 9.5-4.9 9.5-9.5 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        {label}
      </button>
      <p className="mt-3 text-xs text-zinc-500 font-body text-center">
        By continuing you agree to our terms. <Link to="/forgot-password" className="text-[#FF9933]">Forgot password?</Link>
      </p>
    </>
  );
}
