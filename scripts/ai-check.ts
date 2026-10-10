import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { normalizeUnit } from "./content-tools";
import { callProvider, ProviderError } from "../workers/api/src/ai";
import { googleCountries } from "../workers/api/src/ai-policy";
import type { Env } from "../workers/api/src/types";

// Credential validation only: never generate content while the deployment's
// account/free/audience eligibility gate is disabled. No key or raw error output.
export async function checkGemma(
  env: NodeJS.ProcessEnv,
  network: typeof fetch = fetch,
) {
  if (!env.GEMMA_API_KEY)
    return {
      status: "NOT VERIFIED",
      reason: "GEMMA_API_KEY is not bound",
      enabled: false,
    };
  const model = env.GEMMA_MODEL ?? "";
  if (!/^gemma[-\w.]+$/.test(model))
    return {
      status: "BLOCKED",
      reason: "GEMMA_MODEL must name an explicit Gemma model",
      enabled: false,
    };
  const response = await network(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
    {
      headers: { "x-goog-api-key": env.GEMMA_API_KEY },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (!response.ok)
    return {
      status: "BLOCKED",
      reason: `Provider model metadata HTTP ${response.status}`,
      enabled: false,
    };
  const data = (await response.json()) as {
    name?: string;
    supportedGenerationMethods?: string[];
  };
  const compatible =
    data.name === `models/${model}` &&
    data.supportedGenerationMethods?.includes("generateContent") === true;
  return {
    status: compatible ? "METADATA VERIFIED" : "BLOCKED",
    model,
    authentication_and_model: compatible,
    enabled: compatible && env.GEMMA_FREE_CONFIRMED === "true",
    inference_tested: false,
    reason: compatible
      ? "Metadata access verified; generation, account quota, audience/region eligibility and free-tier consent remain separate"
      : "Configured model does not advertise generateContent",
  };
}

// The existing main pipeline gates publication on two bounded synthetic
// inference calls only AFTER the operator's free/terms gate is explicitly true.
// No learner messages, session, billing changes, raw output or secrets archived.
export async function checkInference(
  env: NodeJS.ProcessEnv,
  network: typeof fetch = fetch,
) {
  const metadata = await checkGemma(env, network);
  if (!metadata.enabled) return metadata;
  if (!googleCountries(env.GEMMA_ALLOWED_COUNTRIES).length)
    return {
      ...metadata,
      status: "BLOCKED",
      enabled: false,
      reason: "No reviewed unpaid-service distribution countries configured",
    };
  const unit = normalizeUnit(
    JSON.parse(await readFile("content/units-public/P0/P0-01.json", "utf8")),
  );
  const provider: Env = {
    ENVIRONMENT: "production",
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    CONTENT_URL: "",
    ALLOWED_ORIGINS: "",
    GEMMA_API_KEY: env.GEMMA_API_KEY,
    GEMMA_MODEL: env.GEMMA_MODEL!,
    GEMMA_FREE_CONFIRMED: "true",
    LLAMA_FREE_CONFIRMED: "false",
    LLAMA_MODEL: "",
  };
  try {
    const greeting = await callProvider(
      "gemma",
      provider,
      unit,
      "Hello. I am learning English.",
      network,
    );
    const corrected = await callProvider(
      "gemma",
      provider,
      unit,
      "I goes to the market.",
      network,
      [
        { role: "user", text: "Hello. I am learning English." },
        {
          role: "assistant",
          text: `${greeting.assistant_reply_en} ${greeting.next_question_en}`.slice(
            0,
            1000,
          ),
        },
      ],
    );
    if (
      corrected.feedback_type === "none" ||
      !corrected.suggested_revision_en ||
      /\bI goes\b/i.test(corrected.suggested_revision_en)
    )
      return {
        ...metadata,
        status: "BLOCKED",
        enabled: false,
        inference_tested: true,
        reason: "Synthetic subject-verb correction was not valid",
      };
    return {
      ...metadata,
      status: "INFERENCE VERIFIED",
      inference_tested: true,
      synthetic_calls: 2,
      checks: [
        "bounded English replies and questions",
        "nonempty Bengali-script explanations",
        "exact lesson identity/structured schema",
        "known subject-verb correction",
        "bounded previous-message context supplied",
      ],
    };
  } catch (error) {
    return {
      ...metadata,
      status: "BLOCKED",
      enabled: false,
      inference_tested: true,
      reason:
        error instanceof ProviderError
          ? error.code
          : "Safe inference preflight failed",
      diagnostic: error instanceof ProviderError ? error.diagnostic : undefined,
    };
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await mkdir(".wrangler", { recursive: true });
  const report = await checkInference(process.env).catch(() => ({
    status: "BLOCKED",
    enabled: false,
    reason:
      "Provider metadata transport failed; no response body or credentials logged",
  }));
  await writeFile(
    ".wrangler/ai-check.local.json",
    JSON.stringify(
      { checked_at: new Date().toISOString(), ...report },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(report));
  if (
    process.env.GEMMA_FREE_CONFIRMED === "true" &&
    report.status !== "INFERENCE VERIFIED"
  )
    process.exitCode = 1;
}
