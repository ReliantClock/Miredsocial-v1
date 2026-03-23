import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import CreatePost from "../components/feed/CreatePost.jsx";
import { SITE_CONFIG } from "../config/site.config.js";
import { Plus, Lock, Globe, EyeOff, Loader, Trash2, X } from "lucide-react";

export default function CommunitiesPage() {
  const { session, isAdmin, profile } = useAuth();
  const [forums,      setForums]      = useState([]);
  const [activeForum, setActiveForum] = useState(null);
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newForum,    setNewForum]    = useState({ name: "", description: "", type: "public" });
  const [creating,    setCreating]    = useState(false);
  const [memberOf,    setMemberOf]    = useState(new Set());

  useEffect(() => { fetchForums(); }, []);
  useEffect(() => { if (activeForum) fetchPosts(activeForum.id); }, [activeForum]);

  async function fetchForums() {
    const { data } = await supabase.from("forums").select("*").order("name");
    setForums(data ?? []);
    if (data?.length) setActiveForum(data[0]);

    if (session) {
      const { data: mData } = await supabase
        .from("forum_members")
        .select("forum_id")
        .eq("user_id", session.user.id);
      setMemberOf(new Set(mData?.map(m => m.forum_id)));
    }
  }

  async function fetchPosts(forumId) {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(alias, avatar_url, theme_color, role), forums(is_anonymous)")
      .eq("section", "community")
      .eq("forum_id", forumId)
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }

  async function joinForum(forumId) {
    if (!session) return;
    await supabase.from("forum_members").insert({ forum_id: forumId, user_id: session.user.id });
    setMemberOf(prev => new Set([...prev, forumId]));
  }

  async function leaveForum(forumId) {
    if (!session) return;
    await supabase.from("forum_members").delete()
      .eq("forum_id", forumId).eq("user_id", session.user.id);
    setMemberOf(prev => { const s = new Set(prev); s.delete(forumId); return s; });
  }

  async function deleteForum(forumId) {
    if (!window.confirm("¿Borrar este foro?")) return;
    await supabase.from("forums").delete().eq("id", forumId);
    setForums(prev => prev.filter(f => f.id !== forumId));
    if (activeForum?.id === forumId) setActiveForum(forums[0] ?? null);
  }

  async function createForum() {
    if (!newForum.name.trim()) return;
    setCreating(true);
    const slug = newForum.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { data, error } = await supabase
      .from("forums")
      .insert({
        name:         newForum.name.trim(),
        slug:         slug + "_" + Date.now(),
        description:  newForum.description,
        type:         newForum.type,
        is_anonymous: false,
        created_by:   session.user.id,
      })
      .select().single();
    if (!error) {
      setForums(prev => [...prev, data]);
      setActiveForum(data);
      setShowCreate(false);
      setNewForum({ name: "", description: "", type: "public" });
    }
    setCreating(false);
  }

  const ForumIcon = ({ f }) => {
    if (f.is_anonymous) return <EyeOff size={14} />;
    if (f.type === "public") return <Globe size={14} />;
    return <Lock size={14} />;
  };

  const canAccessForum = (f) =>
    f.type === "public" || f.is_anonymous ||
    isAdmin || memberOf.has(f.id);

  const canPost = session && activeForum && canAccessForum(activeForum);

  return (
    <div className="page-container news-layout">
      {/* Sidebar */}
      <aside className="groups-sidebar">
        <div className="sidebar-header">
          <h2>Foros</h2>
          {session && (
            <button className="icon-btn" onClick={() => setShowCreate(v => !v)}>
              {showCreate ? <X size={18} /> : <Plus size={18} />}
            </button>
          )}
        </div>

        {showCreate && (
          <div className="new-group-form">
            <input value={newForum.name} onChange={e => setNewForum(p => ({ ...p, name: e.target.value }))}
              placeholder="Nombre del foro" className="form-input" />
            <input value={newForum.description} onChange={e => setNewForum(p => ({ ...p, description: e.target.value }))}
              placeholder="Descripción (opcional)" className="form-input" />
            <select value={newForum.type} onChange={e => setNewForum(p => ({ ...p, type: e.target.value }))} className="form-input">
              <option value="public">Público</option>
              <option value="invite_only">Solo con invitación</option>
              <option value="private">Privado</option>
            </select>
            <button className="btn-primary" onClick={createForum} disabled={creating}>
              {creating ? <Loader size={14} className="spin" /> : "Crear foro"}
            </button>
          </div>
        )}

        <div className="groups-list">
          {forums.map(f => (
            <div key={f.id} className={`group-item-wrapper ${activeForum?.id === f.id ? "group-item-active-wrapper" : ""}`}>
              <button
                className={`group-item ${activeForum?.id === f.id ? "group-item-active" : ""}`}
                onClick={() => setActiveForum(f)}
              >
                <div className="group-icon forum-icon"><ForumIcon f={f} /></div>
                <span>{f.name}</span>
              </button>
              {isAdmin && f.slug !== SITE_CONFIG.anonymousForumSlug && (
                <button className="icon-btn danger-btn forum-delete" onClick={() => deleteForum(f.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Feed del foro */}
      <main className="news-feed">
        {activeForum ? (
          <>
            <div className="news-feed-header">
              <div className="forum-title-row">
                <h1>{activeForum.name}</h1>
                {activeForum.is_anonymous && (
                  <span className="anon-badge"><EyeOff size={14} /> Anónimo</span>
                )}
              </div>
              {activeForum.description && <p>{activeForum.description}</p>}

              {/* Botón unirse / salir para foros con restricción */}
              {session && activeForum.type !== "public" && !activeForum.is_anonymous && !isAdmin && (
                memberOf.has(activeForum.id)
                  ? <button className="btn-secondary-sm" onClick={() => leaveForum(activeForum.id)}>Salir del foro</button>
                  : <button className="btn-primary-sm"   onClick={() => joinForum(activeForum.id)}>Unirse al foro</button>
              )}
            </div>

            {canPost && (
              <CreatePost
                section="community"
                forumId={activeForum.id}
                isAnonymousForum={activeForum.is_anonymous}
                onCreated={() => fetchPosts(activeForum.id)}
              />
            )}

            {!canAccessForum(activeForum) && (
              <div className="locked-forum">
                <Lock size={32} />
                <p>Este foro es privado. Necesitas una invitación para acceder.</p>
              </div>
            )}

            {loading ? (
              <div className="feed-loading"><Loader size={24} className="spin" /></div>
            ) : (
              canAccessForum(activeForum) && (
                <div className="feed">
                  {posts.map(post => (
                    <PostCard key={post.id} post={post}
                      onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />
                  ))}
                  {posts.length === 0 && (
                    <div className="empty-state"><p>Este foro no tiene publicaciones.</p></div>
                  )}
                </div>
              )
            )}
          </>
        ) : (
          <div className="empty-state"><p>Selecciona un foro para comenzar.</p></div>
        )}
      </main>
    </div>
  );
}
