const SNOOZE_DAYS = 14;

export function snoozeUntilDate(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + SNOOZE_DAYS);
  return d.toISOString();
}

export function stripSynopsis(html, maxLen = 220) {
  if (!html) return "";
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

export async function syncSeasonPromptAfterEmail(supabase, row) {
  const { error } = await supabase.from("season_prompts").upsert(
    {
      ...row,
      status: "pending",
      snooze_until: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,sequel_anilist_id" }
  );
  return error;
}

export async function setSeasonPromptStatus(supabase, userId, sequelAnilistId, status, extra = {}) {
  const { error } = await supabase
    .from("season_prompts")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("user_id", userId)
    .eq("sequel_anilist_id", sequelAnilistId);
  return error;
}

export async function reactivateExpiredSnoozes(supabase, userId) {
  const now = new Date().toISOString();
  await supabase
    .from("season_prompts")
    .update({ status: "pending", snooze_until: null, updated_at: now })
    .eq("user_id", userId)
    .eq("status", "snoozed")
    .lte("snooze_until", now);
}

export async function markParentSeasonComplete(supabase, parentShowId, userId) {
  if (!parentShowId) return;
  const { data: parent } = await supabase
    .from("tracked_shows")
    .select("id, total_episodes, episodes_watched")
    .eq("id", parentShowId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!parent?.total_episodes) return;
  if ((parent.episodes_watched ?? 0) >= parent.total_episodes) return;
  await supabase
    .from("tracked_shows")
    .update({ episodes_watched: parent.total_episodes })
    .eq("id", parentShowId);
}
