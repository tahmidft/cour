import { useState, useEffect } from "react";

function useCountdown(targetMs) {
  const [remaining, setRemaining] = useState(targetMs ? targetMs - Date.now() : null);
  useEffect(() => {
    if (!targetMs) return;
    const tick = () => setRemaining(targetMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  if (!remaining || remaining <= 0) return null;
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export default function ShowRow({ show, index, accent, isDark, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const countdown = useCountdown(show.nextAiringAt);

  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textPrimary = isDark ? "#e8e6df" : "#0d0d12";
  const textMuted = isDark ? "#555" : "#aaa";
  const bg = isDark ? "#13131a" : "#ffffff";
  const bgHover = isDark ? "#1a1a28" : "#f5f5fb";

  const badgeStyle = {
    AIRING: { bg: `${accent}18`, color: accent, border: `0.5px solid ${accent}40` },
    FINISHED: {
      bg: isDark ? "#ffffff10" : "#00000008",
      color: textMuted,
      border: `0.5px solid ${borderColor}`,
    },
    UPCOMING: {
      bg: `${accent}10`,
      color: accent,
      border: `0.5px solid ${accent}30`,
      opacity: 0.8,
    },
  }[show.status] || {
    bg: isDark ? "#ffffff10" : "#00000008",
    color: textMuted,
    border: `0.5px solid ${borderColor}`,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 44px 1fr auto",
        borderBottom: `1px solid ${borderColor}`,
        background: "transparent",
        transition: "background 0.15s",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Layer 1: solid neutral base */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: hovered ? bgHover : bg,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Layer 2: blurred cover color wash on top of base */}
      {show.coverImage && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${show.coverImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center left",
            filter: isDark
              ? "blur(18px) saturate(1.4) brightness(0.30)"
              : "blur(18px) saturate(1.2) brightness(1.1)",
            transform: "scale(1.2)",
            opacity: isDark
              ? hovered ? 0.75 : 0.60
              : hovered ? 0.22 : 0.14,
            transition: "opacity 0.2s ease",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Row number */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          writingMode: "vertical-rl",
          fontSize: 9,
          color: textMuted,
          letterSpacing: "0.1em",
          borderRight: `1px solid ${borderColor}`,
          padding: "10px 0",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Cover art */}
      <div style={{ position: "relative", zIndex: 2, width: 44, minHeight: 64, flexShrink: 0 }}>
        {show.coverImage ? (
          <img
            src={show.coverImage}
            alt=""
            style={{ width: 44, height: "100%", minHeight: 64, objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: 44,
              minHeight: 64,
              height: "100%",
              background: isDark
                ? "linear-gradient(135deg, #1a1a24, #2a2a38)"
                : "linear-gradient(135deg, #e0e0ec, #f0f0f8)",
            }}
          />
        )}
      </div>

      {/* Info */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "9px 12px",
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.05em", marginBottom: 1 }}>
          {show.titleJp}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: textPrimary,
            marginBottom: 5,
            fontFamily: "'Noto Sans JP', sans-serif",
          }}
        >
          {show.titleEn}{" "}
          <span style={{ color: textMuted, fontWeight: 400 }}>{show.season}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 8,
              padding: "2px 7px",
              letterSpacing: "0.06em",
              background: badgeStyle.bg,
              color: badgeStyle.color,
              border: badgeStyle.border,
              opacity: badgeStyle.opacity || 1,
            }}
          >
            {show.status}
          </span>
          {show.airDay && (
            <span style={{ fontSize: 9, color: textMuted }}>{show.airDay}</span>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "9px 14px",
          textAlign: "right",
          minWidth: 100,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {countdown ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: accent, fontFamily: "monospace" }}>
              {countdown}
            </div>
            <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>
              ep {show.episode + 1} drops
            </div>
          </>
        ) : show.status === "FINISHED" ? (
          <div style={{ fontSize: 11, color: textMuted }}>completed</div>
        ) : (
          <div style={{ fontSize: 11, color: accent, opacity: 0.7 }}>TBA</div>
        )}
        <div style={{ fontSize: 9, color: textMuted, marginTop: 4 }}>
          {show.totalEpisodes
            ? `${show.episode} / ${show.totalEpisodes} eps`
            : "new season"}
        </div>
      </div>

      {hovered && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(show.id);
          }}
          style={{
            position: "absolute",
            zIndex: 2,
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 9,
            padding: "4px 8px",
            background: "rgba(200,34,42,0.15)",
            color: "#c8222a",
            border: "1px solid rgba(200,34,42,0.3)",
            cursor: "pointer",
            letterSpacing: "0.08em",
          }}
        >
          REMOVE
        </button>
      )}
    </div>
  );
}

export function ShowRowSkeleton({ isDark }) {
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const bg = isDark ? "#13131a" : "#fff";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 44px 1fr auto",
        borderBottom: `1px solid ${borderColor}`,
        background: bg,
        opacity: 0.6,
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ padding: 16, background: isDark ? "#1a1a24" : "#eee" }} />
      ))}
    </div>
  );
}
