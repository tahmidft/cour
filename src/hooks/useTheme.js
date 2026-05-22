import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const ACCENTS = {
  dark: {
    pink: { accent: "#f4a7b9", soft: "rgba(244,167,185,0.12)", glow: "rgba(244,167,185,0.22)" },
    purple: { accent: "#b8a9f0", soft: "rgba(184,169,240,0.12)", glow: "rgba(184,169,240,0.22)" },
    blue: { accent: "#a0c4f8", soft: "rgba(160,196,248,0.12)", glow: "rgba(160,196,248,0.22)" },
    green: { accent: "#a8d8b0", soft: "rgba(168,216,176,0.12)", glow: "rgba(168,216,176,0.22)" },
    amber: { accent: "#f5c97a", soft: "rgba(245,201,122,0.12)", glow: "rgba(245,201,122,0.22)" },
  },
  light: {
    blue: { accent: "#1a56db", soft: "rgba(26,86,219,0.10)", glow: "rgba(26,86,219,0.20)" },
    green: { accent: "#1a7a3c", soft: "rgba(26,122,60,0.10)", glow: "rgba(26,122,60,0.20)" },
    purple: { accent: "#5b35c8", soft: "rgba(91,53,200,0.10)", glow: "rgba(91,53,200,0.20)" },
    red: { accent: "#c8222a", soft: "rgba(200,34,42,0.10)", glow: "rgba(200,34,42,0.20)" },
    amber: { accent: "#b86a00", soft: "rgba(184,106,0,0.10)", glow: "rgba(184,106,0,0.20)" },
  },
};

export function getThemeStyles(isDark, accentSet) {
  const { accent, soft, glow } = accentSet;
  return {
    accent,
    soft,
    glow,
    bg: isDark ? "#0d0d12" : "#f5f5f7",
    bgPanel: isDark ? "#13131a" : "#ffffff",
    bgSidebar: isDark ? "#0f0f16" : "#fafafa",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    textPrimary: isDark ? "#e8e6df" : "#0d0d12",
    textSec: isDark ? "#888" : "#666",
    textMuted: isDark ? "#444" : "#bbb",
  };
}

export function useTheme(userId) {
  const [theme, setThemeState] = useState(() => localStorage.getItem("cour_theme") || "dark");
  const [accentKey, setAccentKeyState] = useState(() => localStorage.getItem("cour_accent") || "blue");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoaded(true);
      return;
    }
    supabase
      .from("profiles")
      .select("theme, accent")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data?.theme) {
          setThemeState(data.theme);
          localStorage.setItem("cour_theme", data.theme);
        }
        if (data?.accent) {
          setAccentKeyState(data.accent);
          localStorage.setItem("cour_accent", data.accent);
        }
        setLoaded(true);
      });
  }, [userId]);

  const isDark = theme === "dark";
  const accentSet = ACCENTS[theme][accentKey] || ACCENTS[theme].blue;
  const styles = getThemeStyles(isDark, accentSet);

  async function setTheme(t) {
    setThemeState(t);
    const keys = Object.keys(ACCENTS[t]);
    const newAccent = keys.includes(accentKey) ? accentKey : keys[0];
    setAccentKeyState(newAccent);
    localStorage.setItem("cour_theme", t);
    localStorage.setItem("cour_accent", newAccent);
    if (userId) {
      await supabase.from("profiles").update({ theme: t, accent: newAccent }).eq("id", userId);
    }
  }

  async function setAccentKey(k) {
    setAccentKeyState(k);
    localStorage.setItem("cour_accent", k);
    if (userId) {
      await supabase.from("profiles").update({ accent: k }).eq("id", userId);
    }
  }

  return {
    theme,
    accentKey,
    isDark,
    accentSet,
    styles,
    setTheme,
    setAccentKey,
    allAccents: ACCENTS[theme],
    loaded,
  };
}
