/** Client-side Supabase env (Vite exposes VITE_* only). */
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";

/** Prefer new publishable key; fall back to legacy anon JWT. */
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
