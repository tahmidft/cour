import { useState, useEffect, useRef } from "react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_SHOWS = [
  {
    id: 1,
    titleJp: "鬼滅の刃",
    titleEn: "Demon Slayer",
    season: "S4",
    status: "AIRING",
    airDay: "Every WED",
    episode: 7,
    totalEpisodes: 12,
    nextAiringAt: Date.now() + 1000 * 60 * 60 * 38,
    coverColor: ["#1a0a10", "#4a1020"],
  },
  {
    id: 2,
    titleJp: "ドクターストーン",
    titleEn: "Dr. Stone",
    season: "S3",
    status: "AIRING",
    airDay: "Every SAT",
    episode: 8,
    totalEpisodes: 12,
    nextAiringAt: Date.now() + 1000 * 60 * 60 * 110,
    coverColor: ["#0a1a10", "#0a3a1a"],
  },
  {
    id: 3,
    titleJp: "俺だけレベルアップな件",
    titleEn: "Solo Leveling",
    season: "S2",
    status: "AIRING",
    airDay: "Every THU",
    episode: 6,
    totalEpisodes: 13,
    nextAiringAt: Date.now() + 1000 * 60 * 60 * 20,
    coverColor: ["#0a0a1a", "#1a1040"],
  },
  {
    id: 4,
    titleJp: "進撃の巨人",
    titleEn: "Attack on Titan",
    season: "Final",
    status: "FINISHED",
    airDay: null,
    episode: 87,
    totalEpisodes: 87,
    nextAiringAt: null,
    coverColor: ["#1a1008", "#3a2808"],
  },
  {
    id: 5,
    titleJp: "転生したらスライムだった件",
    titleEn: "Slime Isekai",
    season: "S4",
    status: "UPCOMING",
    airDay: "Fall 2025",
    episode: 0,
    totalEpisodes: null,
    nextAiringAt: null,
    coverColor: ["#0a101a", "#0a2030"],
  },
  {
    id: 6,
    titleJp: "呪術廻戦",
    titleEn: "Jujutsu Kaisen",
    season: "S3",
    status: "AIRING",
    airDay: "Every SAT",
    episode: 5,
    totalEpisodes: 24,
    nextAiringAt: Date.now() + 1000 * 60 * 60 * 95,
    coverColor: ["#100a1a", "#280a30"],
  },
];

const TICKER_ITEMS = [
  "Demon Slayer S4 — Ep 8 WED",
  "Dr. Stone S3 — Ep 9 SAT",
  "Solo Leveling S2 — Ep 7 THU",
  "Jujutsu Kaisen S3 — Ep 6 SAT",
  "Frieren S2 — CONFIRMED",
  "Mob Psycho 100 S4 — UPCOMING",
];

const WEEK_SCHEDULE = [
  { day: "MON", shows: [] },
  { day: "TUE", shows: [{ title: "Solo Leveling", ep: 7 }] },
  { day: "WED", shows: [{ title: "Demon Slayer", ep: 8 }] },
  { day: "THU", shows: [] },
  { day: "FRI", shows: [{ title: "Frieren", ep: 27 }] },
  { day: "SAT", shows: [{ title: "Dr. Stone", ep: 9 }, { title: "Jujutsu Kaisen", ep: 6 }] },
  { day: "SUN", shows: [] },
];

const NOTIFICATIONS = [
  { type: "new_season", text: "Bleach TYBW P3 confirmed", time: "2h ago" },
  { type: "reminder", text: "Dr. Stone ep 8 reminder sent", time: "Yesterday" },
  { type: "new_season", text: "Mob Psycho S4 detected", time: "3d ago" },
];

const FILTERS = ["All shows", "Airing", "Upcoming", "Finished"];
const SEASONS = ["Spring 2025", "Winter 2025", "Fall 2024"];
const GENRES = ["Shonen", "Seinen", "Isekai", "Mecha", "Romance", "Horror"];

const ACCENT_COLORS = {
  dark: {
    pink:   { accent: "#f4a7b9", soft: "rgba(244,167,185,0.12)", glow: "rgba(244,167,185,0.22)" },
    purple: { accent: "#b8a9f0", soft: "rgba(184,169,240,0.12)", glow: "rgba(184,169,240,0.22)" },
    blue:   { accent: "#a0c4f8", soft: "rgba(160,196,248,0.12)", glow: "rgba(160,196,248,0.22)" },
    green:  { accent: "#a8d8b0", soft: "rgba(168,216,176,0.12)", glow: "rgba(168,216,176,0.22)" },
    amber:  { accent: "#f5c97a", soft: "rgba(245,201,122,0.12)", glow: "rgba(245,201,122,0.22)" },
  },
  light: {
    blue:   { accent: "#1a56db", soft: "rgba(26,86,219,0.10)",  glow: "rgba(26,86,219,0.20)" },
    green:  { accent: "#1a7a3c", soft: "rgba(26,122,60,0.10)",  glow: "rgba(26,122,60,0.20)" },
    purple: { accent: "#5b35c8", soft: "rgba(91,53,200,0.10)",  glow: "rgba(91,53,200,0.20)" },
    red:    { accent: "#c8222a", soft: "rgba(200,34,42,0.10)",  glow: "rgba(200,34,42,0.20)" },
    amber:  { accent: "#b86a00", soft: "rgba(184,106,0,0.10)",  glow: "rgba(184,106,0,0.20)" },
  },
};

// ─── Countdown Hook ───────────────────────────────────────────────────────────
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

// ─── Ticker ───────────────────────────────────────────────────────────────────
function Ticker({ accent }) {
  const text = TICKER_ITEMS.join("   ／   ");
  return (
    <div style={{
      background: accent,
      padding: "5px 0",
      overflow: "hidden",
      whiteSpace: "nowrap",
      position: "relative",
    }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display: inline-block;
          animation: ticker 28s linear infinite;
        }
      `}</style>
      <span className="ticker-inner" style={{ fontSize: 10, letterSpacing: "0.15em", color: "#fff" }}>
        {[...Array(4)].map((_, i) => (
          <span key={i}>
            <span style={{ opacity: 0.5, marginRight: 16 }}>●</span>
            {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </span>
    </div>
  );
}

// ─── Show Row ─────────────────────────────────────────────────────────────────
function ShowRow({ show, index, accent, accentSoft, isDark }) {
  const countdown = useCountdown(show.nextAiringAt);
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textPrimary = isDark ? "#e8e6df" : "#0d0d12";
  const textMuted = isDark ? "#555" : "#aaa";
  const textSec = isDark ? "#888" : "#666";
  const bg = isDark ? "#13131a" : "#fff";
  const bgHover = isDark ? "#1a1a28" : "#f5f5fb";

  const badgeStyle = {
    AIRING:   { bg: `${accent}18`, color: accent, border: `0.5px solid ${accent}40` },
    FINISHED: { bg: isDark ? "#ffffff10" : "#00000008", color: textMuted, border: `0.5px solid ${borderColor}` },
    UPCOMING: { bg: `${accent}10`, color: accent, border: `0.5px solid ${accent}30`, opacity: 0.8 },
  }[show.status];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "36px 44px 1fr auto",
      borderBottom: `1px solid ${borderColor}`,
      background: bg,
      transition: "background 0.15s",
      cursor: "pointer",
    }}
      onMouseEnter={e => e.currentTarget.style.background = bgHover}
      onMouseLeave={e => e.currentTarget.style.background = bg}
    >
      {/* Row number — vertical */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        writingMode: "vertical-rl", fontSize: 9, color: textMuted,
        letterSpacing: "0.1em", borderRight: `1px solid ${borderColor}`,
        padding: "10px 0",
      }}>
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Cover art */}
      <div style={{
        width: 44, background: `linear-gradient(135deg, ${show.coverColor[0]}, ${show.coverColor[1]})`,
        flexShrink: 0,
      }} />

      {/* Info */}
      <div style={{ padding: "9px 12px", borderRight: `1px solid ${borderColor}` }}>
        <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.05em", marginBottom: 1 }}>
          {show.titleJp}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary, marginBottom: 5, fontFamily: "'Noto Sans JP', sans-serif" }}>
          {show.titleEn} <span style={{ color: textMuted, fontWeight: 400 }}>{show.season}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 8, padding: "2px 7px", letterSpacing: "0.06em",
            background: badgeStyle.bg, color: badgeStyle.color,
            border: badgeStyle.border, opacity: badgeStyle.opacity || 1,
          }}>
            {show.status}
          </span>
          {show.airDay && (
            <span style={{ fontSize: 9, color: textMuted }}>{show.airDay}</span>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div style={{ padding: "9px 14px", textAlign: "right", minWidth: 100, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {countdown ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: accent, fontFamily: "monospace" }}>{countdown}</div>
            <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>ep {show.episode + 1} drops</div>
          </>
        ) : show.status === "FINISHED" ? (
          <div style={{ fontSize: 11, color: textMuted }}>completed</div>
        ) : (
          <div style={{ fontSize: 11, color: accent, opacity: 0.7 }}>TBA</div>
        )}
        <div style={{ fontSize: 9, color: textMuted, marginTop: 4 }}>
          {show.totalEpisodes ? `${show.episode} / ${show.totalEpisodes} eps` : "new season"}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [theme, setTheme] = useState("dark");
  const [accentKey, setAccentKey] = useState("blue");
  const [activeFilter, setActiveFilter] = useState("All shows");
  const [activeSeason, setActiveSeason] = useState("Spring 2025");
  const [showThemePicker, setShowThemePicker] = useState(false);

  const isDark = theme === "dark";
  const accentSet = ACCENT_COLORS[theme][accentKey] || Object.values(ACCENT_COLORS[theme])[0];
  const { accent, soft, glow } = accentSet;

  const bg        = isDark ? "#0d0d12" : "#f5f5f7";
  const bgPanel   = isDark ? "#13131a" : "#ffffff";
  const bgSidebar = isDark ? "#0f0f16" : "#fafafa";
  const border    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#e8e6df" : "#0d0d12";
  const textSec     = isDark ? "#888"    : "#666";
  const textMuted   = isDark ? "#444"    : "#bbb";

  const filteredShows = MOCK_SHOWS.filter(s => {
    if (activeFilter === "All shows") return true;
    if (activeFilter === "Airing")   return s.status === "AIRING";
    if (activeFilter === "Upcoming") return s.status === "UPCOMING";
    if (activeFilter === "Finished") return s.status === "FINISHED";
    return true;
  });

  const todayIndex = new Date().getDay(); // 0=Sun
  const dayMap = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const today = dayMap[todayIndex];

  const accentKeys = Object.keys(ACCENT_COLORS[theme]);

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif", background: bg, minHeight: "100vh", color: textPrimary }}>
      <style>{`
        ::-webkit-scrollbar-thumb { background: ${border}; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* ── Nav ── */}
      <div style={{
        display: "flex", alignItems: "stretch",
        borderBottom: `1px solid ${border}`,
        background: bgPanel, position: "sticky", top: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: "10px 20px", borderRight: `1px solid ${border}` }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: "0.1em", lineHeight: 1 }}
          >COUR</div>
          <div style={{ fontSize: 9, color: accent, letterSpacing: "0.2em" }}>クール</div>
        </div>

        {/* Tabs */}
        {["TRACKING", "CALENDAR", "DISCOVER", "SETTINGS"].map(tab => (
          <div key={tab} style={{
            padding: "0 16px", fontSize: 10, letterSpacing: "0.12em",
            color: tab === "TRACKING" ? textPrimary : textMuted,
            borderRight: `1px solid ${border}`,
            display: "flex", alignItems: "center", cursor: "pointer",
            position: "relative",
          }}>
            {tab}
            {tab === "TRACKING" && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: accent }} />
            )}
          </div>
        ))}

        {/* Right stats */}
        <div style={{ marginLeft: "auto", display: "flex" }}>
          {[
            { val: filteredShows.length, label: "tracking" },
            { val: MOCK_SHOWS.filter(s => s.status === "AIRING").length, label: "airing" },
            { val: "WED", label: "next ep" },
          ].map(({ val, label }) => (
            <div key={label} style={{
              padding: "0 16px", borderLeft: `1px solid ${border}`,
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: textPrimary }}>{val}</div>
              <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.08em" }}>{label}</div>
            </div>
          ))}
          {/* Theme toggle */}
          <div
            onClick={() => setShowThemePicker(p => !p)}
            style={{
              padding: "0 16px", borderLeft: `1px solid ${border}`,
              display: "flex", alignItems: "center", cursor: "pointer",
              fontSize: 10, color: textSec, letterSpacing: "0.1em", gap: 6,
              position: "relative",
            }}
          >
            {isDark ? "◑" : "○"} THEME
            {showThemePicker && (
              <div style={{
                position: "absolute", top: "100%", right: 0,
                background: bgPanel, border: `1px solid ${border}`,
                padding: 14, zIndex: 100, minWidth: 180,
                boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
              }}>
                {/* Dark/Light toggle */}
                <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.15em", marginBottom: 8 }}>MODE</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {["dark","light"].map(t => (
                    <button key={t} onClick={() => { setTheme(t); setAccentKey(Object.keys(ACCENT_COLORS[t])[0]); }}
                      style={{
                        flex: 1, padding: "5px 0", fontSize: 10, letterSpacing: "0.1em",
                        background: theme === t ? accent : "transparent",
                        color: theme === t ? (isDark ? "#000" : "#fff") : textSec,
                        border: `1px solid ${theme === t ? accent : border}`,
                        cursor: "pointer", textTransform: "uppercase",
                      }}>{t}</button>
                  ))}
                </div>
                {/* Accent swatches */}
                <div style={{ fontSize: 9, color: textMuted, letterSpacing: "0.15em", marginBottom: 8 }}>ACCENT</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {accentKeys.map(k => (
                    <div key={k} onClick={() => setAccentKey(k)}
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: ACCENT_COLORS[theme][k].accent,
                        border: accentKey === k ? `2px solid ${textPrimary}` : "2px solid transparent",
                        cursor: "pointer", transition: "transform 0.1s",
                      }}
                      title={k}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Ticker ── */}
      <Ticker accent={accent} />

      {/* ── Body ── */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 168px", minHeight: "calc(100vh - 90px)" }}>

        {/* ── Left Sidebar ── */}
        <div style={{ background: bgSidebar, borderRight: `1px solid ${border}` }}>
          {/* Filter */}
          <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: 8, paddingTop: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, padding: "0 14px 6px" }}>FILTER</div>
            {FILTERS.map(f => (
              <div key={f} onClick={() => setActiveFilter(f)}
                style={{
                  padding: "6px 14px", fontSize: 11, cursor: "pointer",
                  color: activeFilter === f ? textPrimary : textSec,
                  background: activeFilter === f ? soft : "transparent",
                  borderLeft: activeFilter === f ? `2px solid ${accent}` : "2px solid transparent",
                  transition: "all 0.1s",
                }}>
                {f}
                {f === "Airing" && (
                  <span style={{
                    float: "right", width: 6, height: 6, borderRadius: "50%",
                    background: accent, display: "inline-block", marginTop: 3,
                    animation: "pulse 2s infinite",
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Season */}
          <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: 8, paddingTop: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, padding: "0 14px 6px" }}>SEASON</div>
            {SEASONS.map(s => (
              <div key={s} onClick={() => setActiveSeason(s)}
                style={{
                  padding: "6px 14px", fontSize: 11, cursor: "pointer",
                  color: activeSeason === s ? textPrimary : textSec,
                  background: activeSeason === s ? soft : "transparent",
                  borderLeft: activeSeason === s ? `2px solid ${accent}` : "2px solid transparent",
                }}>
                {s}
              </div>
            ))}
          </div>

          {/* Genre */}
          <div style={{ paddingTop: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, padding: "0 14px 6px" }}>GENRE</div>
            {GENRES.map(g => (
              <div key={g}
                style={{ padding: "6px 14px", fontSize: 11, color: textSec, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.color = textPrimary}
                onMouseLeave={e => e.currentTarget.style.color = textSec}
              >{g}</div>
            ))}
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div style={{ background: bgPanel }}>
          {/* Panel header */}
          <div style={{
            padding: "10px 16px", borderBottom: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 500 }}>MY LIST</span>
            <span style={{
              fontSize: 9, background: soft, color: accent,
              padding: "2px 8px", letterSpacing: "0.05em",
            }}>{filteredShows.length} shows</span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: textMuted, letterSpacing: "0.1em" }}>
              SPRING 2025 ／ 第2クール
            </span>
          </div>

          {/* Show rows */}
          {filteredShows.map((show, i) => (
            <ShowRow
              key={show.id}
              show={show}
              index={i}
              accent={accent}
              accentSoft={soft}
              isDark={isDark}
            />
          ))}

          {filteredShows.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: textMuted, fontSize: 12 }}>
              No shows in this filter
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ background: bgSidebar, borderLeft: `1px solid ${border}` }}>
          {/* This week */}
          <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: 8 }}>
            <div style={{
              fontSize: 9, letterSpacing: "0.2em", color: accent,
              padding: "10px 12px 6px", borderBottom: `1px solid ${border}`,
            }}>
              THIS WEEK <span style={{ color: textMuted, fontFamily: "'Noto Sans JP'" }}>／ 今週</span>
            </div>
            {WEEK_SCHEDULE.map(({ day, shows }) => shows.length > 0 && (
              <div key={day} style={{ borderBottom: `1px solid ${border}` }}>
                <div style={{
                  padding: "4px 12px", fontSize: 9,
                  background: day === today ? soft : "transparent",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span style={{ color: day === today ? accent : textMuted }}>{day}</span>
                  {day === today && <span style={{ fontSize: 8, color: accent }}>TODAY</span>}
                </div>
                {shows.map(s => (
                  <div key={s.title} style={{ padding: "5px 12px" }}>
                    <div style={{ fontSize: 11, color: textPrimary }}>{s.title}</div>
                    <div style={{ fontSize: 9, color: textMuted, marginTop: 1 }}>EP {s.ep}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div>
            <div style={{
              fontSize: 9, letterSpacing: "0.2em", color: accent,
              padding: "10px 12px 6px", borderBottom: `1px solid ${border}`,
            }}>NOTIFICATIONS</div>
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} style={{
                padding: "8px 12px", borderBottom: `1px solid ${border}`,
              }}>
                <div style={{
                  fontSize: 10,
                  color: n.type === "new_season" ? accent : textPrimary,
                }}>{n.text}</div>
                <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        textAlign: "center", padding: "20px 0",
        fontSize: 11, color: textMuted, letterSpacing: "0.05em",
        borderTop: `1px solid ${border}`, background: bgPanel,
      }}>
        made with ❤️ by a weeb
      </div>
    </div>
  );
}
