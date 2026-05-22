import {
  newSeasonEmail,
  weeklySummaryEmail,
  dailyDigestEmail,
} from "./emailTemplates.js";

const MODES = {
  WEEKLY: "weekly_summary",
  SEASON: "new_season_only",
  DAILY: "daily_digest",
  NONE: "none",
};

export function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function dayKeyUTC(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatWhen(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchMedia(anilistId) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($id:Int){Media(id:$id,type:ANIME){status episodes nextAiringEpisode{episode airingAt} relations{edges{relationType node{id title{romaji}status type}}}}}`,
      variables: { id: anilistId },
    }),
  });
  const { data } = await response.json();
  return data?.Media;
}

export async function processCron({ supabase, resend, appUrl, resendFrom }) {
  const { data: rows } = await supabase
    .from("tracked_shows")
    .select("*, profiles(id, email, notify_token, notification_mode, weekly_reminders_all)");

  if (!rows?.length) return { processed: 0 };

  const byUser = new Map();
  for (const row of rows) {
    if (!row.profiles?.email) continue;
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, { profile: row.profiles, shows: [] });
    byUser.get(row.user_id).shows.push(row);
  }

  const now = new Date();
  const { start: weekStart, end: weekEnd } = getWeekBounds(now);
  const todayKey = dayKeyUTC(now.getTime());
  const weekLogKey = `weekly_summary_${weekStart.toISOString().slice(0, 10)}`;
  const isSunday = now.getDay() === 0;

  let sent = 0;

  for (const [, { profile, shows }] of byUser) {
    let mode = profile.notification_mode || MODES.WEEKLY;
    if (profile.weekly_reminders_all === false && mode !== MODES.NONE) {
      mode = MODES.NONE;
    }
    if (mode === MODES.NONE) continue;

    const activeShows = shows.filter((s) => s.weekly_reminder !== false);
    if (!activeShows.length) continue;

    const mediaByShow = new Map();
    for (const show of activeShows) {
      const media = await fetchMedia(show.anilist_id);
      if (!media) continue;
      mediaByShow.set(show.id, { show, media });

      const next = media.nextAiringEpisode;
      if (next) {
        await supabase
          .from("tracked_shows")
          .update({
            last_known_episode: Math.max(show.last_known_episode || 0, next.episode - 1),
            next_airing_at: next.airingAt * 1000,
            status: media.status,
          })
          .eq("id", show.id);
      }
    }

    const wantsNewSeason =
      mode === MODES.SEASON || mode === MODES.WEEKLY || mode === MODES.DAILY;

    if (wantsNewSeason && resend) {
      for (const { show, media } of mediaByShow.values()) {
        const sequels =
          media.relations?.edges?.filter(
            (e) =>
              e.relationType === "SEQUEL" &&
              e.node.type === "ANIME" &&
              ["RELEASING", "NOT_YET_RELEASED"].includes(e.node.status)
          ) || [];

        for (const sequel of sequels) {
          const logType = `new_season_${sequel.node.id}`;
          const { data: existing } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", show.user_id)
            .eq("type", logType)
            .maybeSingle();

          if (!existing) {
            await resend.emails.send({
              from: resendFrom,
              to: profile.email,
              subject: `🎌 ${show.title_en} — New season detected`,
              html: newSeasonEmail({
                titleEn: show.title_en,
                titleJp: show.title_jp,
                coverImage: show.cover_image,
                bannerImage: show.banner_image,
                seasonNumber: (show.season_number || 1) + 1,
                status: sequel.node.status,
                appUrl,
                notifyToken: profile.notify_token,
                showId: show.id,
              }),
            });
            await supabase.from("notification_log").insert({
              user_id: show.user_id,
              show_id: show.id,
              type: logType,
            });
            sent++;
          }
        }
      }
    }

    if (mode === MODES.WEEKLY && isSunday && resend) {
      const { data: sentLog } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", profile.id)
        .eq("type", weekLogKey)
        .maybeSingle();

      if (!sentLog) {
        const items = [];
        for (const { show, media } of mediaByShow.values()) {
          const next = media.nextAiringEpisode;
          if (!next) continue;
          const at = next.airingAt * 1000;
          if (at >= weekStart.getTime() && at < weekEnd.getTime()) {
            items.push({
              titleEn: show.title_en,
              coverImage: show.cover_image,
              episode: next.episode,
              when: formatWhen(at),
            });
          }
        }

        await resend.emails.send({
          from: resendFrom,
          to: profile.email,
          subject: `📅 COUR weekly — ${items.length} episode${items.length === 1 ? "" : "s"} this week`,
          html: weeklySummaryEmail({
            weekLabel: `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (Sun–Sat)`,
            items,
            appUrl,
            notifyToken: profile.notify_token,
          }),
        });
        await supabase.from("notification_log").insert({
          user_id: profile.id,
          show_id: null,
          type: weekLogKey,
        });
        sent++;
      }
    }

    if (mode === MODES.DAILY && resend) {
      const digestKey = `daily_digest_${todayKey}`;
      const { data: sentLog } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", profile.id)
        .eq("type", digestKey)
        .maybeSingle();

      if (!sentLog) {
        const items = [];
        for (const { show, media } of mediaByShow.values()) {
          const next = media.nextAiringEpisode;
          if (!next) continue;
          const at = next.airingAt * 1000;
          if (dayKeyUTC(at) === todayKey) {
            items.push({
              titleEn: show.title_en,
              coverImage: show.cover_image,
              episode: next.episode,
              time: new Date(at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
            });
          }
        }

        if (items.length > 0) {
          await resend.emails.send({
            from: resendFrom,
            to: profile.email,
            subject: `📺 COUR today — ${items.length} episode${items.length === 1 ? "" : "s"} airing`,
            html: dailyDigestEmail({
              dateLabel: new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }),
              items,
              appUrl,
              notifyToken: profile.notify_token,
            }),
          });
          await supabase.from("notification_log").insert({
            user_id: profile.id,
            show_id: null,
            type: digestKey,
          });
          sent++;
        }
      }
    }
  }

  return { processed: rows.length, emailsSent: sent };
}
