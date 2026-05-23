import {
  newSeasonEmail,
  weeklySummaryEmail,
  dailyDigestEmail,
  buildSeasonResponseUrls,
} from "./emailTemplates.js";
import { fetchAnimeForTrack } from "./trackShow.js";
import { stripSynopsis, syncSeasonPromptAfterEmail } from "./seasonPrompts.js";
import {
  createFallbackBudget,
  findFallbackSequelCandidates,
} from "./sequelFallback.js";

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
      query: `query($id:Int){Media(id:$id,type:ANIME){status episodes nextAiringEpisode{episode airingAt} relations{edges{relationType node{id title{romaji english native} status type coverImage{large} bannerImage}}}}}`,
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
  const fallbackBudget = createFallbackBudget();

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
      const trackedAnilistIds = new Set(shows.map((s) => s.anilist_id));

      for (const { show, media } of mediaByShow.values()) {
        const sequels =
          media.relations?.edges?.filter(
            (e) =>
              e.relationType === "SEQUEL" &&
              e.node.type === "ANIME" &&
              ["RELEASING", "NOT_YET_RELEASED"].includes(e.node.status)
          ) || [];

        const watchedSeason = show.season_number || 1;
        const newSeason = watchedSeason + 1;
        const candidates = sequels.map((sequel) => ({
          id: sequel.node.id,
          node: sequel.node,
          seasonNumber: newSeason,
        }));

        if (candidates.length === 0 && !fallbackBudget.rateLimited) {
          const fallback = await findFallbackSequelCandidates(
            show,
            newSeason,
            trackedAnilistIds,
            fallbackBudget
          );
          for (const { media: mediaResult, seasonNumber } of fallback) {
            candidates.push({
              id: mediaResult.id,
              node: mediaResult,
              seasonNumber,
            });
          }
        }

        for (const sequel of candidates) {
          const sequelId = sequel.id;
          if (trackedAnilistIds.has(sequelId)) continue;

          const logType = `new_season_${sequelId}`;
          const declineType = `new_season_declined_${sequelId}`;

          const { data: promptRow } = await supabase
            .from("season_prompts")
            .select("status, snooze_until")
            .eq("user_id", show.user_id)
            .eq("sequel_anilist_id", sequelId)
            .maybeSingle();

          if (promptRow?.status === "dismissed" || promptRow?.status === "tracked") continue;

          const snoozeActive =
            promptRow?.status === "snoozed" &&
            promptRow.snooze_until &&
            new Date(promptRow.snooze_until) > now;
          if (snoozeActive) continue;

          const snoozeExpired =
            promptRow?.status === "snoozed" &&
            promptRow.snooze_until &&
            new Date(promptRow.snooze_until) <= now;

          const { data: existingLogs } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", show.user_id)
            .in("type", [logType, declineType])
            .limit(1);

          if (existingLogs?.length && !snoozeExpired) continue;

          let sequelMedia = null;
          try {
            sequelMedia = await fetchAnimeForTrack(sequelId);
          } catch {
            /* use relation node fallback */
          }

          const sequelTitleEn =
            sequelMedia?.title?.english ||
            sequelMedia?.title?.romaji ||
            sequel.node.title?.english ||
            sequel.node.title?.romaji ||
            show.title_en;
          const coverImage =
            sequelMedia?.coverImage?.extraLarge ||
            sequelMedia?.coverImage?.large ||
            sequel.node.coverImage?.large ||
            show.cover_image;
          const bannerImage = sequelMedia?.bannerImage || sequel.node.bannerImage || show.banner_image;
          const sequelSynopsis = stripSynopsis(sequelMedia?.description);
          const sequelScore = sequelMedia?.meanScore ?? null;

          const urls = buildSeasonResponseUrls(appUrl, {
            notifyToken: profile.notify_token,
            sequelAnilistId: sequelId,
            seasonNumber: sequel.seasonNumber,
            parentShowId: show.id,
          });

          await resend.emails.send({
            from: resendFrom,
            to: profile.email,
            subject: `🎌 ${show.title_en} — Season ${sequel.seasonNumber} is here`,
            html: newSeasonEmail({
              parentTitleEn: show.title_en,
              parentTitleJp: show.title_jp,
              sequelTitleEn,
              watchedSeason,
              newSeason: sequel.seasonNumber,
              coverImage,
              bannerImage,
              sequelSynopsis,
              sequelScore,
              status: sequelMedia?.status || sequel.node.status,
              appUrl,
              notifyToken: profile.notify_token,
              trackUrl: urls.trackUrl,
              dismissUrl: urls.dismissUrl,
              snoozeUrl: urls.snoozeUrl,
            }),
          });

          await syncSeasonPromptAfterEmail(supabase, {
            user_id: show.user_id,
            parent_show_id: show.id,
            sequel_anilist_id: sequelId,
            season_number: sequel.seasonNumber,
            parent_title_en: show.title_en,
            sequel_title_en: sequelTitleEn,
            sequel_cover: coverImage,
            sequel_synopsis: sequelSynopsis,
            sequel_score: sequelScore,
            sequel_status: sequelMedia?.status || sequel.node.status,
          });

          if (!existingLogs?.length) {
            await supabase.from("notification_log").insert({
              user_id: show.user_id,
              show_id: show.id,
              type: logType,
            });
          }
          sent++;
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

  return {
    processed: rows.length,
    emailsSent: sent,
    fallbackSearchesUsed: fallbackBudget.used,
    fallbackRateLimited: fallbackBudget.rateLimited,
  };
}
