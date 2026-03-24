
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
import SettingsPage from "./pages/SettingsPage.jsx";
import "./styles/main.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Header />
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/"            element={<HomePage />} />
              <Route path="/novedades"   element={<NewsPage />} />
              <Route path="/comunidades" element={<CommunitiesPage />} />
              <Route path="/perfil"      element={<ProfilePage />} />
              <Route path="/perfil/:alias" element={<ProfilePage />} />
              <Route path="/auth"        element={<AuthPage />} />
              <Route path="/admin"       element={<AdminPanel />} />
              <Route path="/ajustes"     element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
