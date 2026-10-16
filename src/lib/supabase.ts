import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/public-env";

const supabaseUrl =
  publicEnv("VITE_SUPABASE_URL") || "https://placeholder.supabase.co";
const supabaseAnonKey =
  publicEnv("VITE_SUPABASE_ANON_KEY") || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
