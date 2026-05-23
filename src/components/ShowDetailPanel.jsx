import { useThemeContext } from "../context/ThemeContext";
import EpisodeProgress from "./EpisodeProgress";

function stripMarkup(text) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

export default function ShowDetailPanel({
  show,
  detail,
  loading,
  accent,
  isDark,
  onWatchUpdate,
}) {
  const { styles } = useThemeContext();
  const { border, textPrimary, textMuted, textSec, soft } = styles;

  const description = stripMarkup(detail?.description);
  const studios = detail?.studios?.nodes?.map((s) => s.name).filter(Boolean) ?? [];
  const topTags = (detail?.tags ?? [])
    .filter((t) => t.rank >= 60)
    .slice(0, 6)
    .map((t) => t.name);

  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div
      className="show-detail-panel"
      style={{
        gridColumn: "1 / -1",
        borderBottom: `1px solid ${borderColor}`,
        background: isDark ? "#0f0f14" : "#f8f8fc",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {detail?.bannerImage && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${detail.bannerImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(24px) brightness(0.35)",
            transform: "scale(1.1)",
            opacity: isDark ? 0.9 : 0.5,
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(120px, 160px) 1fr",
          gap: 20,
          padding: "20px 20px 24px 56px",
        }}
        className="show-detail-inner"
      >
        <div>
          {show.coverImage ? (
            <img
              src={show.coverImage}
              alt=""
              style={{
                width: "100%",
                maxWidth: 160,
                aspectRatio: "2/3",
                objectFit: "cover",
                border: `1px solid ${border}`,
              }}
            />
          ) : null}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.12em", marginBottom: 4 }}>
            {show.titleJp}
          </div>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 18,
              fontWeight: 600,
              color: textPrimary,
              fontFamily: "'Noto Sans JP', sans-serif",
            }}
          >
            {show.titleEn}
          </h3>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, fontSize: 10 }}>
            <span style={{ color: accent }}>{show.status}</span>
            {detail?.format && <span style={{ color: textSec }}>{detail.format}</span>}
            {detail?.episodes && (
              <span style={{ color: textSec }}>{detail.episodes} episodes</span>
            )}
            {detail?.meanScore && (
              <span style={{ color: accent, fontFamily: "monospace" }}>{detail.meanScore}%</span>
            )}
            {studios.length > 0 && (
              <span style={{ color: textMuted }}>{studios.join(" · ")}</span>
            )}
          </div>

          <EpisodeProgress
            show={show}
            onUpdate={onWatchUpdate}
            accent={accent}
            isDark={isDark}
          />

          {(show.genres?.length > 0 || detail?.genres?.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, marginTop: 12 }}>
              {(detail?.genres || show.genres || []).map((g) => (
                <span
                  key={g}
                  style={{
                    fontSize: 8,
                    padding: "3px 8px",
                    background: soft,
                    color: accent,
                    letterSpacing: "0.06em",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {topTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {topTags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 8,
                    padding: "2px 6px",
                    border: `1px solid ${border}`,
                    color: textMuted,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {loading && !description && (
            <p style={{ fontSize: 12, color: textMuted, margin: "12px 0 0" }}>Loading synopsis…</p>
          )}

          {description && (
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.65,
                color: textSec,
                margin: "12px 0 0",
                maxHeight: 140,
                overflow: "auto",
              }}
            >
              {description}
            </p>
          )}

          {!loading && !description && (
            <p style={{ fontSize: 12, color: textMuted, margin: "12px 0 0" }}>
              Synopsis will appear once prefetch completes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
