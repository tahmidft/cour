import { createSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { fetchAnimeForTrack, buildTrackedShowRow } from "../lib/trackShow.js";
import {
  seasonTrackSuccessHtml,
  seasonAlreadyTrackedHtml,
  seasonDismissedHtml,
  seasonSnoozedHtml,
  seasonErrorHtml,
} from "../lib/seasonResponseHtml.js";
import { seasonTrackConfirmEmail } from "../lib/emailTemplates.js";
import { sendCourEmail } from "../lib/resendClient.js";
import {
  markParentSeasonComplete,
  setSeasonPromptStatus,
  snoozeUntilDate,
} from "../lib/seasonPrompts.js";

const APP_URL = process.env.VITE_APP_URL || "https://cour-anime.vercel.app";

function html(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(body);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.query.token;
  const action = req.query.action;
  const sequelId = parseInt(req.query.sequel ?? "", 10);
  const seasonNumber = parseInt(req.query.season ?? "", 10);
  const parentShowId = req.query.from;

  if (!token || !action || Number.isNaN(sequelId)) {
    return html(res, 400, seasonErrorHtml({ message: "Invalid link.", appUrl: APP_URL }));
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    return html(res, 500, seasonErrorHtml({ message: err.message, appUrl: APP_URL }));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, notification_mode, weekly_reminders_all, notify_token")
    .eq("notify_token", token)
    .single();

  if (!profile) {
    return html(res, 404, seasonErrorHtml({ message: "This link has expired or is invalid.", appUrl: APP_URL }));
  }

  let parentTitle = "this show";
  if (parentShowId) {
    const { data: parent } = await supabase
      .from("tracked_shows")
      .select("id, title_en, season_number")
      .eq("id", parentShowId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (parent) parentTitle = parent.title_en;
  }

  const { data: alreadyTracked } = await supabase
    .from("tracked_shows")
    .select("id, title_en")
    .eq("user_id", profile.id)
    .eq("anilist_id", sequelId)
    .maybeSingle();

  if (action === "dismiss") {
    const { data: declined } = await supabase
      .from("notification_log")
      .select("id")
      .eq("user_id", profile.id)
      .eq("type", `new_season_declined_${sequelId}`)
      .limit(1);

    if (!declined?.length) {
      await supabase.from("notification_log").insert({
        user_id: profile.id,
        show_id: parentShowId || null,
        type: `new_season_declined_${sequelId}`,
      });
    }

    await setSeasonPromptStatus(supabase, profile.id, sequelId, "dismissed");

    const sn = Number.isNaN(seasonNumber) ? "?" : seasonNumber;
    return html(
      res,
      200,
      seasonDismissedHtml({ titleEn: parentTitle, seasonNumber: sn, appUrl: APP_URL })
    );
  }

  if (action === "snooze") {
    const until = snoozeUntilDate();
    await setSeasonPromptStatus(supabase, profile.id, sequelId, "snoozed", {
      snooze_until: until,
    });

    const sn = Number.isNaN(seasonNumber) ? "?" : seasonNumber;
    return html(
      res,
      200,
      seasonSnoozedHtml({ titleEn: parentTitle, seasonNumber: sn, appUrl: APP_URL })
    );
  }

  if (action !== "track") {
    return html(res, 400, seasonErrorHtml({ message: "Unknown action.", appUrl: APP_URL }));
  }

  if (alreadyTracked) {
    await setSeasonPromptStatus(supabase, profile.id, sequelId, "tracked");
    return html(
      res,
      200,
      seasonAlreadyTrackedHtml({ titleEn: alreadyTracked.title_en, appUrl: APP_URL })
    );
  }

  let media;
  try {
    media = await fetchAnimeForTrack(sequelId);
  } catch {
    return html(
      res,
      502,
      seasonErrorHtml({ message: "Could not load anime details. Try again later.", appUrl: APP_URL })
    );
  }

  if (!media) {
    return html(res, 404, seasonErrorHtml({ message: "Anime not found.", appUrl: APP_URL }));
  }

  const season = Number.isNaN(seasonNumber) ? 1 : seasonNumber;
  const row = buildTrackedShowRow(profile.id, media, season);
  const { error: insertErr } = await supabase.from("tracked_shows").insert(row);

  if (insertErr) {
    return html(res, 500, seasonErrorHtml({ message: insertErr.message, appUrl: APP_URL }));
  }

  await markParentSeasonComplete(supabase, parentShowId, profile.id);

  if (profile.notification_mode === "none" || profile.weekly_reminders_all === false) {
    await supabase
      .from("profiles")
      .update({ notification_mode: "weekly_summary", weekly_reminders_all: true })
      .eq("id", profile.id);
  }

  await supabase.from("notification_log").insert({
    user_id: profile.id,
    show_id: parentShowId || null,
    type: `new_season_tracked_${sequelId}`,
  });

  await setSeasonPromptStatus(supabase, profile.id, sequelId, "tracked");

  const titleEn = media.title.english || media.title.romaji;
  const coverImage = media.coverImage?.extraLarge || media.coverImage?.large;

  await sendCourEmail({
    to: profile.email,
    subject: `✓ Tracking ${titleEn} — Season ${season}`,
    html: seasonTrackConfirmEmail({
      titleEn,
      seasonNumber: season,
      parentTitleEn: parentTitle !== "this show" ? parentTitle : null,
      coverImage,
      appUrl: APP_URL,
      notifyToken: profile.notify_token,
    }),
  });

  return html(
    res,
    200,
    seasonTrackSuccessHtml({ titleEn, seasonNumber: season, appUrl: APP_URL })
  );
}
