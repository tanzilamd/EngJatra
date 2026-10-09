import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Snapshot,
  initialProgress,
  type Progress,
  type SnapshotData,
  type TutorData,
  type TutorContext,
} from "../contracts/api";
import {
  Manifest,
  Unit,
  Library,
  type UnitData,
  type Band,
} from "../contracts/content";
export const demo = import.meta.env.MODE === "demo";
export const apiBase = import.meta.env.VITE_API_URL ?? "";
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
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(code);
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const session = await supabase?.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (demo) {
    headers["X-Local-User"] =
      localStorage.getItem("engjatra.demo.user") ?? "learner";
    headers["X-Local-Role"] =
      localStorage.getItem("engjatra.demo.role") ?? "learner";
  } else if (session?.data.session)
    headers.Authorization = `Bearer ${session.data.session.access_token}`;
  const r = await fetch(`${apiBase}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new ApiError(data.error ?? "REQUEST_FAILED", r.status, data);
  return data as T;
}
export async function loadManifest() {
  const r = await fetch("/content/manifest.json");
  if (!r.ok) throw Error("CONTENT_UNAVAILABLE");
  return Manifest.parse(await r.json());
}
export async function loadUnit(id: string, version: string): Promise<UnitData> {
  const band = id.split("-")[0];
  const r = await fetch(`/content/${version}/${band}/${id}.json`);
  if (!r.ok) throw Error("CONTENT_UNAVAILABLE");
  const unit = Unit.parse(await r.json());
  const blocked = await api<{ items: string[] }>("/content/blocked");
  if (blocked.items.includes(id)) throw Error("CONTENT_UNAVAILABLE");
  return {
    ...unit,
    exercises: unit.exercises.filter((a) => !blocked.items.includes(a.id)),
  };
}
export async function loadLibrary(band: Band, version: string) {
  const r = await fetch(`/content/${version}/${band}/library.json`);
  if (!r.ok) throw Error("CONTENT_UNAVAILABLE");
  const library = Library.parse(await r.json());
  const blocked = await api<{ items: string[] }>("/content/blocked");
  const ids = new Set(blocked.items);
  return {
    ...library,
    grammar: library.grammar.filter(
      (g) => !ids.has(g.id) && !ids.has(g.unit_id ?? ""),
    ),
    vocabulary: library.vocabulary.filter((v) => !ids.has(v.id)),
    readings: library.readings.filter((v) => !ids.has(v.id)),
    conversations: library.conversations.filter(
      (v) => !ids.has(v.id) && !ids.has(v.unit_id),
    ),
    checkpoint: {
      ...library.checkpoint,
      items: ids.has(library.checkpoint.id)
        ? []
        : library.checkpoint.items.filter((q) => !ids.has(q.item_id)),
    },
  };
}
export async function readSnapshot(): Promise<SnapshotData> {
  return Snapshot.parse(await api("/learning/snapshot"));
}
export async function writeSnapshot(
  state: Progress,
  revision: number,
  key: string,
) {
  return Snapshot.parse(
    await api("/learning/checkpoint", {
      state,
      expected_revision: revision,
      idempotency_key: key,
    }),
  );
}
export async function tutor(
  unit_id: string,
  release: string,
  text: string,
  context: TutorContext = [],
) {
  return api<{
    reply?: TutorData;
    error?: string;
    fallback_activity?: string;
    local_demo?: boolean;
  }>("/ai/tutor", { unit_id, release, text, context });
}
export const emptySnapshot = () => ({
  revision: 0,
  state: { ...initialProgress },
});
