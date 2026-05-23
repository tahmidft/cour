import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useThemeContext } from "../context/ThemeContext";
import Ticker from "./Ticker";
import ThemePicker from "./ThemePicker";
import ShowSearch from "./ShowSearch";
import { buildTickerItems, mapTrackedShow } from "../lib/showUtils";
import { useTrackedShowsContext } from "../context/TrackedShowsContext";
import { dayFromAiringAt } from "../lib/showUtils";

const TABS = [
  { key: "TRACKING", label: "TRACKING", short: "List", path: "/dashboard", icon: "list" },
  { key: "CALENDAR", label: "CALENDAR", short: "Calendar", path: "/dashboard/calendar", icon: "calendar" },
  { key: "DISCOVER", label: "DISCOVER", short: "Discover", path: "/dashboard/discover", icon: "discover" },
  { key: "SETTINGS", label: "SETTINGS", short: "Settings", path: "/dashboard/settings", icon: "settings" },
];

function TabIcon({ type, active, accent, muted }) {
  const stroke = active ? accent : muted;
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (type) {
    case "calendar":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "discover":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
  }
}

function NavTab({ tab, activeTab, border, accent, textPrimary, textMuted, mobile = false }) {
  const active = activeTab === tab.key;
  if (mobile) {
    return (
      <Link
        to={tab.path}
        className={active ? "layout-nav-active" : undefined}
        aria-current={active ? "page" : undefined}
      >
        <span className="layout-tab-icon">
          <TabIcon type={tab.icon} active={active} accent={accent} muted={textMuted} />
        </span>
        <span className="layout-tab-label">{tab.short}</span>
      </Link>
    );
  }

  return (
    <Link
      to={tab.path}
      className={active ? "layout-nav-active" : undefined}
      style={{
        padding: mobile ? undefined : "0 16px",
        fontSize: mobile ? undefined : 10,
        letterSpacing: "0.12em",
        color: active ? textPrimary : textMuted,
        borderRight: mobile ? "none" : `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        position: "relative",
        textDecoration: "none",
      }}
    >
      {tab.label}
      {active && (
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
  );
}

export default function Layout({ activeTab, children, stats }) {
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

  const cssVars = {
    "--cour-accent": accent,
    "--cour-soft": soft,
    "--cour-border": border,
    "--cour-bg-panel": bgPanel,
    "--cour-text-primary": textPrimary,
    "--cour-text-muted": textMuted,
  };

  return (
    <div
      className="layout-root"
      style={{
        fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif",
        background: bg,
        minHeight: "100vh",
        color: textPrimary,
        ...cssVars,
      }}
    >
      <style>{`
        ::-webkit-scrollbar-thumb { background: ${border}; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <header
        className="layout-header"
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
          className="layout-logo"
          style={{
            padding: "10px 20px",
            borderRight: `1px solid ${border}`,
            textDecoration: "none",
            color: "inherit",
            flexShrink: 0,
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

        <nav className="layout-tabs layout-tabs--desktop" style={{ display: "flex" }}>
          {TABS.map((tab) => (
            <NavTab
              key={tab.key}
              tab={tab}
              activeTab={activeTab}
              border={border}
              accent={accent}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
          ))}
        </nav>

        <div className="layout-actions" style={{ marginLeft: "auto", display: "flex" }}>
          <div
            role="button"
            tabIndex={0}
            className="layout-search"
            onClick={() => {
              refetch();
              setShowSearch(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                refetch();
                setShowSearch(true);
              }
            }}
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

          <div className="layout-header-stats" style={{ display: "flex" }}>
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
          </div>

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
      </header>

      <Ticker accent={accent} items={tickerItems} />

      <main className="layout-main">{children}</main>

      <nav className="layout-bottom-nav" style={{ display: "none" }} aria-label="Main">
        {TABS.map((tab) => (
          <NavTab
            key={tab.key}
            tab={tab}
            activeTab={activeTab}
            border={border}
            accent={accent}
            textPrimary={textPrimary}
            textMuted={textMuted}
            mobile
          />
        ))}
      </nav>

      <div
        className="layout-footer"
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
