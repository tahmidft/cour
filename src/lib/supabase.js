import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabasePublishableKey, isSupabaseConfigured } from "./supabaseConfig.js";

export { isSupabaseConfigured };

export const supabase = createClient(supabaseUrl || "", supabasePublishableKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "cour-auth",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
