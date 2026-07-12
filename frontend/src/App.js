import "@/App.css";
import "./i18n";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import TranslationDisclaimerBanner from "./components/TranslationDisclaimerBanner";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Grahas from "./pages/Grahas";
import Nakshatras from "./pages/Nakshatras";
import Numerology from "./pages/Numerology";
import BasicTier from "./pages/BasicTier";
import PremiumTier from "./pages/PremiumTier";
import Pricing from "./pages/Pricing";
import Testimonials from "./pages/Testimonials";
import About from "./pages/About";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import AuthCallback from "./pages/AuthCallback";
import Admin from "./pages/Admin";
import ReadingsList from "./pages/ReadingsList";
import ReadingDetail from "./pages/ReadingDetail";
import PublicReading from "./pages/PublicReading";
import BookConsultation from "./pages/BookConsultation";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";

function Shell({ children }) {
  return (
    <>
      <div className="sticky top-0 z-50">
        <TranslationDisclaimerBanner />
        <Navbar />
      </div>
      {children}
      <Footer />
    </>
  );
}

/** Scroll back to the top whenever the route pathname changes — otherwise
 *  the browser preserves the previous page's scroll position, which feels
 *  like a long page (e.g. /premium) loads "halfway down". */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

/**
 * Top-level router that intercepts the Emergent Google OAuth hash callback
 * (URL fragment like `#session_id=...`) BEFORE any other route renders.
 */
function Router() {
  const location = useLocation();
  if (location.hash && location.hash.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Shell><Landing /></Shell>} />
        <Route path="/login" element={<Shell><Login /></Shell>} />
        <Route path="/register" element={<Shell><Register /></Shell>} />
        <Route path="/forgot-password" element={<Shell><ForgotPassword /></Shell>} />
        <Route path="/reset-password" element={<Shell><ResetPassword /></Shell>} />
        <Route path="/verify-email" element={<Shell><VerifyEmail /></Shell>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/grahas" element={<Shell><Grahas /></Shell>} />
        <Route path="/nakshatras" element={<Shell><Nakshatras /></Shell>} />
        <Route path="/numerology" element={<Shell><Numerology /></Shell>} />
        <Route path="/pricing" element={<Shell><Pricing /></Shell>} />
        <Route path="/testimonials" element={<Shell><Testimonials /></Shell>} />
        <Route path="/about" element={<Shell><About /></Shell>} />
        <Route path="/basic" element={<Shell><ProtectedRoute><BasicTier /></ProtectedRoute></Shell>} />
        <Route path="/premium" element={<Shell><ProtectedRoute><PremiumTier /></ProtectedRoute></Shell>} />
        <Route path="/admin" element={<Shell><ProtectedRoute><Admin /></ProtectedRoute></Shell>} />
        <Route path="/readings" element={<Shell><ProtectedRoute><ReadingsList /></ProtectedRoute></Shell>} />
        <Route path="/readings/:id" element={<Shell><ProtectedRoute><ReadingDetail /></ProtectedRoute></Shell>} />
        <Route path="/r/:token" element={<PublicReading />} />
        <Route path="/book" element={<Shell><ProtectedRoute><BookConsultation /></ProtectedRoute></Shell>} />
        <Route path="/my-bookings" element={<Shell><ProtectedRoute><MyBookings /></ProtectedRoute></Shell>} />
        <Route path="/profile" element={<Shell><ProtectedRoute><Profile /></ProtectedRoute></Shell>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster theme="dark" position="top-right" richColors />
          <Router />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
