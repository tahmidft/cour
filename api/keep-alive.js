import { createSupabaseAdmin } from "./lib/supabaseAdmin.js";

/** Minimal DB read so Supabase free tier sees activity (resets ~7-day pause timer). */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!authorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return res.status(503).json({ ok: false, error: error.message });
    }

    if (req.method === "HEAD") {
      return res.status(204).end();
    }

    return res.status(200).json({
      ok: true,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({ ok: false, error: err.message });
  }
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const auth = req.headers.authorization;
  if (auth === `Bearer ${secret}`) return true;

  const key = req.query?.key;
  if (typeof key === "string" && key === secret) return true;

  return false;
}
