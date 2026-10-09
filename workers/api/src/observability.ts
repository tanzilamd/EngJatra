import { HttpError } from "./supabase";
// Never retain URLs, identifiers, request bodies, headers, user messages or exceptions.
export function logServerFailure(error: unknown, pathname: string) {
  const status = error instanceof HttpError ? error.status : 503;
  if (status < 500) return;
  const section = pathname.split("/")[2];
  const route = [
    "health",
    "content",
    "learning",
    "reports",
    "ai",
    "history",
    "account",
    "admin",
  ].includes(section)
    ? section
    : "other";
  console.error(
    JSON.stringify({
      event: "engjatra_api_failure",
      status,
      route,
      at: new Date().toISOString(),
    }),
  );
}
