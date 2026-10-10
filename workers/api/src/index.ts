import { z } from "zod";
import {
  CheckpointInput,
  TutorInput,
  Report,
  Snapshot,
  TutorReply,
} from "../../../packages/contracts/api";
import { Unit, unitId, Manifest } from "../../../packages/contracts/content";
import { enabled, routeTutor } from "./ai";
import { logServerFailure } from "./observability";
import {
  authenticate,
  authorize,
  db,
  HttpError,
  validateBackend,
} from "./supabase";
import {
  demoIdentity,
  demoRead,
  demoSave,
  demoState,
  demoBudget,
} from "./demo";
import type { Env, Fetcher, Role } from "./types";
const staff: Role[] = ["content_reviewer", "content_editor", "admin", "owner"];
const editor: Role[] = ["content_editor", "admin", "owner"];
const managers: Role[] = ["admin", "owner"];
const ReportAction = z
  .object({
    id: z.string().uuid(),
    state: z.enum(["open", "investigating", "resolved"]),
  })
  .strict();
const DraftAction = z
  .object({
    unit_id: unitId,
    release: z.string().regex(/^\d+\.\d+\.\d+$/),
    patch: Unit,
    admin_notes: z.string().max(2000),
    expected_revision: z.number().int().nonnegative(),
  })
  .strict();
const ReviewAction = z
  .object({
    unit_id: unitId,
    review_status: z.enum(["draft", "under_review", "ready"]),
    admin_notes: z.string().max(2000),
    expected_revision: z.number().int().positive(),
  })
  .strict();
const BlockAction = z
  .object({
    item_id: z
      .string()
      .regex(
        /^(?:(P0|A1|A2|B1|B2|C1)-(0[1-9]|1[0-6])(?:-[A-Za-z-]+)?|(?:P0|A1|A2|B1|B2|C1)-G[0-9]{2}|VOC-[0-9]{4}|R-(?:B2|C1)-[0-9]{2}|SC-(?:P0|A1|A2|B1|B2|C1)-[0-9]{2}|CHK-(?:P0|A1|A2|B1|B2|C1))$/,
      ),
    blocked: z.boolean(),
  })
  .strict();
const ReleaseAction = z
  .object({
    id: z.string().regex(/^\d+\.\d+\.\d+$/),
    manifest_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const enc = new TextEncoder();
async function hash(s: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_REQUEST");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 320000) {
      await reader.cancel();
      throw new HttpError(413, "REQUEST_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let n = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, n);
    n += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "INVALID_REQUEST");
  }
}
async function content(
  env: Env,
  path: string,
  local: boolean,
  request: Fetcher,
) {
  if (
    !env.CONTENT_URL ||
    (!local && !/^https:\/\/[a-z0-9.-]+$/.test(env.CONTENT_URL))
  )
    throw new HttpError(503, "CONTENT_UNAVAILABLE");
  const r = await request(`${env.CONTENT_URL}/content/${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new HttpError(503, "CONTENT_UNAVAILABLE");
  return r;
}
export async function handle(
  request: Request,
  env: Env,
  network: Fetcher = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const localRuntime =
    env.ENVIRONMENT === "local" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  const local =
    env.ENVIRONMENT === "local" &&
    env.LOCAL_DEMO === "true" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] =
      "Content-Type, Authorization" +
      (local ? ", X-Local-User, X-Local-Role" : "");
    headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
  }
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  try {
    if (origin && !allowed.includes(origin))
      throw new HttpError(403, "ORIGIN_FORBIDDEN");
    if (env.LOCAL_DEMO === "true" && !local)
      throw new HttpError(503, "SETUP_REQUIRED");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (url.pathname === "/api/health")
      return json({ ok: true, local_demo: local });
    if (url.pathname === "/api/content/blocked" && request.method === "GET") {
      if (local) return json({ items: [...demoState.blocks] });
      validateBackend(env);
      const rows = await db<{ item_id: string }[]>(
        env,
        { id: "", token: "", role: "learner", demo: false },
        "content_blocks?select=item_id",
      );
      return json({ items: rows.map((r) => r.item_id) });
    }
    const identity = local
      ? demoIdentity(request)
      : await authenticate(request, env, network);
    const rpc = <T>(name: string, data: unknown) =>
      db<T>(env, identity, `rpc/${name}`, data, "POST", network);
    if (url.pathname === "/api/learning/snapshot" && request.method === "GET")
      return json(
        identity.demo
          ? demoRead(identity.id)
          : Snapshot.parse(await rpc("read_snapshot", {})),
      );
    if (
      url.pathname === "/api/learning/checkpoint" &&
      request.method === "POST"
    ) {
      const p = CheckpointInput.parse(await body(request));
      if (identity.demo)
        return json(
          demoSave(
            identity.id,
            p.state,
            p.expected_revision,
            p.idempotency_key,
          ),
        );
      const result = await rpc<{ conflict?: boolean; snapshot?: unknown }>(
        "save_checkpoint",
        {
          p_expected: p.expected_revision,
          p_key: p.idempotency_key,
          p_state: p.state,
        },
      );
      if (result.conflict)
        throw new HttpError(409, "CONFLICT", { snapshot: result.snapshot });
      return json(Snapshot.parse(result));
    }
    if (url.pathname === "/api/reports" && request.method === "POST") {
      const p = Report.parse(await body(request));
      if (identity.demo) {
        if (
          demoState.reports.filter((r) => r.reporter_id === identity.id)
            .length >= 10
        )
          throw new HttpError(429, "REPORT_LIMIT");
        const id = crypto.randomUUID();
        demoState.reports.push({
          ...p,
          id,
          reporter_id: identity.id,
          state: "open",
          created_at: new Date().toISOString(),
        });
        return json({ id });
      }
      return json({ id: await rpc("submit_report", { p_report: p }) });
    }
    if (url.pathname === "/api/ai/tutor" && request.method === "POST") {
      const p = TutorInput.parse(await body(request));
      const response = await content(
        env,
        `${p.release}/${p.unit_id.split("-")[0]}/${p.unit_id}.json`,
        localRuntime,
        network,
      );
      const unit = Unit.parse(await response.json());
      const blocks = identity.demo
        ? [...demoState.blocks]
        : (
            await db<{ item_id: string }[]>(
              env,
              identity,
              "content_blocks?select=item_id",
              undefined,
              "GET",
              network,
            )
          ).map((b) => b.item_id);
      if (blocks.includes(unit.id))
        throw new HttpError(409, "CONTENT_UNAVAILABLE");
      if (!identity.demo && !enabled(env, "gemma") && !enabled(env, "llama"))
        return json({
          error: "AI_PROVIDER_UNCONFIGURED",
          fallback_activity: unit.exercises.find((a) => !blocks.includes(a.id))
            ?.id,
        });
      const budget = identity.demo
        ? demoBudget(identity.id)
        : await rpc<boolean>("consume_ai", {});
      if (!budget)
        return json({
          error: "AI_USER_FAIR_USE",
          fallback_activity: unit.exercises[0].id,
        });
      if (identity.demo)
        return json({
          error: "AI_PROVIDER_UNCONFIGURED",
          fallback_activity: unit.exercises.find((a) => !blocks.includes(a.id))
            ?.id,
          local_demo: true,
        });
      const result = await routeTutor(
        env,
        unit,
        p.text,
        network,
        Date.now(),
        p.context,
      );
      if (result.reply) {
        TutorReply.parse(result.reply);
        await rpc("save_chat", {
          p_unit: unit.id,
          p_user: p.text,
          p_reply: result.reply.assistant_reply_en,
        }).catch(() => null);
        return json({ reply: result.reply });
      }
      return json(result);
    }
    if (url.pathname === "/api/account/export" && request.method === "GET") {
      if (identity.demo)
        return json({
          snapshot: demoRead(identity.id),
          reports: demoState.reports.filter(
            (r) => r.reporter_id === identity.id,
          ),
          history: demoState.history.get(identity.id) ?? [],
        });
      const names = [
        "profiles",
        "learner_settings",
        "learner_paths",
        "unit_progress",
        "vocabulary_mastery",
        "mistake_events",
        "activity_attempts",
        "user_reports",
        "conversations",
        "messages",
      ];
      const data: Record<string, unknown> = {};
      for (const table of names) {
        data[table] = await db(
          env,
          identity,
          `${table}?${table === "user_reports" ? "reporter_id" : "user_id"}=eq.${identity.id}&select=*&limit=10000`,
          undefined,
          "GET",
          network,
        );
      }
      return json(data);
    }
    if (url.pathname === "/api/history" && request.method === "DELETE") {
      if (identity.demo) demoState.history.delete(identity.id);
      else await rpc("clear_history", {});
      return json({ ok: true });
    }
    if (url.pathname === "/api/history" && request.method === "GET") {
      const page = Number(url.searchParams.get("page") ?? 0);
      if (!Number.isInteger(page) || page < 0 || page > 100)
        throw new HttpError(400, "INVALID_REQUEST");
      return json(
        identity.demo
          ? (demoState.history.get(identity.id) ?? []).slice(
              page * 10,
              page * 10 + 10,
            )
          : await db(
              env,
              identity,
              `conversations?user_id=eq.${identity.id}&select=id,unit_id,created_at&order=created_at.desc&offset=${page * 10}&limit=10`,
              undefined,
              "GET",
              network,
            ),
      );
    }
    if (
      /^\/api\/history\/[a-f0-9-]{36}$/.test(url.pathname) &&
      request.method === "GET"
    ) {
      const id = url.pathname.split("/").at(-1);
      return json(
        identity.demo
          ? ((demoState.history.get(identity.id) ?? []).find((h) => h.id === id)
              ?.messages ?? [])
          : await db(
              env,
              identity,
              `messages?conversation_id=eq.${id}&user_id=eq.${identity.id}&select=role,content&order=created_at&limit=50`,
              undefined,
              "GET",
              network,
            ),
      );
    }
    if (url.pathname.startsWith("/api/admin/")) {
      authorize(identity, staff);
      const section = url.pathname.slice("/api/admin/".length);
      if (section === "session" && request.method === "GET")
        return json({ role: identity.role, local_demo: identity.demo });
      if (section === "overview" && request.method === "GET")
        return json(
          identity.demo
            ? {
                reports: demoState.reports,
                releases: demoState.releases,
                audit: demoState.audit.slice(-50).reverse(),
                usage: [...demoState.usage].map(([scope, u]) => ({
                  scope,
                  count: u.count,
                })),
                health: [],
                blocks: [...demoState.blocks],
              }
            : {
                reports: await db(
                  env,
                  identity,
                  "user_reports?select=*&order=created_at.desc&limit=100",
                  undefined,
                  "GET",
                  network,
                ),
                releases: await db(
                  env,
                  identity,
                  "content_releases?select=*&order=created_at.desc&limit=30",
                  undefined,
                  "GET",
                  network,
                ),
                audit: await db(
                  env,
                  identity,
                  "admin_audit?select=actor,action,object_id,created_at&order=created_at.desc&limit=50",
                  undefined,
                  "GET",
                  network,
                ),
                usage: await db(
                  env,
                  identity,
                  "usage_counters?select=scope,count,window_start&limit=100",
                  undefined,
                  "GET",
                  network,
                ),
                health: await db(
                  env,
                  identity,
                  "provider_health?select=provider,category,observed_at",
                  undefined,
                  "GET",
                  network,
                ),
                blocks: (
                  await db<{ item_id: string }[]>(
                    env,
                    identity,
                    "content_blocks?select=item_id",
                    undefined,
                    "GET",
                    network,
                  )
                ).map((b) => b.item_id),
              },
        );
      if (section === "drafts" && request.method === "GET")
        return json(
          identity.demo
            ? [...demoState.drafts.values()]
            : await db(
                env,
                identity,
                "content_overrides?select=*&order=updated_at.desc&limit=100",
                undefined,
                "GET",
                network,
              ),
        );
      if (section === "export" && request.method === "GET") {
        authorize(identity, editor);
        const drafts = identity.demo
          ? [...demoState.drafts.values()]
          : await db<{ unit_id: string; release: string; patch: unknown }[]>(
              env,
              identity,
              "content_overrides?select=unit_id,release,patch&limit=100",
              undefined,
              "GET",
              network,
            );
        return json({
          patches: drafts.map((d) => ({
            unit_id: d.unit_id,
            base_release: d.release,
            unit: Unit.parse(d.patch),
          })),
        });
      }
      if (section === "content" && request.method === "GET") {
        const id = unitId.parse(url.searchParams.get("id"));
        const manifest = Manifest.parse(
          await (
            await content(env, "manifest.json", localRuntime, network)
          ).json(),
        );
        return json({
          release: manifest.version,
          unit: Unit.parse(
            await (
              await content(
                env,
                `${manifest.version}/${id.split("-")[0]}/${id}.json`,
                localRuntime,
                network,
              )
            ).json(),
          ),
        });
      }
      if (section === "support" && request.method === "GET") {
        authorize(identity, managers);
        return json(
          identity.demo
            ? [{ user_id: "learner", alias: "স্থানীয় শিক্ষার্থী" }]
            : await db(
                env,
                identity,
                "profiles?select=user_id,alias&limit=50",
                undefined,
                "GET",
                network,
              ),
        );
      }
      if (section === "verify" && request.method === "POST") {
        authorize(identity, managers);
        const p = ReleaseAction.extend({
          batch: z.number().int().min(0).max(3),
        }).parse(await body(request));
        const response = await content(
          env,
          "manifest.json",
          localRuntime,
          network,
        );
        const raw = await response.text();
        const manifest = Manifest.parse(JSON.parse(raw));
        if (
          manifest.version !== p.id ||
          (await hash(raw)) !== p.manifest_sha256
        )
          throw new HttpError(409, "DEPLOYMENT_NOT_CONFIRMED");
        for (const u of manifest.levels
          .flatMap((l) => l.units)
          .slice(p.batch * 24, p.batch * 24 + 24)) {
          const r = await content(
            env,
            `${manifest.version}/${u.id.split("-")[0]}/${u.id}.json`,
            localRuntime,
            network,
          );
          if ((await hash(await r.text())) !== u.sha256)
            throw new HttpError(409, "DEPLOYMENT_NOT_CONFIRMED");
        }
        return json({
          verified_batch: p.batch,
          requires_owner_record: true,
          id: p.id,
        });
      }
      if (
        request.method === "POST" &&
        ["report", "draft", "review", "block", "release", "rollback"].includes(
          section,
        )
      ) {
        const raw = await body(request);
        const parsed =
          section === "report"
            ? ReportAction.parse(raw)
            : section === "review"
              ? ReviewAction.parse(raw)
              : section === "draft"
                ? DraftAction.parse(raw)
                : section === "block"
                  ? BlockAction.parse(raw)
                  : section === "release"
                    ? ReleaseAction.parse(raw)
                    : z
                        .object({ id: z.string().regex(/^\d+\.\d+\.\d+$/) })
                        .strict()
                        .parse(raw);
        authorize(
          identity,
          section === "report" || section === "review"
            ? staff
            : section === "draft"
              ? editor
              : managers,
        );
        if (section === "draft") {
          const draft = DraftAction.parse(parsed);
          if (draft.patch.id !== draft.unit_id)
            throw new HttpError(400, "INVALID_REQUEST");
        }
        if (identity.demo) {
          if (section === "review") {
            const p = ReviewAction.parse(parsed);
            const current = demoState.drafts.get(p.unit_id);
            if (!current || current.revision !== p.expected_revision)
              throw new HttpError(409, "CONFLICT");
            demoState.drafts.set(p.unit_id, {
              ...current,
              review_status: p.review_status,
              admin_notes: p.admin_notes,
              revision: current.revision + 1,
            });
          }
          if (section === "report") {
            const p = ReportAction.parse(parsed);
            const r = demoState.reports.find((r) => r.id === p.id);
            if (r) r.state = p.state;
          }
          if (section === "draft") {
            const p = DraftAction.parse(parsed);
            const current = demoState.drafts.get(p.unit_id);
            if ((current?.revision ?? 0) !== p.expected_revision)
              throw new HttpError(409, "CONFLICT");
            demoState.drafts.set(p.unit_id, {
              ...p,
              revision: p.expected_revision + 1,
            });
          }
          if (section === "block") {
            const p = BlockAction.parse(parsed);
            if (p.blocked) demoState.blocks.add(p.item_id);
            else demoState.blocks.delete(p.item_id);
          }
          if (section === "release") {
            const p = ReleaseAction.parse(parsed);
            if (!demoState.releases.some((r) => r.id === p.id))
              demoState.releases.push({ ...p, state: "awaiting_deploy" });
          }
          if (section === "rollback") {
            const p = parsed as { id: string };
            const r = demoState.releases.find((r) => r.id === p.id);
            if (r) r.state = "rollback_requested";
          }
          demoState.audit.push({
            actor: identity.id,
            action: section,
            object_id: JSON.stringify(parsed).slice(0, 100),
            created_at: new Date().toISOString(),
          });
          return json({ ok: true });
        }
        await rpc("admin_mutate", { p_action: section, p_data: parsed });
        return json({ ok: true });
      }
    }
    throw new HttpError(404, "NOT_FOUND");
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: "INVALID_REQUEST" }, 400);
    logServerFailure(e, url.pathname);
    if (e instanceof HttpError)
      return json({ error: e.code, ...e.extra }, e.status);
    return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
export default {
  fetch(request: Request, env: Env) {
    return handle(request, env);
  },
};
