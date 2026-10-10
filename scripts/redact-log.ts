export function redactLog(
  line: string,
  env: Record<string, string | undefined>,
  inMemorySecrets: (string | undefined)[] = [],
) {
  for (const name of [
    "CLOUDFLARE_API_TOKEN",
    "GEMMA_API_KEY",
    "LLAMA_API_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "SUPABASE_ACCESS_TOKEN",
    "ENGJATRA_SMOKE_TOKEN",
  ]) {
    for (const value of env[name]?.split(/\r?\n/) ?? [])
      if (value.length >= 8) line = line.replaceAll(value, "[redacted]");
  }
  for (const value of inMemorySecrets)
    if (value && value.length >= 8) line = line.replaceAll(value, "[redacted]");
  return line.replace(
    /AIza[\w-]{25,}|gsk_[A-Za-z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|sb_secret_[\w-]+|gh[pousr]_[A-Za-z0-9]{30,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    "[redacted]",
  );
}
