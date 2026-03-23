import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { sanitizeText, rateLimit, containsScript, truncate } from "../../lib/security.js";
import { SITE_CONFIG } from "../../config/site.config.js";
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function PostCard({ post, onDelete }) {
  const { session, profile, isAdmin, isManager } = useAuth();
  const [likes,       setLikes]       = useState([]);
  const [comments,    setComments]    = useState([]);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  const isAnon = post.is_anonymous;
  const author = isAnon && !isAdmin ? null : post.profiles;

  useEffect(() => {
    fetchLikes();
    if (showComments) fetchComments();
  }, [showComments]);

  async function fetchLikes() {
    const { data } = await supabase
      .from("reactions")
      .select("user_id")
      .eq("post_id", post.id);
    setLikes(data ?? []);
  }

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(alias, avatar_url, theme_color, role)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }

  async function toggleLike() {
    if (!session) return;
    const already = likes.find(l => l.user_id === session.user.id);
    if (already) {
      await supabase.from("reactions").delete()
        .eq("post_id", post.id).eq("user_id", session.user.id);
    } else {
      await supabase.from("reactions").insert({ post_id: post.id, user_id: session.user.id, type: "like" });
    }
    fetchLikes();
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!session || !commentText.trim()) return;
    setError("");

    if (containsScript(commentText)) { setError("Contenido no permitido."); return; }
    if (!rateLimit(session.user.id + "comment", 20, 60_000)) {
      setError("Demasiados comentarios en poco tiempo."); return;
    }

    setSubmitting(true);
    const clean = sanitizeText(truncate(commentText, SITE_CONFIG.maxCommentLength));
    const { error: err } = await supabase.from("comments").insert({
      post_id:      post.id,
      author_id:    session.user.id,
      content:      clean,
      is_anonymous: post.forum?.is_anonymous ?? false,
    });
    if (err) setError(err.message);
    else { setCommentText(""); fetchComments(); }
    setSubmitting(false);
  }

  async function deleteComment(commentId) {
    await supabase.from("comments").delete().eq("id", commentId);
    fetchComments();
  }

  async function deletePost() {
    if (!window.confirm("¿Borrar esta publicación?")) return;
    await supabase.from("posts").delete().eq("id", post.id);
    onDelete?.(post.id);
  }

  const liked = likes.some(l => l.user_id === session?.user.id);
  const canDelete = session && (
    post.author_id === session.user.id || isAdmin ||
    (isManager && post.section === "news")
  );

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es });

  return (
    <article className="post-card">
      {/* Cabecera del post */}
      <div className="post-header">
        <div className="post-author">
          {author ? (
            <Link to={`/perfil/${author.alias}`} className="author-link">
              <div
                className="avatar-medium"
                style={{
                  backgroundImage: author.avatar_url ? `url(${author.avatar_url})` : "none",
                  backgroundColor: author.theme_color ?? "#2563eb",
                }}
              >
                {!author.avatar_url && author.alias?.[0]?.toUpperCase()}
              </div>
              <div>
                <span className="author-alias">{author.alias}</span>
                {author.role !== "user" && (
                  <span className={`role-badge role-${author.role}`}>
                    {SITE_CONFIG.roles[author.role?.toUpperCase()]?.label}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div className="author-link">
              <div className="avatar-medium avatar-anon">?</div>
              <span className="author-alias">Anónimo</span>
            </div>
          )}
        </div>
        <div className="post-meta">
          <span className="post-time">{timeAgo}</span>
          {canDelete && (
            <button className="icon-btn danger-btn" onClick={deletePost} title="Borrar publicación">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="post-content">
        <p>{post.content}</p>
        {post.media_url && (
          <div className="post-media">
            {post.media_url.match(/\.(mp4|webm)$/i)
              ? <video src={post.media_url} controls className="post-video" />
              : <img src={post.media_url} alt="Imagen del post" className="post-image" />
            }
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="post-actions">
        <button
          className={`action-btn ${liked ? "action-liked" : ""}`}
          onClick={toggleLike}
          disabled={!session}
          title={!session ? "Inicia sesión para reaccionar" : ""}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          <span>{likes.length}</span>
        </button>

        <button className="action-btn" onClick={() => setShowComments(v => !v)}>
          <MessageCircle size={18} />
          <span>{comments.length || post.comments_count || 0}</span>
          {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Sección de comentarios */}
      {showComments && (
        <div className="comments-section">
          {comments.map(c => {
            const cAuthor = c.is_anonymous && !isAdmin ? null : c.profiles;
            const canDelC = session && (c.author_id === session.user.id || isAdmin || isManager);
            return (
              <div className="comment" key={c.id}>
                <div
                  className="comment-avatar"
                  style={{
                    backgroundColor: cAuthor?.theme_color ?? "#64748b",
                    backgroundImage: cAuthor?.avatar_url ? `url(${cAuthor.avatar_url})` : "none",
                  }}
                >
                  {!cAuthor?.avatar_url && (cAuthor?.alias?.[0]?.toUpperCase() ?? "?")}
                </div>
                <div className="comment-body">
                  <span className="comment-alias">{cAuthor?.alias ?? "Anónimo"}</span>
                  <p className="comment-text">{c.content}</p>
                </div>
                {canDelC && (
                  <button className="icon-btn danger-btn" onClick={() => deleteComment(c.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {session ? (
            <form className="comment-form" onSubmit={submitComment}>
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Escribe un comentario…"
                maxLength={SITE_CONFIG.maxCommentLength}
                className="comment-input"
              />
              <button type="submit" className="btn-icon-primary" disabled={submitting || !commentText.trim()}>
                <Send size={16} />
              </button>
            </form>
          ) : (
            <p className="comment-login-hint">
              <Link to="/auth">Inicia sesión</Link> para comentar.
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </article>
  );
}
