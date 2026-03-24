import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { SITE_CONFIG } from "../../config/site.config.js";
import { Bell, Settings, LogOut, Shield, ChevronDown, Moon, Sun } from "lucide-react";

export default function Header() {
  const { session, profile, isAdmin } = useAuth();
  const [dropOpen, setDropOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const dropRef  = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  async function handleLogout() {
    setDropOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <header className="header">
      <div className="header-inner">

        {/* Logo */}
        <Link to="/" className="header-brand">
          <div className="brand-icon"><span>{SITE_CONFIG.name[0]}</span></div>
          <span className="brand-name">{SITE_CONFIG.name}</span>
        </Link>

        {/* Acciones derecha */}
        <div className="header-actions">
          {session ? (
            <>
              <button className="icon-btn" title="Notificaciones">
                <Bell size={20} />
              </button>

              {/* Avatar → va directo al perfil */}
              <button className="avatar-chip" onClick={() => { navigate("/perfil"); }} title="Mi perfil">
                <div
                  className="avatar-small"
                  style={{
                    backgroundColor: profile?.theme_color ?? "#2563eb",
                    backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : "none",
                  }}
                >
                  {!profile?.avatar_url && (profile?.alias?.[0]?.toUpperCase() ?? "U")}
                </div>
                <span className="chip-alias">{profile?.alias ?? "Usuario"}</span>
              </button>

              {/* Chevron → abre dropdown */}
              <div className="dropdown-wrapper" ref={dropRef}>
                <button
                  className={`chevron-btn ${dropOpen ? "chevron-btn-open" : ""}`}
                  onClick={() => setDropOpen(v => !v)}
                  title="Opciones"
                >
                  <ChevronDown size={16} />
                </button>

                {dropOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <p className="dropdown-alias">{profile?.alias}</p>
                      <p className="dropdown-role">
                        {SITE_CONFIG.roles[profile?.role?.toUpperCase()]?.label ?? "Usuario"}
                      </p>
                    </div>
                    <div className="dropdown-divider" />

                    <Link to="/ajustes" className="dropdown-item" onClick={() => setDropOpen(false)}>
                      <Settings size={16} /> Ajustes
                    </Link>

                    <button className="dropdown-item" onClick={() => setDarkMode(v => !v)}>
                      {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                      {darkMode ? "Modo claro" : "Modo oscuro"}
                    </button>

                    {isAdmin && (
                      <Link to="/admin" className="dropdown-item dropdown-item-admin" onClick={() => setDropOpen(false)}>
                        <Shield size={16} /> Panel Admin
                      </Link>
                    )}

                    <div className="dropdown-divider" />
                    <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                      <LogOut size={16} /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/auth" className="btn-ghost-sm">Iniciar sesión</Link>
              <Link to="/auth?tab=register" className="btn-solid-sm">Registrarse</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
