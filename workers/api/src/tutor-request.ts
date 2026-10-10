// Best-effort per-isolate duplicate protection. PostgreSQL quotas remain the
// cross-isolate security boundary; this is not a distributed exactly-once claim.
import { HttpError } from "./supabase";
const flights = new Map<
  string,
  { fingerprint: string; until: number; result: Promise<unknown> }
>();
export async function tutorRequest<T>(
  user: string,
  key: string | undefined,
  fingerprint: string,
  run: () => Promise<T>,
  now = Date.now(),
): Promise<T> {
  if (!key) return run();
  for (const [id, value] of flights) if (value.until <= now) flights.delete(id);
  const id = `${user}:${key}`,
    cached = flights.get(id);
  if (cached) {
    if (cached.fingerprint !== fingerprint)
      throw new HttpError(409, "CONFLICT");
    return cached.result as Promise<T>;
  }
  if (flights.size >= 100) throw new HttpError(429, "AI_USER_FAIR_USE");
  const result = run();
  flights.set(id, { fingerprint, until: now + 30000, result });
  try {
    return await result;
  } catch (error) {
    flights.delete(id);
    throw error;
  }
}
