import type { SupabaseClient } from "@supabase/supabase-js";
export const demo = import.meta.env.MODE === "demo";
export const apiBase = demo ? "" : (import.meta.env.VITE_API_URL ?? "");
export const configured =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;
export let supabase: SupabaseClient | null = null;
let initializing: Promise<SupabaseClient | null> | undefined;
// One shared client/subscription, loaded after the public first render. Browser
// SDK/network readiness must never be confused with a successful sign-in.
export function initializeSupabase(): Promise<SupabaseClient | null> {
  if (!configured || demo) return Promise.resolve(null);
  return (initializing ??= import("@supabase/supabase-js")
    .then(({ createClient }) => {
      supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      );
      return supabase;
    })
    .catch((error) => {
      initializing = undefined;
      throw error;
    }));
}
