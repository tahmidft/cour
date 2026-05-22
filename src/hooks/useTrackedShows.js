import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { inferAirDay } from "../lib/showUtils";

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
    setShows(data || []);
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
