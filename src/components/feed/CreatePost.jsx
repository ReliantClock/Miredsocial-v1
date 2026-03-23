import { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../lib/supabase.js";
import { StorageService } from "../../lib/storage/storageAdapter.js";
import { sanitizeText, rateLimit, containsScript, truncate } from "../../lib/security.js";
import { SITE_CONFIG } from "../../config/site.config.js";
import { Image, X, Loader } from "lucide-react";

export default function CreatePost({ section = "home", groupId = null, forumId = null, isAnonymousForum = false, onCreated }) {
  const { session, profile } = useAuth();
  const [content,    setContent]    = useState("");
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const fileRef = useRef(null);

  if (!session) return null;

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > SITE_CONFIG.maxFileSizeMB * 1024 * 1024) {
      setError(`El archivo supera ${SITE_CONFIG.maxFileSizeMB} MB.`); return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  function removeFile() { setFile(null); setPreview(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && !file) return;
    if (containsScript(content)) { setError("Contenido no permitido."); return; }
    if (!rateLimit(session.user.id + "post", 10, 60_000)) {
      setError("Demasiadas publicaciones en poco tiempo."); return;
    }

    setLoading(true);
    setError("");

    try {
      let mediaUrl = null;
      if (file) {
        mediaUrl = await StorageService.upload(file, `posts/${session.user.id}`);
      }

      const { error: err } = await supabase.from("posts").insert({
        author_id:    session.user.id,
        section,
        group_id:     groupId,
        forum_id:     forumId,
        content:      sanitizeText(truncate(content, SITE_CONFIG.maxPostLength)),
        media_url:    mediaUrl,
        is_anonymous: isAnonymousForum,
      });

      if (err) throw err;
      setContent(""); setFile(null); setPreview(null);
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const remaining = SITE_CONFIG.maxPostLength - content.length;

  return (
    <div className="create-post">
      <div
        className="create-post-avatar"
        style={{
          backgroundColor: profile?.theme_color ?? "#2563eb",
          backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : "none",
        }}
      >
        {!profile?.avatar_url && profile?.alias?.[0]?.toUpperCase()}
      </div>

      <form className="create-post-form" onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={isAnonymousForum ? "Publica de forma anónima…" : "¿Qué quieres compartir?"}
          maxLength={SITE_CONFIG.maxPostLength}
          className="create-post-textarea"
          rows={3}
        />

        {preview && (
          <div className="create-post-preview">
            <img src={preview} alt="Vista previa" />
            <button type="button" className="remove-preview" onClick={removeFile}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="create-post-footer">
          <div className="create-post-tools">
            <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} title="Adjuntar imagen">
              <Image size={20} />
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/mp4" hidden onChange={handleFile} />
            <span className={`char-count ${remaining < 50 ? "char-warn" : ""}`}>{remaining}</span>
          </div>
          <button type="submit" className="btn-primary" disabled={loading || (!content.trim() && !file)}>
            {loading ? <Loader size={16} className="spin" /> : "Publicar"}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
