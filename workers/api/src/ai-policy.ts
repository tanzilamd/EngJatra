// Explicitly reviewed available regions outside Google's paid-only EEA/CH/UK
// restriction. Expansion requires current official region/terms review.
// https://ai.google.dev/gemini-api/docs/available-regions
// https://ai.google.dev/gemini-api/terms (reviewed 2026-10-10)
export const reviewedGoogleCountries = new Set([
  "BD",
  "US",
  "IN",
  "CA",
  "AU",
  "NZ",
  "SG",
  "JP",
  "KR",
  "MY",
  "TH",
  "PH",
  "ID",
  "VN",
  "PK",
  "LK",
  "NP",
  "BT",
  "MV",
  "AE",
  "SA",
  "QA",
  "BH",
  "OM",
  "KW",
  "TR",
  "ZA",
  "KE",
  "NG",
  "GH",
  "EG",
  "MA",
  "BR",
  "AR",
  "CL",
  "MX",
  "CO",
  "PE",
  "UY",
  "EC",
  "CR",
  "PA",
  "JM",
]);
export function googleCountries(value: string | undefined) {
  const countries = (value ?? "").split(",").map((c) => c.trim());
  if (
    !countries.length ||
    countries.some((c) => !reviewedGoogleCountries.has(c))
  )
    return [];
  return [...new Set(countries)];
}
export function googleCountryAllowed(
  value: string | undefined,
  country?: string,
) {
  // Country is trusted Cloudflare request.cf metadata, never a client header.
  return !!country && googleCountries(value).includes(country);
}
export function containsPrivateInput(text: string) {
  // Reject recognizable contact details/credentials, not a claim to anonymize
  // arbitrary names or prose. Learners must still avoid personal information.
  const normalized = text.replace(/[০-৯]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x09e6),
  );
  if (
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:AIza[\w-]{20,}|gsk_[\w-]{20,}|sb_secret_[\w-]+)|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(
      normalized,
    )
  )
    return true;
  // A complete ISO-shaped date is useful authored practice, not a phone
  // number. This recognizes formatting only, not whether prose is personal.
  return (normalized.match(/\+?\d[\d ()-]{6,}\d/g) ?? []).some(
    (number) =>
      !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(number),
  );
}
