import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getAnimeById } from "../lib/anilist";

function snoozeUntilIso() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
}

export function useSeasonPrompts(userId) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = useCallback(async () => {
    if (!userId) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();
    await supabase
      .from("season_prompts")
      .update({ status: "pending", snooze_until: null, updated_at: now })
      .eq("user_id", userId)
      .eq("status", "snoozed")
      .lte("snooze_until", now);

    const { data } = await supabase
      .from("season_prompts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setPrompts(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchPrompts();
  }, [fetchPrompts]);

  async function dismissPrompt(prompt) {
    await supabase
      .from("season_prompts")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", prompt.id);
    setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
  }

  async function snoozePrompt(prompt) {
    await supabase
      .from("season_prompts")
      .update({
        status: "snoozed",
        snooze_until: snoozeUntilIso(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prompt.id);
    setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
  }

  async function trackPrompt(prompt, { addShow, updateWatchProgress, shows }) {
    const media = await getAnimeById(prompt.sequel_anilist_id);
    if (!media) return new Error("Could not load anime details");

    const err = await addShow(media, { seasonNumber: prompt.season_number });
    if (err) return err;

    if (prompt.parent_show_id) {
      const parent = shows.find((s) => s.id === prompt.parent_show_id);
      if (parent?.total_episodes) {
        await updateWatchProgress(prompt.parent_show_id, parent.total_episodes);
      }
    }

    await supabase
      .from("season_prompts")
      .update({ status: "tracked", updated_at: new Date().toISOString() })
      .eq("id", prompt.id);

    setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));
    return null;
  }

  return {
    prompts,
    loading,
    dismissPrompt,
    snoozePrompt,
    trackPrompt,
    refreshPrompts: fetchPrompts,
  };
}
