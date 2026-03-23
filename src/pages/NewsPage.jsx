import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import CreatePost from "../components/feed/CreatePost.jsx";
import { Plus, X, Loader, School } from "lucide-react";

export default function NewsPage() {
  const { session, isAdmin, isManager, profile } = useAuth();
  const [groups,       setGroups]       = useState([]);
  const [activeGroup,  setActiveGroup]  = useState(null);
  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating,     setCreating]     = useState(false);

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => { if (activeGroup) fetchPosts(activeGroup.id); }, [activeGroup]);

  async function fetchGroups() {
    const { data } = await supabase.from("groups").select("*").order("name");
    setGroups(data ?? []);
    if (data?.length) setActiveGroup(data[0]);
  }

  async function fetchPosts(groupId) {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(alias, avatar_url, theme_color, role)")
      .eq("section", "news")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: newGroupName.trim(), created_by: session.user.id })
      .select()
      .single();
    if (!error) {
      setGroups(prev => [...prev, data]);
      setActiveGroup(data);
      setNewGroupName("");
      setShowNewGroup(false);
    }
    setCreating(false);
  }

  // ¿Puede publicar en el grupo activo?
  const canPost = session && (
    isAdmin ||
    (isManager && activeGroup && groups.some(g => g.id === activeGroup.id))
  );

  return (
    <div className="page-container news-layout">
      {/* Sidebar de grupos */}
      <aside className="groups-sidebar">
        <div className="sidebar-header">
          <h2>Instituciones</h2>
          {isAdmin && (
            <button className="icon-btn" onClick={() => setShowNewGroup(v => !v)} title="Nueva institución">
              {showNewGroup ? <X size={18} /> : <Plus size={18} />}
            </button>
          )}
        </div>

        {showNewGroup && (
          <div className="new-group-form">
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Nombre de la institución"
              className="form-input"
              onKeyDown={e => e.key === "Enter" && createGroup()}
            />
            <button className="btn-primary" onClick={createGroup} disabled={creating}>
              {creating ? <Loader size={14} className="spin" /> : "Crear"}
            </button>
          </div>
        )}

        <div className="groups-list">
          {groups.map(g => (
            <button
              key={g.id}
              className={`group-item ${activeGroup?.id === g.id ? "group-item-active" : ""}`}
              onClick={() => setActiveGroup(g)}
            >
              <div className="group-icon"><School size={16} /></div>
              <span>{g.name}</span>
            </button>
          ))}
          {groups.length === 0 && (
            <p className="sidebar-empty">No hay instituciones creadas.</p>
          )}
        </div>
      </aside>

      {/* Feed del grupo activo */}
      <main className="news-feed">
        {activeGroup ? (
          <>
            <div className="news-feed-header">
              <h1>{activeGroup.name}</h1>
              {activeGroup.description && <p>{activeGroup.description}</p>}
            </div>

            {canPost && (
              <CreatePost
                section="news"
                groupId={activeGroup.id}
                onCreated={() => fetchPosts(activeGroup.id)}
              />
            )}

            {loading ? (
              <div className="feed-loading"><Loader size={24} className="spin" /></div>
            ) : (
              <div className="feed">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />
                ))}
                {posts.length === 0 && (
                  <div className="empty-state">
                    <p>Esta institución no tiene publicaciones aún.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <School size={48} />
            <p>Selecciona una institución para ver sus novedades.</p>
          </div>
        )}
      </main>
    </div>
  );
}
