import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/feed/PostCard.jsx";
import CreatePost from "../components/feed/CreatePost.jsx";
import { Loader } from "lucide-react";

export default function HomePage() {
  const { session } = useAuth();
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;

  const fetchPosts = useCallback(async (reset = false) => {
    setLoading(true);
    const from = reset ? 0 : page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(alias, avatar_url, theme_color, role)")
      .eq("section", "home")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!error) {
      setPosts(prev => reset ? (data ?? []) : [...prev, ...(data ?? [])]);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
      if (!reset) setPage(p => p + 1);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchPosts(true); }, []);

  function handleDelete(id) {
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="page-container">
      {session && (
        <CreatePost section="home" onCreated={() => fetchPosts(true)} />
      )}

      <div className="feed">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onDelete={handleDelete} />
        ))}

        {loading && (
          <div className="feed-loading">
            <Loader size={24} className="spin" />
          </div>
        )}

        {!loading && hasMore && (
          <button className="load-more-btn" onClick={() => fetchPosts(false)}>
            Cargar más
          </button>
        )}

        {!loading && posts.length === 0 && (
          <div className="empty-state">
            <p>No hay publicaciones aún. ¡Sé el primero!</p>
          </div>
        )}
      </div>
    </div>
  );
}
