import { createSupabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { show, all, token } = req.query;

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("notify_token", token)
    .single();

  if (!profile) return res.status(404).json({ error: "Invalid token" });

  if (all === "true") {
    await supabase
      .from("profiles")
      .update({ weekly_reminders_all: false })
      .eq("id", profile.id);
    await supabase
      .from("tracked_shows")
      .update({ weekly_reminder: false })
      .eq("user_id", profile.id);
    return res.status(200).json({ success: true, type: "all" });
  }

  if (show) {
    await supabase
      .from("tracked_shows")
      .update({ weekly_reminder: false })
      .eq("id", show)
      .eq("user_id", profile.id);
    return res.status(200).json({ success: true, type: "show" });
  }

  return res.status(400).json({ error: "Missing params" });
}
