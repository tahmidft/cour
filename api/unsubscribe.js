import { createSupabaseAdmin } from "../lib/supabaseAdmin.js";

const VALID_DISABLE = new Set([
  "weekly_summary",
  "new_season_only",
  "daily_digest",
  "all",
]);

async function applyDisable(supabase, profile, disable) {
  if (disable === "all") {
    await supabase
      .from("profiles")
      .update({ notification_mode: "none", weekly_reminders_all: false })
      .eq("id", profile.id);
    await supabase
      .from("tracked_shows")
      .update({ weekly_reminder: false })
      .eq("user_id", profile.id);
    return { type: "all", message: "All COUR emails have been turned off." };
  }

  if (!VALID_DISABLE.has(disable)) {
    return { error: "Invalid preference" };
  }

  if (profile.notification_mode === disable) {
    await supabase
      .from("profiles")
      .update({ notification_mode: "none", weekly_reminders_all: false })
      .eq("id", profile.id);
    return {
      type: disable,
      message: `${label(disable)} has been turned off.`,
    };
  }

  return {
    type: disable,
    message: `You are not on ${label(disable)}. No change made.`,
    unchanged: true,
  };
}

function label(d) {
  const m = {
    weekly_summary: "Weekly summaries",
    new_season_only: "New season alerts",
    daily_digest: "Daily digests",
  };
  return m[d] || d;
}

export default async function handler(req, res) {
  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const { show, all, token, disable, preview } = req.query;

    if (!token) return res.status(400).json({ error: "Missing token" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, notification_mode, email")
      .eq("notify_token", token)
      .single();

    if (!profile) return res.status(404).json({ error: "Invalid token" });

    if (preview === "true") {
      return res.status(200).json({
        notification_mode: profile.notification_mode || "weekly_summary",
        email: profile.email,
      });
    }

    if (show) {
      await supabase
        .from("tracked_shows")
        .update({ weekly_reminder: false })
        .eq("id", show)
        .eq("user_id", profile.id);
      return res.status(200).json({
        success: true,
        type: "show",
        message: "This show has been removed from your email digests.",
      });
    }

    if (all === "true") {
      const result = await applyDisable(supabase, profile, "all");
      return res.status(200).json({ success: true, ...result });
    }

    if (disable) {
      const result = await applyDisable(supabase, profile, disable);
      if (result.error) return res.status(400).json(result);
      return res.status(200).json({ success: true, ...result });
    }

    return res.status(400).json({ error: "Missing params" });
  }

  if (req.method === "POST") {
    const { token, disable: disableList, show } = req.body || {};

    if (!token) return res.status(400).json({ error: "Missing token" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, notification_mode")
      .eq("notify_token", token)
      .single();

    if (!profile) return res.status(404).json({ error: "Invalid token" });

    if (show) {
      await supabase
        .from("tracked_shows")
        .update({ weekly_reminder: false })
        .eq("id", show)
        .eq("user_id", profile.id);
    }

    const modes = Array.isArray(disableList) ? disableList : [];
    if (modes.length === 0) {
      return res.status(400).json({ error: "Select at least one option" });
    }

    if (modes.includes("all")) {
      const result = await applyDisable(supabase, profile, "all");
      return res.status(200).json({ success: true, ...result });
    }

    let message = "";
    for (const d of modes) {
      if (!VALID_DISABLE.has(d) || d === "all") continue;
      const r = await applyDisable(supabase, profile, d);
      message = r.message;
      if (!r.unchanged) break;
    }

    const { data: updated } = await supabase
      .from("profiles")
      .select("notification_mode")
      .eq("id", profile.id)
      .single();

    return res.status(200).json({
      success: true,
      notification_mode: updated?.notification_mode,
      message: message || "Preferences updated.",
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
