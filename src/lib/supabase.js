import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabasePublishableKey, isSupabaseConfigured } from "./supabaseConfig.js";

export { isSupabaseConfigured };

export const supabase = createClient(supabaseUrl || "", supabasePublishableKey || "");
