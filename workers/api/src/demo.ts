import {
  initialProgress,
  type SnapshotData,
  type Progress,
} from "../../../packages/contracts/api";
import { HttpError } from "./supabase";
import type { Identity, Role } from "./types";
export interface Draft {
  unit_id: string;
  release: string;
  patch: unknown;
  admin_notes: string;
  revision: number;
  review_status?: string;
}
export interface DemoReport {
  id: string;
  reporter_id: string;
  unit_id: string;
  item_id: string;
  release: string;
  category: string;
  text: string;
  state: string;
  created_at: string;
}
export const demoState = {
  snapshots: new Map<string, SnapshotData>(),
  receipts: new Map<string, SnapshotData>(),
  reports: [] as DemoReport[],
  drafts: new Map<string, Draft>(),
  blocks: new Set<string>(),
  audit: [] as {
    actor: string;
    action: string;
    object_id: string;
    created_at: string;
  }[],
  releases: [] as { id: string; manifest_sha256: string; state: string }[],
  usage: new Map<
    string,
    { count: number; minute: number; minuteCount: number }
  >(),
  history: new Map<
    string,
    {
      id: string;
      unit_id: string;
      created_at: string;
      messages: { role: string; content: string }[];
    }[]
  >(),
};
export function demoIdentity(request: Request): Identity {
  const role = request.headers.get("X-Local-Role") ?? "learner";
  const valid: Role[] = [
    "learner",
    "content_reviewer",
    "content_editor",
    "admin",
    "owner",
  ];
  if (!valid.includes(role as Role)) throw new HttpError(403, "FORBIDDEN");
  const name = request.headers.get("X-Local-User") ?? "learner";
  if (!["learner", "learner-two", "staff"].includes(name))
    throw new HttpError(401, "USER_SESSION_EXPIRED");
  return { id: name, token: "", role: role as Role, demo: true };
}
export function demoRead(id: string) {
  return (
    demoState.snapshots.get(id) ?? {
      revision: 0,
      state: structuredClone(initialProgress),
    }
  );
}
export function demoSave(
  id: string,
  state: Progress,
  expected: number,
  key: string,
) {
  const receipt = demoState.receipts.get(`${id}:${key}`);
  if (receipt) return receipt;
  const current = demoRead(id);
  if (expected !== current.revision)
    throw new HttpError(409, "CONFLICT", { snapshot: current });
  const next = {
    revision: expected + 1,
    state: {
      ...state,
      completed: [...new Set([...current.state.completed, ...state.completed])],
    },
  };
  demoState.snapshots.set(id, next);
  demoState.receipts.set(`${id}:${key}`, next);
  return next;
}
export function demoBudget(id: string, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const u = demoState.usage.get(id) ?? { count: 0, minute, minuteCount: 0 };
  if (u.minute !== minute) {
    u.minute = minute;
    u.minuteCount = 0;
  }
  if (u.count >= 20 || u.minuteCount >= 4) return false;
  u.count++;
  u.minuteCount++;
  demoState.usage.set(id, u);
  return true;
}
