import type { Env, Identity, Fetcher, Role } from "./types";
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}
export function validateBackend(env: Env) {
  if (
    !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.SUPABASE_URL) ||
    !env.SUPABASE_ANON_KEY
  )
    throw new HttpError(503, "SETUP_REQUIRED");
}
export async function db<T>(
  env: Env,
  identity: Identity,
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  request: Fetcher = fetch,
): Promise<T> {
  validateBackend(env);
  const r = await request(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      ...(identity.token ? { Authorization: `Bearer ${identity.token}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const error = (await r.json().catch(() => ({}))) as { message?: string };
    if (error.message?.includes("CONFLICT"))
      throw new HttpError(409, "CONFLICT");
    if (error.message?.includes("FORBIDDEN"))
      throw new HttpError(403, "FORBIDDEN");
    if (error.message?.includes("REPORT_LIMIT"))
      throw new HttpError(429, "REPORT_LIMIT");
    throw new HttpError(r.status === 401 ? 401 : 503, "BACKEND_UNAVAILABLE");
  }
  return (await r.json().catch(() => null)) as T;
}
export async function authenticate(
  request: Request,
  env: Env,
  network: Fetcher = fetch,
): Promise<Identity> {
  validateBackend(env);
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ") || auth.length > 6000)
    throw new HttpError(401, "USER_SESSION_EXPIRED");
  const token = auth.slice(7);
  const response = await network(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(401, "USER_SESSION_EXPIRED");
  const user = (await response.json()) as { id?: string };
  if (!user.id || !/^[-a-f0-9]{36}$/.test(user.id))
    throw new HttpError(401, "USER_SESSION_EXPIRED");
  const identity: Identity = {
    id: user.id,
    token,
    role: "learner",
    demo: false,
  };
  const rows = await db<{ role: Role }[]>(
    env,
    identity,
    `admin_memberships?user_id=eq.${user.id}&select=role`,
    undefined,
    "GET",
    network,
  );
  identity.role = rows[0]?.role ?? "learner";
  return identity;
}
export function authorize(identity: Identity, roles: Role[]) {
  if (!roles.includes(identity.role)) throw new HttpError(403, "FORBIDDEN");
}
