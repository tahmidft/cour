import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { useTrackedShows } from "../hooks/useTrackedShows";
import { useThemeContext } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import { ACCENTS } from "../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { shows, toggleWeeklyReminder } = useTrackedShows(user?.id);
  const { theme, accentKey, isDark, styles, setTheme, setAccentKey, allAccents } =
    useThemeContext();
  const { accent, soft, bgPanel, bgSidebar, border, textPrimary, textSec, textMuted } = styles;

  const [weeklyAll, setWeeklyAll] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("weekly_reminders_all")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setWeeklyAll(data.weekly_reminders_all ?? true);
      });
  }, [user?.id]);

  async function toggleWeeklyAll() {
    const next = !weeklyAll;
    setWeeklyAll(next);
    await supabase
      .from("profiles")
      .update({ weekly_reminders_all: next })
      .eq("id", user.id);
    toast.success(next ? "Weekly reminders on" : "Weekly reminders off");
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const sectionStyle = {
    borderBottom: `1px solid ${border}`,
    padding: "16px 20px",
  };

  return (
    <Layout activeTab="SETTINGS">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "calc(100vh - 130px)",
          background: bgPanel,
        }}
      >
        <div style={{ borderRight: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div
              style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, marginBottom: 12 }}
            >
              ACCOUNT
            </div>
            <div style={{ fontSize: 12, color: textPrimary, marginBottom: 12 }}>
              {user?.email}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                fontSize: 10,
                padding: "8px 16px",
                letterSpacing: "0.1em",
                background: "transparent",
                color: textSec,
                border: `1px solid ${border}`,
                cursor: "pointer",
              }}
            >
              SIGN OUT
            </button>
          </div>

          <div style={sectionStyle}>
            <div
              style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, marginBottom: 12 }}
            >
              APPEARANCE
            </div>
            <div style={{ fontSize: 9, color: textMuted, marginBottom: 8 }}>MODE</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {["dark", "light"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
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
            <div style={{ fontSize: 9, color: textMuted, marginBottom: 8 }}>ACCENT</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.keys(allAccents).map((k) => (
                <div
                  key={k}
                  role="button"
                  tabIndex={0}
                  onClick={() => setAccentKey(k)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: ACCENTS[theme][k].accent,
                    border:
                      accentKey === k ? `2px solid ${textPrimary}` : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: bgSidebar }}>
          <div style={sectionStyle}>
            <div
              style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, marginBottom: 12 }}
            >
              NOTIFICATIONS
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 11, color: textPrimary }}>
                Weekly episode reminders (all shows)
              </span>
              <button
                type="button"
                onClick={toggleWeeklyAll}
                style={{
                  width: 40,
                  height: 20,
                  borderRadius: 10,
                  border: "none",
                  background: weeklyAll ? accent : border,
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: weeklyAll ? 22 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.15s",
                  }}
                />
              </button>
            </div>

            {shows.map((show) => (
              <div
                key={show.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderTop: `1px solid ${border}`,
                }}
              >
                {show.cover_image && (
                  <img
                    src={show.cover_image}
                    alt=""
                    style={{ width: 32, height: 44, objectFit: "cover" }}
                  />
                )}
                <div style={{ flex: 1, fontSize: 11, color: textPrimary }}>
                  {show.title_en}
                </div>
                <button
                  type="button"
                  onClick={() => toggleWeeklyReminder(show.id, show.weekly_reminder)}
                  style={{
                    width: 36,
                    height: 18,
                    borderRadius: 9,
                    border: "none",
                    background: show.weekly_reminder ? accent : border,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: show.weekly_reminder ? 20 : 2,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
