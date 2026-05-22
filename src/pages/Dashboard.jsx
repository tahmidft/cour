import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import Layout from "../components/Layout";
import ShowRow, { ShowRowSkeleton } from "../components/ShowRow";
import { useAuth } from "../hooks/useAuth";
import { useTrackedShows } from "../hooks/useTrackedShows";
import { useThemeContext } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import {
  FILTERS,
  SEASONS,
  GENRES,
  mapTrackedShow,
  filterShows,
  buildWeekSchedule,
} from "../lib/showUtils";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { shows, loading, removeShow } = useTrackedShows(user?.id);
  const { styles, isDark } = useThemeContext();
  const {
    accent,
    soft,
    bgPanel,
    bgSidebar,
    border,
    textPrimary,
    textSec,
    textMuted,
  } = styles;

  const [activeFilter, setActiveFilter] = useState("All shows");
  const [activeSeason, setActiveSeason] = useState("All seasons");
  const [notifications, setNotifications] = useState([]);

  const mapped = shows.map(mapTrackedShow);
  const filteredShows = filterShows(mapped, activeFilter, activeSeason);

  const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = dayMap[new Date().getDay()];
  const weekSchedule = buildWeekSchedule(mapped);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("notification_log")
      .select("type, sent_at")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setNotifications(
          (data || []).map((n) => ({
            type: n.type.startsWith("new_season") ? "new_season" : "reminder",
            text: n.type.replace(/_/g, " "),
            time: formatDistanceToNow(new Date(n.sent_at), { addSuffix: true }),
          }))
        );
      });
  }, [user?.id, shows.length]);

  async function handleRemove(id) {
    await removeShow(id);
    toast.success("Removed from list");
  }

  return (
    <Layout activeTab="TRACKING">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr 168px",
          minHeight: "calc(100vh - 90px)",
        }}
      >
        <div style={{ background: bgSidebar, borderRight: `1px solid ${border}` }}>
          <div
            style={{ borderBottom: `1px solid ${border}`, paddingBottom: 8, paddingTop: 10 }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: accent,
                padding: "0 14px 6px",
              }}
            >
              FILTER
            </div>
            {FILTERS.map((f) => (
              <div
                key={f}
                role="button"
                tabIndex={0}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  cursor: "pointer",
                  color: activeFilter === f ? textPrimary : textSec,
                  background: activeFilter === f ? soft : "transparent",
                  borderLeft:
                    activeFilter === f ? `2px solid ${accent}` : "2px solid transparent",
                  transition: "all 0.1s",
                }}
              >
                {f}
                {f === "Airing" && (
                  <span
                    style={{
                      float: "right",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: accent,
                      display: "inline-block",
                      marginTop: 3,
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            style={{ borderBottom: `1px solid ${border}`, paddingBottom: 8, paddingTop: 10 }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: accent,
                padding: "0 14px 6px",
              }}
            >
              SEASON
            </div>
            {SEASONS.map((s) => (
              <div
                key={s}
                role="button"
                tabIndex={0}
                onClick={() => setActiveSeason(s)}
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  cursor: "pointer",
                  color: activeSeason === s ? textPrimary : textSec,
                  background: activeSeason === s ? soft : "transparent",
                  borderLeft:
                    activeSeason === s ? `2px solid ${accent}` : "2px solid transparent",
                }}
              >
                {s}
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 10 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: accent,
                padding: "0 14px 6px",
              }}
            >
              GENRE
            </div>
            {GENRES.map((g) => (
              <div
                key={g}
                style={{ padding: "6px 14px", fontSize: 11, color: textSec, cursor: "pointer" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = textSec;
                }}
              >
                {g}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: bgPanel }}>
          <div
            style={{
              padding: "10px 16px",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 500 }}>
              MY LIST
            </span>
            <span
              style={{
                fontSize: 9,
                background: soft,
                color: accent,
                padding: "2px 8px",
                letterSpacing: "0.05em",
              }}
            >
              {filteredShows.length} shows
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 9,
                color: textMuted,
                letterSpacing: "0.1em",
              }}
            >
              {activeSeason === "All seasons" ? "ALL SEASONS" : activeSeason} ／ 第2クール
            </span>
          </div>

          {loading &&
            [...Array(4)].map((_, i) => <ShowRowSkeleton key={i} isDark={isDark} />)}

          {!loading &&
            filteredShows.map((show, i) => (
              <ShowRow
                key={show.id}
                show={show}
                index={i}
                accent={accent}
                isDark={isDark}
                onRemove={handleRemove}
              />
            ))}

          {!loading && filteredShows.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: textMuted, fontSize: 12 }}>
              {shows.length === 0
                ? "Search and add your first anime — click + SEARCH above"
                : "No shows in this filter"}
            </div>
          )}
        </div>

        <div style={{ background: bgSidebar, borderLeft: `1px solid ${border}` }}>
          <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: 8 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: accent,
                padding: "10px 12px 6px",
                borderBottom: `1px solid ${border}`,
              }}
            >
              THIS WEEK{" "}
              <span style={{ color: textMuted, fontFamily: "'Noto Sans JP'" }}>／ 今週</span>
            </div>
            {weekSchedule.map(
              ({ day, shows: dayShows }) =>
                dayShows.length > 0 && (
                  <div key={day} style={{ borderBottom: `1px solid ${border}` }}>
                    <div
                      style={{
                        padding: "4px 12px",
                        fontSize: 9,
                        background: day === today ? soft : "transparent",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: day === today ? accent : textMuted }}>{day}</span>
                      {day === today && (
                        <span style={{ fontSize: 8, color: accent }}>TODAY</span>
                      )}
                    </div>
                    {dayShows.map((s) => (
                      <div key={s.title} style={{ padding: "5px 12px" }}>
                        <div style={{ fontSize: 11, color: textPrimary }}>{s.title}</div>
                        <div style={{ fontSize: 9, color: textMuted, marginTop: 1 }}>
                          EP {s.ep}
                        </div>
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: accent,
                padding: "10px 12px 6px",
                borderBottom: `1px solid ${border}`,
              }}
            >
              NOTIFICATIONS
            </div>
            {notifications.length === 0 && (
              <div style={{ padding: "12px", fontSize: 10, color: textMuted }}>
                No notifications yet
              </div>
            )}
            {notifications.map((n, i) => (
              <div
                key={i}
                style={{ padding: "8px 12px", borderBottom: `1px solid ${border}` }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: n.type === "new_season" ? accent : textPrimary,
                  }}
                >
                  {n.text}
                </div>
                <div style={{ fontSize: 9, color: textMuted, marginTop: 2 }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
