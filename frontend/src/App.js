import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Grahas from "./pages/Grahas";
import Nakshatras from "./pages/Nakshatras";
import BasicTier from "./pages/BasicTier";
import PremiumTier from "./pages/PremiumTier";
import Pricing from "./pages/Pricing";

function Shell({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster theme="dark" position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Shell><Landing /></Shell>} />
            <Route path="/login" element={<Shell><Login /></Shell>} />
            <Route path="/register" element={<Shell><Register /></Shell>} />
            <Route path="/grahas" element={<Shell><Grahas /></Shell>} />
            <Route path="/nakshatras" element={<Shell><Nakshatras /></Shell>} />
            <Route path="/pricing" element={<Shell><Pricing /></Shell>} />
            <Route
              path="/basic"
              element={
                <Shell>
                  <ProtectedRoute>
                    <BasicTier />
                  </ProtectedRoute>
                </Shell>
              }
            />
            <Route
              path="/premium"
              element={
                <Shell>
                  <ProtectedRoute>
                    <PremiumTier />
                  </ProtectedRoute>
                </Shell>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
