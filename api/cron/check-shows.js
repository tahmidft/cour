import { createSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { Resend } from "resend";
import { processCron } from "../lib/cronLogic.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.VITE_APP_URL;
const RESEND_FROM = process.env.RESEND_FROM || "COUR <onboarding@resend.dev>";

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = createSupabaseAdmin();
    const result = await processCron({
      supabase,
      resend: process.env.RESEND_API_KEY ? resend : null,
      appUrl: APP_URL,
      resendFrom: RESEND_FROM,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
