// Only the public suspension IDs are retained. Never cache credentials, API
// responses, review reasons or learner records here. Online reads always refresh.
export const suspensionMaxAge = 24 * 60 * 60 * 1000;
export function parseSuspensions(value: unknown): string[] {
  if (
    !value ||
    typeof value !== "object" ||
    !("items" in value) ||
    !Array.isArray(value.items) ||
    value.items.length > 10000 ||
    !value.items.every(
      (id) => typeof id === "string" && /^[A-Za-z0-9:_-]{1,160}$/.test(id),
    )
  )
    throw new Error("CONTENT_UNAVAILABLE");
  return value.items as string[];
}
export async function publicSuspensions(
  source: string,
  read: () => Promise<unknown>,
  storage: Pick<Storage, "getItem" | "setItem">,
  online: boolean,
  now = Date.now(),
) {
  const key = `engjatra.public-suspensions.${source}`;
  if (online) {
    const items = parseSuspensions(await read());
    try {
      storage.setItem(key, JSON.stringify({ items, observedAt: now }));
    } catch {
      /* Reading online does not require persistent storage. */
    }
    return items;
  }
  try {
    const previous = JSON.parse(storage.getItem(key) || "null") as {
      items: unknown;
      observedAt: number;
    };
    if (
      !previous ||
      !Number.isFinite(previous.observedAt) ||
      now < previous.observedAt ||
      now - previous.observedAt > suspensionMaxAge
    )
      throw new Error();
    return parseSuspensions(previous);
  } catch {
    throw new Error("CONTENT_UNAVAILABLE");
  }
}
