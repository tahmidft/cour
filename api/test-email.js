import { Resend } from "resend";
import {
  newSeasonEmail,
  weeklySummaryEmail,
  dailyDigestEmail,
} from "./lib/emailTemplates.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.VITE_APP_URL || "http://localhost:5173";
const RESEND_FROM = process.env.RESEND_FROM || "COUR <onboarding@resend.dev>";

const SAMPLES = {
  weekly_summary: () =>
    weeklySummaryEmail({
      weekLabel: "Week of May 18 (Sun–Sat) — TEST",
      items: [
        {
          titleEn: "Dr. Stone",
          coverImage: null,
          episode: 9,
          when: "Sat, May 24, 2:00 PM",
        },
        {
          titleEn: "Demon Slayer",
          coverImage: null,
          episode: 8,
          when: "Wed, May 21, 8:00 PM",
        },
      ],
      appUrl: APP_URL,
      notifyToken: "test-token",
    }),
  daily_digest: () =>
    dailyDigestEmail({
      dateLabel: "Friday, May 22 — TEST",
      items: [
        { titleEn: "Solo Leveling", coverImage: null, episode: 7, time: "6:00 PM" },
      ],
      appUrl: APP_URL,
      notifyToken: "test-token",
    }),
  new_season_only: () =>
    newSeasonEmail({
      titleEn: "Attack on Titan",
      titleJp: "進撃の巨人",
      coverImage: null,
      bannerImage: null,
      seasonNumber: 2,
      status: "NOT_YET_RELEASED",
      appUrl: APP_URL,
      notifyToken: "test-token",
      showId: "00000000-0000-0000-0000-000000000000",
    }),
};

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY not set" });
  }

  const type = req.query.type || req.body?.type || "weekly_summary";
  const to = req.query.to || req.body?.to;

  if (!to) {
    return res.status(400).json({
      error: "Missing ?to=your@email.com (must be your Resend account email for onboarding@resend.dev)",
    });
  }

  const build = SAMPLES[type];
  if (!build) {
    return res.status(400).json({
      error: "Invalid type",
      valid: Object.keys(SAMPLES),
    });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject: `[COUR TEST] ${type}`,
      html: build(),
    });
    if (error) return res.status(500).json({ error });
    return res.status(200).json({ success: true, id: data?.id, type, to });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
