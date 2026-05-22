import { createClient } from "@supabase/supabase-js";

/** Server-side admin client (Vercel API routes). Bypasses RLS. */
export function createSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing VITE_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(url, key);
}
