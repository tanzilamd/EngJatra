export interface Env {
  ENVIRONMENT: string;
  LOCAL_DEMO?: string;
  ALLOWED_ORIGINS: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CONTENT_URL: string;
  GEMMA_FREE_CONFIRMED: string;
  LLAMA_FREE_CONFIRMED: string;
  GEMMA_MODEL: string;
  LLAMA_MODEL: string;
  GEMMA_API_KEY?: string;
  GEMMA_ALLOWED_COUNTRIES?: string;
  LLAMA_API_KEY?: string;
}
export type Role =
  "learner" | "content_reviewer" | "content_editor" | "admin" | "owner";
export interface Identity {
  id: string;
  token: string;
  role: Role;
  demo: boolean;
}
export type Fetcher = typeof fetch;
