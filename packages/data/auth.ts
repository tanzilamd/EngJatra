import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export const demo = import.meta.env.MODE === "demo";
export const apiBase = demo ? "" : (import.meta.env.VITE_API_URL ?? "");
export const configured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null =
  configured && !demo
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      )
    : null;
