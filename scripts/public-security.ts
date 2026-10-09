import { publicKey } from "./deployment-config";
export function scanPublicText(text: string) {
  if (
    /(AIza[\w-]{25,}|sk-[A-Za-z0-9]{20,}|gsk_[A-Za-z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]{20,}|sb_secret_[\w-]+|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
      text,
    )
  )
    throw Error("Potential private credential in public artifact");
  for (const token of text.match(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  ) ?? []) {
    // Legacy Supabase anon JWTs are intentionally public. User/service tokens are not.
    try {
      publicKey(token);
    } catch {
      throw Error("Non-public JWT in public artifact");
    }
  }
}
