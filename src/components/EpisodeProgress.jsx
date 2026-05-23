import { useState, useEffect } from "react";
import { useThemeContext } from "../context/ThemeContext";

export default function EpisodeProgress({
  show,
  onUpdate,
  compact = false,
  accent,
  isDark,
}) {
  const { styles } = useThemeContext();
  const { border, textPrimary, textMuted, textSec } = styles;

  const watched = show.episodesWatched ?? 0;
  const total = show.totalEpisodes;
  const hasTotal = typeof total === "number" && total > 0;
  const value = hasTotal ? Math.min(Math.max(0, watched), total) : Math.max(0, watched);
  const pct = hasTotal && total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commitDraft(raw) {
    const next = Math.max(0, Math.floor(Number(raw) || 0));
    const capped = hasTotal ? Math.min(next, total) : next;
    onUpdate?.(capped);
    setDraft(String(capped));
  }

  function handleBlur() {
    commitDraft(draft);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft(draft);
      e.currentTarget.blur();
    }
  }

  const btn = {
    fontSize: 9,
    padding: compact ? "4px 8px" : "6px 12px",
    letterSpacing: "0.08em",
    background: "transparent",
    border: `1px solid ${border}`,
    color: textSec,
    cursor: "pointer",
  };

  const inputStyle = {
    width: hasTotal && total >= 1000 ? 56 : hasTotal && total >= 100 ? 48 : 40,
    fontSize: 12,
    fontFamily: "monospace",
    padding: "6px 8px",
    background: isDark ? "#0d0d12" : "#fff",
    border: `1px solid ${border}`,
    color: textPrimary,
    textAlign: "center",
  };

  return (
    <div style={{ marginTop: compact ? 0 : 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: compact ? 9 : 10,
            letterSpacing: "0.12em",
            color: textPrimary,
            fontWeight: 500,
          }}
        >
          YOUR PROGRESS
        </span>
        {hasTotal && (
          <span style={{ fontSize: compact ? 10 : 11, color: accent, fontFamily: "monospace" }}>
            {pct}%
          </span>
        )}
      </div>

      {hasTotal && (
        <div
          style={{
            height: 4,
            background: isDark ? "#1e1e28" : "#e8e8ef",
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: accent,
              transition: "width 0.2s ease",
            }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: compact ? 8 : 12,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "text" }}>
          <span style={{ fontSize: 9, color: textMuted, letterSpacing: "0.08em" }}>EP</span>
          <input
            type="number"
            min={0}
            max={hasTotal ? total : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label={hasTotal ? `Episodes watched out of ${total}` : "Episodes watched"}
            style={inputStyle}
          />
          {hasTotal ? (
            <span style={{ fontSize: 12, color: textMuted, fontFamily: "monospace" }}>
              / {total}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: textMuted }}>watched</span>
          )}
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {hasTotal && (
          <>
            <button type="button" style={btn} onClick={() => commitDraft(total)}>
              Mark complete
            </button>
            <button type="button" style={{ ...btn, color: textMuted }} onClick={() => commitDraft(0)}>
              Reset
            </button>
          </>
        )}
        {!hasTotal && (
          <button type="button" style={{ ...btn, color: textMuted }} onClick={() => commitDraft(0)}>
            Reset
          </button>
        )}
      </div>

      {!compact && (
        <p style={{ fontSize: 10, color: textMuted, margin: "12px 0 0", lineHeight: 1.5 }}>
          Manual tracking only — Cour cannot see what you watch on streaming sites. AniList/MAL
          account sync would be a future upgrade for automatic progress.
        </p>
      )}
    </div>
  );
}
