import { useThemeContext } from "../context/ThemeContext";

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

export default function DiscoverDetailPanel({ media, detail, loading, accent, isDark }) {
  const { styles } = useThemeContext();
  const { border, textPrimary, textMuted, textSec, soft } = styles;

  const description = stripMarkup(detail?.description);
  const studios = detail?.studios?.nodes?.map((s) => s.name).filter(Boolean) ?? [];
  const topTags = (detail?.tags ?? [])
    .filter((t) => t.rank >= 60)
    .slice(0, 6)
    .map((t) => t.name);
  const genres = detail?.genres?.length ? detail.genres : media?.genres ?? [];
  const titleEn = media?.title?.english || media?.title?.romaji;
  const titleJp = media?.title?.native;
  const meanScore = detail?.meanScore ?? media?.meanScore;

  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div
      className="discover-detail-panel"
      style={{
        borderLeft: `1px solid ${borderColor}`,
        background: isDark ? "#0f0f14" : "#f8f8fc",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
        flex: 1,
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
            filter: "blur(20px) brightness(0.35)",
            transform: "scale(1.08)",
            opacity: isDark ? 0.85 : 0.45,
          }}
        />
      )}

      <div
        className="discover-detail-inner"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "14px 16px 16px",
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.12em", marginBottom: 4 }}>
          {titleJp || "\u00a0"}
        </div>
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 15,
            fontWeight: 600,
            color: textPrimary,
            fontFamily: "'Noto Sans JP', sans-serif",
            lineHeight: 1.25,
          }}
        >
          {titleEn}
        </h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, fontSize: 10 }}>
          {media?.similarity != null && (
            <span style={{ color: accent, fontFamily: "monospace" }}>
              {Math.round(media.similarity)}% match
            </span>
          )}
          {detail?.status && <span style={{ color: accent }}>{detail.status}</span>}
          {detail?.format && <span style={{ color: textSec }}>{detail.format}</span>}
          {(detail?.episodes || media?.episodes) && (
            <span style={{ color: textSec }}>
              {(detail?.episodes ?? media?.episodes)} episodes
            </span>
          )}
          {meanScore && (
            <span style={{ color: accent, fontFamily: "monospace" }}>{meanScore}%</span>
          )}
          {studios.length > 0 && (
            <span style={{ color: textMuted }}>{studios.join(" · ")}</span>
          )}
        </div>

        {genres.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {genres.map((g) => (
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
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
          <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>Loading synopsis…</p>
        )}

        {description && (
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.6,
              color: textSec,
              margin: 0,
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            {description}
          </p>
        )}

        {!loading && !description && detail && (
          <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>No synopsis available.</p>
        )}
      </div>
    </div>
  );
}
