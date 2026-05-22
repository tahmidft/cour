import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useThemeContext } from "../context/ThemeContext";
import Ticker from "./Ticker";
import ThemePicker from "./ThemePicker";
import ShowSearch from "./ShowSearch";
import { buildTickerItems, mapTrackedShow } from "../lib/showUtils";
import { useTrackedShowsContext } from "../context/TrackedShowsContext";
import { dayFromAiringAt } from "../lib/showUtils";

const TABS = [
  { key: "TRACKING", label: "TRACKING", path: "/dashboard" },
  { key: "CALENDAR", label: "CALENDAR", path: "/dashboard/calendar" },
  { key: "DISCOVER", label: "DISCOVER", path: "/dashboard/discover" },
  { key: "SETTINGS", label: "SETTINGS", path: "/dashboard/settings" },
];

export default function Layout({ activeTab, children, stats }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    theme,
    accentKey,
    isDark,
    styles,
    setTheme,
    setAccentKey,
  } = useThemeContext();
  const { accent, soft, bg, bgPanel, border, textPrimary, textSec, textMuted } = styles;

  const { shows, addShow, refetch } = useTrackedShowsContext();
  const mapped = shows.map(mapTrackedShow);
  const tickerItems = buildTickerItems(mapped);

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const nextEpDay = (() => {
    const airing = mapped
      .filter((s) => s.nextAiringAt && s.rawStatus === "RELEASING")
      .sort((a, b) => a.nextAiringAt - b.nextAiringAt)[0];
    return airing ? dayFromAiringAt(airing.nextAiringAt)?.slice(0, 3) || "—" : "—";
  })();

  const defaultStats = [
    { val: mapped.length, label: "tracking" },
    { val: mapped.filter((s) => s.rawStatus === "RELEASING").length, label: "airing" },
    { val: nextEpDay, label: "next ep" },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div
      style={{
        fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif",
        background: bg,
        minHeight: "100vh",
        color: textPrimary,
      }}
    >
      <style>{`
        ::-webkit-scrollbar-thumb { background: ${border}; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderBottom: `1px solid ${border}`,
          background: bgPanel,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          to="/dashboard"
          style={{
            padding: "10px 20px",
            borderRight: `1px solid ${border}`,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20,
              letterSpacing: "0.1em",
              lineHeight: 1,
            }}
          >
            COUR
          </div>
          <div style={{ fontSize: 9, color: accent, letterSpacing: "0.2em" }}>クール</div>
        </Link>

        {TABS.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            style={{
              padding: "0 16px",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: activeTab === tab.key ? textPrimary : textMuted,
              borderRight: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              position: "relative",
              textDecoration: "none",
            }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: accent,
                }}
              />
            )}
          </Link>
        ))}

        <div style={{ marginLeft: "auto", display: "flex" }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => { refetch(); setShowSearch(true); }}
            style={{
              padding: "0 16px",
              borderLeft: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              fontSize: 10,
              color: accent,
              letterSpacing: "0.1em",
            }}
          >
            + SEARCH
          </div>

          {displayStats.map(({ val, label }) => (
            <div
              key={label}
              style={{
                padding: "0 16px",
                borderLeft: `1px solid ${border}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: textPrimary,
                }}
              >
                {val}
              </div>
              <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.08em" }}>
                {label}
              </div>
            </div>
          ))}

          <ThemePicker
            theme={theme}
            accentKey={accentKey}
            isDark={isDark}
            accent={accent}
            border={border}
            bgPanel={bgPanel}
            textPrimary={textPrimary}
            textSec={textSec}
            textMuted={textMuted}
            open={showThemePicker}
            onToggle={() => setShowThemePicker((p) => !p)}
            onSetTheme={(t) => {
              setTheme(t);
              setShowThemePicker(false);
            }}
            onSetAccent={(k) => setAccentKey(k)}
          />
        </div>
      </div>

      <Ticker accent={accent} items={tickerItems} />

      {children}

      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          fontSize: 11,
          color: textMuted,
          letterSpacing: "0.05em",
          borderTop: `1px solid ${border}`,
          background: bgPanel,
        }}
      >
        made with ❤️ by a weeb
      </div>

      {showSearch && (
        <ShowSearch
          trackedAnilistIds={shows.map((s) => s.anilist_id)}
          onAdd={async (media) => {
            const err = await addShow(media);
            if (!err) {
              await refetch();
              navigate("/dashboard");
            }
            return err;
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
