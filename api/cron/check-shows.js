import { createSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { Resend } from "resend";
import { newSeasonEmail, weeklyReminderEmail } from "../lib/emailTemplates.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.VITE_APP_URL;

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { data: shows } = await supabase
    .from("tracked_shows")
    .select("*, profiles(email, notify_token, weekly_reminders_all)");

  if (!shows?.length) {
    return res.status(200).json({ success: true, processed: 0 });
  }

  for (const show of shows) {
    try {
      const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($id:Int){Media(id:$id,type:ANIME){status episodes nextAiringEpisode{episode airingAt} relations{edges{relationType node{id title{romaji}status type}}}}}`,
          variables: { id: show.anilist_id },
        }),
      });
      const { data } = await response.json();
      const media = data?.Media;
      if (!media) continue;

      const next = media.nextAiringEpisode;
      const profile = show.profiles;
      if (!profile?.email) continue;

      if (next && next.episode > (show.last_known_episode || 0) + 1) {
        await supabase
          .from("tracked_shows")
          .update({
            last_known_episode: next.episode - 1,
            next_airing_at: next.airingAt * 1000,
            status: media.status,
          })
          .eq("id", show.id);

        if (show.weekly_reminder && profile.weekly_reminders_all) {
          const msUntil = next.airingAt * 1000 - Date.now();
          const daysUntil = Math.floor(msUntil / 86400000);
          const hoursUntil = Math.floor((msUntil % 86400000) / 3600000);
          const countdown =
            daysUntil > 0 ? `${daysUntil}d ${hoursUntil}h` : `${hoursUntil}h`;

          let skipReason = null;
          const weeksSinceLastEp = Math.round(msUntil / (7 * 86400000));
          if (weeksSinceLastEp > 1 && process.env.DEEPSEEK_API_KEY) {
            try {
              const deepseekRes = await fetch(
                "https://api.deepseek.com/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                      {
                        role: "user",
                        content: `Why was there no new episode of ${show.title_en} last week? One short sentence, factual only. If unknown, say "The episode was skipped this week."`,
                      },
                    ],
                    max_tokens: 60,
                  }),
                }
              );
              const deepseekData = await deepseekRes.json();
              skipReason = deepseekData.choices?.[0]?.message?.content || null;
            } catch {
              /* skip */
            }
          }

          if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
              from: "COUR <notifications@yourcourapp.com>",
              to: profile.email,
              subject: `⏰ ${show.title_en} — Episode ${next.episode} drops ${countdown}`,
              html: weeklyReminderEmail({
                titleEn: show.title_en,
                titleJp: show.title_jp,
                coverImage: show.cover_image,
                episode: next.episode,
                countdown,
                skipReason,
                appUrl: APP_URL,
                notifyToken: profile.notify_token,
                showId: show.id,
              }),
            });

            await supabase.from("notification_log").insert({
              user_id: show.user_id,
              show_id: show.id,
              type: "weekly_reminder",
            });
          }
        }
      }

      const sequels =
        media.relations?.edges?.filter(
          (e) =>
            e.relationType === "SEQUEL" &&
            e.node.type === "ANIME" &&
            ["RELEASING", "NOT_YET_RELEASED"].includes(e.node.status)
        ) || [];

      for (const sequel of sequels) {
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("user_id", show.user_id)
          .eq("type", `new_season_${sequel.node.id}`)
          .maybeSingle();

        if (!existing && process.env.RESEND_API_KEY) {
          await resend.emails.send({
            from: "COUR <notifications@yourcourapp.com>",
            to: profile.email,
            subject: `🎌 ${show.title_en} — A new season has been detected`,
            html: newSeasonEmail({
              titleEn: show.title_en,
              titleJp: show.title_jp,
              coverImage: show.cover_image,
              bannerImage: show.banner_image,
              seasonNumber: (show.season_number || 1) + 1,
              status: sequel.node.status,
              appUrl: APP_URL,
              notifyToken: profile.notify_token,
              showId: show.id,
            }),
          });

          await supabase.from("notification_log").insert({
            user_id: show.user_id,
            show_id: show.id,
            type: `new_season_${sequel.node.id}`,
          });
        }
      }
    } catch (err) {
      console.error(`Error processing show ${show.id}:`, err);
    }
  }

  return res.status(200).json({ success: true, processed: shows.length });
}
