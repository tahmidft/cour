import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { useTrackedShowsContext } from "../context/TrackedShowsContext";
import { useThemeContext } from "../context/ThemeContext";
import { mapTrackedShow, formatAirTime } from "../lib/showUtils";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function dayIndexFromAirDay(airDay) {
  if (!airDay) return -1;
  const match = airDay.match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/i);
  if (!match) return -1;
  return DAYS.indexOf(match[1].toUpperCase());
}

export default function Calendar() {
  const { user } = useAuth();
  const { shows, loading } = useTrackedShowsContext();
  const { styles, isDark } = useThemeContext();
  const { accent, soft, bgPanel, border, textPrimary, textMuted } = styles;

  const mapped = shows.map(mapTrackedShow);
  const todayIdx = (new Date().getDay() + 6) % 7;

  const grid = DAYS.map((day, idx) => ({
    day,
    isToday: idx === todayIdx,
    shows: mapped.filter((s) => dayIndexFromAirDay(s.airDay) === idx),
  }));

  return (
    <Layout activeTab="CALENDAR">
      <div style={{ padding: 16, background: bgPanel, minHeight: "calc(100vh - 130px)" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            marginBottom: 16,
            color: textPrimary,
          }}
        >
          WEEKLY CALENDAR
        </div>
        {loading && (
          <div style={{ color: textMuted, fontSize: 12 }}>Loading schedule...</div>
        )}
        <div
          className="calendar-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 1,
            border: `1px solid ${border}`,
          }}
        >
          {grid.map(({ day, isToday, shows: dayShows }) => (
            <div
              key={day}
              className="calendar-day"
              style={{
                borderRight: `1px solid ${border}`,
                background: isToday ? soft : isDark ? "#13131a" : "#fff",
                minHeight: 200,
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  borderBottom: `1px solid ${border}`,
                  color: isToday ? accent : textMuted,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{day}</span>
                {isToday && <span style={{ fontSize: 8 }}>TODAY</span>}
              </div>
              <div style={{ padding: 8 }}>
                {dayShows.length === 0 && (
                  <div style={{ fontSize: 11, color: textMuted, textAlign: "center", padding: 16 }}>
                    —
                  </div>
                )}
                {dayShows.map((show) => (
                  <div
                    key={show.id}
                    style={{
                      marginBottom: 10,
                      borderBottom: `1px solid ${border}`,
                      paddingBottom: 8,
                    }}
                  >
                    {show.coverImage && (
                      <img
                        src={show.coverImage}
                        alt=""
                        style={{
                          width: "100%",
                          height: 72,
                          objectFit: "cover",
                          marginBottom: 6,
                        }}
                      />
                    )}
                    <div style={{ fontSize: 10, color: textPrimary }}>{show.titleEn}</div>
                    <div style={{ fontSize: 9, color: textMuted }}>
                      EP {(show.episode || 0) + 1}
                    </div>
                    {show.nextAiringAt && (
                      <div style={{ fontSize: 8, color: accent, marginTop: 4 }}>
                        {formatAirTime(show.nextAiringAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
