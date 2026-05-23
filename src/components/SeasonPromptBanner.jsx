import { useThemeContext } from "../context/ThemeContext";

export default function SeasonPromptBanner({
  prompts,
  onTrack,
  onSnooze,
  onDismiss,
  busyId,
}) {
  const { styles } = useThemeContext();
  const { accent, border, textPrimary, textSec, textMuted, bgPanel } = styles;

  if (!prompts?.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      {prompts.map((prompt) => {
        const busy = busyId === prompt.id;
        const parentLabel = prompt.parent_title_en || "a show you track";
        const sequelLabel = prompt.sequel_title_en || parentLabel;
        const season = prompt.season_number || 2;
        const prevSeason = Math.max(1, season - 1);

        return (
          <div
            key={prompt.id}
            style={{
              display: "flex",
              gap: 14,
              padding: "14px 16px",
              background: bgPanel,
              border: `1px solid ${border}`,
              borderLeft: `3px solid ${accent}`,
            }}
          >
            {prompt.sequel_cover ? (
              <img
                src={prompt.sequel_cover}
                alt=""
                style={{ width: 48, height: 68, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
              />
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: accent,
                  marginBottom: 4,
                }}
              >
                NEW SEASON
              </div>
              <div style={{ fontSize: 13, color: textPrimary, fontWeight: 500, marginBottom: 4 }}>
                {sequelLabel}
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.55, color: textSec, margin: "0 0 6px" }}>
                You tracked Season {prevSeason} of <strong style={{ color: textPrimary }}>{parentLabel}</strong>.
                Season {season} is{" "}
                {prompt.sequel_status === "RELEASING" ? "airing now" : "coming soon"}.
              </p>
              {prompt.sequel_score != null ? (
                <div style={{ fontSize: 10, color: accent, marginBottom: 6 }}>
                  {prompt.sequel_score}% AniList score
                </div>
              ) : null}
              {prompt.sequel_synopsis ? (
                <p
                  style={{
                    fontSize: 10,
                    lineHeight: 1.5,
                    color: textMuted,
                    margin: "0 0 10px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {prompt.sequel_synopsis}
                </p>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onTrack(prompt)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 3,
                    cursor: busy ? "wait" : "pointer",
                    background: "#5cb85c",
                    color: "#fff",
                  }}
                >
                  Track Season {season}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSnooze(prompt)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 3,
                    cursor: busy ? "wait" : "pointer",
                    background: "#e8a838",
                    color: "#0d0d12",
                  }}
                >
                  Remind later
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDismiss(prompt)}
                  style={{
                    padding: "7px 14px",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    border: `1px solid ${border}`,
                    borderRadius: 3,
                    cursor: busy ? "wait" : "pointer",
                    background: "transparent",
                    color: textMuted,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
