import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { useTrackedShowsContext } from "../context/TrackedShowsContext";
import { useThemeContext } from "../context/ThemeContext";
import { getAnimeById, getTopAiringAnime } from "../lib/anilist";
import toast from "react-hot-toast";

export default function Discover() {
  const { user } = useAuth();
  const { shows, addShow } = useTrackedShowsContext();
  const { styles, isDark } = useThemeContext();
  const { accent, soft, bgPanel, border, textPrimary, textMuted } = styles;

  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);

  const trackedIds = new Set(shows.map((s) => s.anilist_id));

  useEffect(() => {
    async function load() {
      setLoading(true);
      const all = new Map();

      if (shows.length === 0) {
        const top = await getTopAiringAnime();
        top.forEach((m) => all.set(m.id, m));
      } else {
        for (const show of shows.slice(0, 6)) {
          try {
            const media = await getAnimeById(show.anilist_id);
            const nodes = media?.recommendations?.nodes || [];
            for (const { mediaRecommendation: rec } of nodes) {
              if (rec && !trackedIds.has(rec.id)) {
                all.set(rec.id, rec);
              }
            }
          } catch {
            /* skip */
          }
        }
      }

      const sorted = [...all.values()].sort(
        (a, b) => (b.meanScore || 0) - (a.meanScore || 0)
      );
      setRecs(sorted);
      setLoading(false);
    }
    load();
  }, [shows.length]);

  async function handleTrack(media) {
    setTracking(media.id);
    const err = await addShow(media);
    setTracking(null);
    if (err) toast.error(err.message);
    else toast.success("Added to your list");
  }

  return (
    <Layout activeTab="DISCOVER">
      <div style={{ padding: 16, background: bgPanel, minHeight: "calc(100vh - 130px)" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.15em",
            marginBottom: 16,
            color: textPrimary,
          }}
        >
          DISCOVER
          <span style={{ fontSize: 9, color: textMuted, marginLeft: 8 }}>
            {shows.length === 0 ? "top airing" : "based on your list"}
          </span>
        </div>

        {loading && (
          <div style={{ color: textMuted, fontSize: 12 }}>Loading recommendations...</div>
        )}

        <div
          className="discover-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {recs.map((media) => {
            const tracked = trackedIds.has(media.id);
            return (
              <div
                key={media.id}
                style={{
                  border: `1px solid ${border}`,
                  background: isDark ? "#13131a" : "#fff",
                  overflow: "hidden",
                }}
              >
                {media.coverImage?.large && (
                  <img
                    src={media.coverImage.large}
                    alt=""
                    style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                  />
                )}
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 8, color: textMuted }}>{media.title?.native}</div>
                  <div style={{ fontSize: 11, color: textPrimary, marginBottom: 6 }}>
                    {media.title?.english || media.title?.romaji}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {(media.genres || []).slice(0, 2).map((g) => (
                      <span
                        key={g}
                        style={{
                          fontSize: 7,
                          padding: "2px 5px",
                          background: soft,
                          color: accent,
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  {media.meanScore && (
                    <div
                      style={{
                        fontSize: 9,
                        color: accent,
                        fontFamily: "monospace",
                        marginBottom: 8,
                      }}
                    >
                      {media.meanScore}%
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={tracked || tracking === media.id}
                    onClick={() => handleTrack(media)}
                    style={{
                      width: "100%",
                      fontSize: 9,
                      padding: "6px 0",
                      letterSpacing: "0.08em",
                      background: tracked ? "transparent" : `${accent}22`,
                      color: tracked ? textMuted : accent,
                      border: `1px solid ${tracked ? border : accent}`,
                      cursor: tracked ? "default" : "pointer",
                    }}
                  >
                    {tracked ? "Tracking ✓" : tracking === media.id ? "..." : "Track"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
