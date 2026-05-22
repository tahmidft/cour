import { ACCENTS } from "../hooks/useTheme";

export default function ThemePicker({
  theme,
  accentKey,
  isDark,
  accent,
  border,
  bgPanel,
  textPrimary,
  textSec,
  textMuted,
  onSetTheme,
  onSetAccent,
  open,
  onToggle,
}) {
  const accentKeys = Object.keys(ACCENTS[theme]);

  return (
    <div
      onClick={onToggle}
      style={{
        padding: "0 16px",
        borderLeft: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        fontSize: 10,
        color: textSec,
        letterSpacing: "0.1em",
        gap: 6,
        position: "relative",
      }}
    >
      {isDark ? "◑" : "○"} THEME
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: bgPanel,
            border: `1px solid ${border}`,
            padding: 14,
            zIndex: 100,
            minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: textMuted,
              letterSpacing: "0.15em",
              marginBottom: 8,
            }}
          >
            MODE
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["dark", "light"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSetTheme(t)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  background: theme === t ? accent : "transparent",
                  color: theme === t ? (isDark ? "#000" : "#fff") : textSec,
                  border: `1px solid ${theme === t ? accent : border}`,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div
            style={{
              fontSize: 9,
              color: textMuted,
              letterSpacing: "0.15em",
              marginBottom: 8,
            }}
          >
            ACCENT
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {accentKeys.map((k) => (
              <div
                key={k}
                role="button"
                tabIndex={0}
                onClick={() => onSetAccent(k)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: ACCENTS[theme][k].accent,
                  border:
                    accentKey === k ? `2px solid ${textPrimary}` : "2px solid transparent",
                  cursor: "pointer",
                }}
                title={k}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
