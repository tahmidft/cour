import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getAnimeById } from "../lib/anilist";
import { inferAirDay } from "../lib/showUtils";

async function backfillMissingGenres(showsList) {
  const missing = showsList.filter((s) => !s.genres);
  if (!missing.length) return showsList;

  const updated = await Promise.all(
    missing.map(async (show) => {
      try {
        const media = await getAnimeById(show.anilist_id);
        if (!media?.genres?.length) return show;
        const genres = JSON.stringify(media.genres);
        await supabase.from("tracked_shows").update({ genres }).eq("id", show.id);
        return { ...show, genres };
      } catch {
        return show;
      }
    })
  );

  const byId = new Map(updated.map((s) => [s.id, s]));
  return showsList.map((s) => byId.get(s.id) || s);
}

export function useTrackedShows(userId) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShows = useCallback(async () => {
    if (!userId) {
      setShows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("tracked_shows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const list = await backfillMissingGenres(data || []);
    setShows(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  async function addShow(anilistMedia) {
    const next = anilistMedia.nextAiringEpisode;
    const { error } = await supabase.from("tracked_shows").insert({
      user_id: userId,
      anilist_id: anilistMedia.id,
      title_en: anilistMedia.title.english || anilistMedia.title.romaji,
      title_jp: anilistMedia.title.native,
      cover_image: anilistMedia.coverImage?.extraLarge || anilistMedia.coverImage?.large,
      banner_image: anilistMedia.bannerImage,
      status: anilistMedia.status,
      total_episodes: anilistMedia.episodes,
      last_known_episode: next ? next.episode - 1 : anilistMedia.episodes || 0,
      next_airing_at: next ? next.airingAt * 1000 : null,
      air_day: inferAirDay(anilistMedia),
      season_year: anilistMedia.seasonYear,
      season_number: 1,
      genres: anilistMedia.genres?.length ? JSON.stringify(anilistMedia.genres) : null,
    });
    if (!error) await fetchShows();
    return error;
  }

  async function removeShow(showId) {
    await supabase.from("tracked_shows").delete().eq("id", showId);
    setShows((prev) => prev.filter((s) => s.id !== showId));
  }

  async function toggleWeeklyReminder(showId, current) {
    await supabase
      .from("tracked_shows")
      .update({ weekly_reminder: !current })
      .eq("id", showId);
    setShows((prev) =>
      prev.map((s) => (s.id === showId ? { ...s, weekly_reminder: !current } : s))
    );
  }

  return { shows, loading, addShow, removeShow, toggleWeeklyReminder, refetch: fetchShows };
}
