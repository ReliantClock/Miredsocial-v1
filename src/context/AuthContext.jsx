import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [profile, setProfile]   = useState(null);

  useEffect(() => {
    // Carga la sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // Escucha cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess ?? null);
        if (!sess) { setProfile(null); return; }
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sess.user.id)
          .single();
        setProfile(data ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Refresca perfil después de editar
  async function refreshProfile() {
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    setProfile(data ?? null);
  }

  const isAdmin   = profile?.role === "admin";
  const isManager = profile?.role === "manager" || isAdmin;
  const isUser    = !!profile;
  const loading   = session === undefined;

  return (
    <AuthContext.Provider value={{ session, profile, isAdmin, isManager, isUser, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
