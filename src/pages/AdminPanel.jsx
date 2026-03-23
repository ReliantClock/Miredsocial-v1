import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { SITE_CONFIG } from "../config/site.config.js";
import { Users, Shield, BarChart2, Loader, Trash2, Edit2, Check, X, Plus } from "lucide-react";

const TABS = [
  { id: "users",   label: "Usuarios",    icon: Users    },
  { id: "stats",   label: "Estadísticas",icon: BarChart2 },
  { id: "audit",   label: "Auditoría",   icon: Shield   },
];

export default function AdminPanel() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState("users");

  if (loading) return <div className="feed-loading"><Loader size={24} className="spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="page-container admin-panel">
      <div className="admin-header">
        <Shield size={28} />
        <h1>Panel de Administración</h1>
      </div>

      <div className="admin-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`admin-tab ${tab === id ? "admin-tab-active" : ""}`} onClick={() => setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {tab === "users"  && <UsersTab />}
        {tab === "stats"  && <StatsTab />}
        {tab === "audit"  && <AuditTab />}
      </div>
    </div>
  );
}

// ── Gestión de usuarios ───────────────────────────────────────
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [editing, setEditing] = useState(null); // { id, role }
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function updateRole(userId, newRole) {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setEditing(null);
  }

  async function banUser(userId, banned) {
    await supabase.from("profiles").update({ is_banned: banned }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: banned } : u));
  }

  async function deleteUser(userId) {
    if (!window.confirm("¿Borrar este usuario permanentemente?")) return;
    await supabase.auth.admin.deleteUser(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  }

  const filtered = users.filter(u =>
    u.alias?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-tab-content">
      <div className="admin-toolbar">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por alias o correo…"
          className="form-input search-input"
        />
        <button className="btn-primary-sm" onClick={() => setShowCreate(v => !v)}>
          <Plus size={14} /> Crear usuario
        </button>
      </div>

      {showCreate && <CreateUserForm onCreated={fetchUsers} onClose={() => setShowCreate(false)} />}

      {loading ? <div className="feed-loading"><Loader size={22} className="spin" /></div> : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Alias</th>
                <th>Nombre real</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className={u.is_banned ? "row-banned" : ""}>
                  <td><strong>{u.alias}</strong></td>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    {editing?.id === u.id ? (
                      <select
                        value={editing.role}
                        onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}
                        className="form-input-sm"
                      >
                        {Object.values(SITE_CONFIG.roles).map(r => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`role-badge role-${u.role}`}>{SITE_CONFIG.roles[u.role?.toUpperCase()]?.label}</span>
                    )}
                  </td>
                  <td>
                    <span className={u.is_banned ? "status-banned" : "status-active"}>
                      {u.is_banned ? "Suspendido" : "Activo"}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {editing?.id === u.id ? (
                      <>
                        <button className="icon-btn success-btn" onClick={() => updateRole(u.id, editing.role)}><Check size={14} /></button>
                        <button className="icon-btn" onClick={() => setEditing(null)}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn" onClick={() => setEditing({ id: u.id, role: u.role })} title="Editar rol">
                          <Edit2 size={14} />
                        </button>
                        <button className="icon-btn" onClick={() => banUser(u.id, !u.is_banned)}
                          title={u.is_banned ? "Desbanear" : "Suspender"}>
                          {u.is_banned ? "✅" : "🚫"}
                        </button>
                        <button className="icon-btn danger-btn" onClick={() => deleteUser(u.id)} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-footer">{filtered.length} usuarios · máx {SITE_CONFIG.maxUsers}</p>
        </div>
      )}
    </div>
  );
}

// ── Crear usuario manualmente ─────────────────────────────────
function CreateUserForm({ onCreated, onClose }) {
  const [form, setForm] = useState({ email: "", full_name: "", alias: "", role: "user", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true); setError("");
    // Crear usuario vía Supabase Admin API (requiere service_role key en Edge Function)
    // Por seguridad, esto se debe hacer desde una Edge Function en Supabase, no desde el cliente.
    // Aquí mostramos el flujo: en producción, llamar a /api/admin/create-user
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al crear usuario");
      onCreated(); onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div className="create-user-form">
      <h3>Crear usuario</h3>
      {["email","full_name","alias","password"].map(f => (
        <input key={f} placeholder={f} value={form[f]} type={f === "password" ? "password" : "text"}
          onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} className="form-input" />
      ))}
      <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="form-input">
        {Object.values(SITE_CONFIG.roles).map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
      </select>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? <Loader size={14} className="spin" /> : "Crear"}
        </button>
        <button className="btn-secondary-sm" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Estadísticas ──────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("forums").select("id", { count: "exact", head: true }),
    ]).then(([u, p, c, f]) => setStats({
      users: u.count ?? 0, posts: p.count ?? 0,
      comments: c.count ?? 0, forums: f.count ?? 0,
    }));
  }, []);

  if (!stats) return <div className="feed-loading"><Loader size={22} className="spin" /></div>;

  const items = [
    { label: "Usuarios",      value: stats.users,    max: SITE_CONFIG.maxUsers },
    { label: "Publicaciones", value: stats.posts     },
    { label: "Comentarios",   value: stats.comments  },
    { label: "Foros",         value: stats.forums    },
  ];

  return (
    <div className="stats-grid">
      {items.map(({ label, value, max }) => (
        <div key={label} className="stat-card">
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value.toLocaleString()}</p>
          {max && <p className="stat-max">de {max.toLocaleString()} máx.</p>}
          {max && (
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${Math.min(100, (value/max)*100)}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Auditoría ─────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    supabase.from("audit_log").select("*, profiles(alias)").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setLogs(data ?? []));
  }, []);

  return (
    <div className="audit-log">
      {logs.map(l => (
        <div key={l.id} className="audit-entry">
          <span className="audit-actor">{l.profiles?.alias ?? "Sistema"}</span>
          <span className="audit-action">{l.action}</span>
          <span className="audit-time">{new Date(l.created_at).toLocaleString("es")}</span>
        </div>
      ))}
      {logs.length === 0 && <p className="empty-state">Sin entradas de auditoría.</p>}
    </div>
  );
}
