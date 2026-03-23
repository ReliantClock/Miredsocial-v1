import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Header from "./components/layout/Header.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import HomePage from "./pages/HomePage.jsx";
import NewsPage from "./pages/NewsPage.jsx";
import CommunitiesPage from "./pages/CommunitiesPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import "./styles/main.css";

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Header
            onMenuToggle={() => setMobileOpen(v => !v)}
            mobileOpen={mobileOpen}
          />
          <Navbar
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
          />
          <main className="main-content">
            <Routes>
              <Route path="/"            element={<HomePage />} />
              <Route path="/novedades"   element={<NewsPage />} />
              <Route path="/comunidades" element={<CommunitiesPage />} />
              <Route path="/perfil"      element={<ProfilePage />} />
              <Route path="/perfil/:alias" element={<ProfilePage />} />
              <Route path="/auth"        element={<AuthPage />} />
              <Route path="/admin"       element={<AdminPanel />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
