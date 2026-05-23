import { useState, useEffect, useRef } from "react";
import { searchAnime } from "../lib/anilist";
import { useThemeContext } from "../context/ThemeContext";
import toast from "react-hot-toast";

export default function ShowSearch({ onAdd, onClose, trackedAnilistIds = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(null);
  const inputRef = useRef(null);
  const { styles, isDark } = useThemeContext();
  const { accent, bg, bgPanel, border, textPrimary, textMuted, textSec } = styles;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const media = await searchAnime(query);
        setResults(media);
      } catch {
        toast.error("Search failed");
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(id);
  }, [query]);

  async function handleTrack(media) {
    if (trackedAnilistIds.includes(media.id)) return;
    setTracking(media.id);
    const err = await onAdd(media);
    setTracking(null);
    if (err) toast.error(err.message || "Could not add show");
    else toast.success(`Now tracking ${media.title.english || media.title.romaji}`);
  }

  const statusColor = (status) => {
    if (status === "RELEASING") return accent;
    if (status === "FINISHED") return textMuted;
    return accent;
  };

  return (
    <div
      className="show-search-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        padding: 24,
      }}
    >
      <div
        className="show-search-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
          background: bgPanel,
          border: `1px solid ${border}`,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime..."
            style={{
              flex: 1,
              padding: "12px 14px",
              fontSize: 14,
              background: isDark ? "#0d0d12" : "#f5f5f7",
              border: `1px solid ${border}`,
              color: textPrimary,
              outline: "none",
              letterSpacing: "0.05em",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              flexShrink: 0,
              fontSize: 16,
              lineHeight: 1,
              padding: "8px 12px",
              background: "transparent",
              color: textMuted,
              border: `1px solid ${border}`,
              cursor: "pointer",
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
          {loading && (
            <div style={{ padding: 24, textAlign: "center", color: textMuted, fontSize: 12 }}>
              Searching...
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: textMuted, fontSize: 12 }}>
              No results
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {results.map((media) => {
              const tracked = trackedAnilistIds.includes(media.id);
              return (
                <div
                  key={media.id}
                  style={{
                    border: `1px solid ${border}`,
                    background: isDark ? "#13131a" : "#fff",
                    display: "flex",
                    gap: 10,
                    padding: 10,
                  }}
                >
                  {media.coverImage?.large && (
                    <img
                      src={media.coverImage.large}
                      alt=""
                      style={{ width: 48, height: 68, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: textMuted }}>{media.title.native}</div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      {media.title.english || media.title.romaji}
                    </div>
                    <div style={{ fontSize: 8, color: statusColor(media.status) }}>
                      {media.status} · {media.seasonYear || "—"}
                    </div>
                    <button
                      type="button"
                      disabled={tracked || tracking === media.id}
                      onClick={() => handleTrack(media)}
                      style={{
                        marginTop: 8,
                        fontSize: 9,
                        padding: "4px 10px",
                        letterSpacing: "0.08em",
                        background: tracked ? "transparent" : `${accent}22`,
                        color: tracked ? textMuted : accent,
                        border: `1px solid ${tracked ? border : accent}`,
                        cursor: tracked ? "default" : "pointer",
                      }}
                    >
                      {tracked ? "Tracking ✓" : tracking === media.id ? "..." : "Track"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: 10,
            borderTop: `1px solid ${border}`,
            fontSize: 9,
            color: textSec,
            textAlign: "center",
          }}
        >
          ESC or ✕ to close · click outside to dismiss
        </div>
      </div>
    </div>
  );
}
