import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { normalizeUnit } from "./content-tools";
import { callProvider, ProviderError } from "../workers/api/src/ai";
import { googleCountries } from "../workers/api/src/ai-policy";
import type { Env } from "../workers/api/src/types";
import { correctsSyntheticSentence } from "./qa-tutor-correction";
import { z } from "zod";
import { TutorReply } from "../packages/contracts/api";
import { containsPrivateInput } from "../workers/api/src/ai-policy";

// Only the two fixed authored synthetic cases. This provides reviewable safe
// evidence through Checks API when signed log/artifact transport is unavailable.
export function syntheticPreflightNotice(report: unknown) {
  const parsed = z
    .object({
      status: z.literal("INFERENCE VERIFIED"),
      model: z.string().regex(/^gemma[-\w.]+$/),
      synthetic_calls: z.literal(2),
      synthetic_samples: z.tuple([
        z.object({ case: z.literal("greeting"), reply: TutorReply }).strict(),
        z.object({ case: z.literal("correction"), reply: TutorReply }).strict(),
      ]),
    })
    .strip()
    .safeParse(report);
  if (
    !parsed.success ||
    parsed.data.synthetic_samples.some(({ reply }) =>
      [
        reply.assistant_reply_en,
        reply.short_explanation_bn,
        reply.suggested_revision_en ?? "",
        reply.next_question_en,
      ].some(containsPrivateInput),
    )
  )
    return undefined;
  const text = JSON.stringify(parsed.data)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  return `::notice title=EngJatra synthetic AI preflight::${text}`;
}

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
  options: { includeSyntheticSamples?: boolean } = {},
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
  let attempted = 0;
  try {
    attempted++;
    const greeting = await callProvider(
      "gemma",
      provider,
      unit,
      "Hello. I am learning English.",
      network,
    );
    attempted++;
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
    if (!correctsSyntheticSentence(corrected))
      return {
        ...metadata,
        status: "BLOCKED",
        enabled: false,
        inference_tested: true,
        synthetic_calls_attempted: attempted,
        reason: "Synthetic subject-verb correction was not valid",
      };
    return {
      ...metadata,
      status: "INFERENCE VERIFIED",
      inference_tested: true,
      synthetic_calls_attempted: attempted,
      synthetic_calls: 2,
      ...(options.includeSyntheticSamples
        ? {
            synthetic_samples: [
              { case: "greeting", reply: greeting },
              { case: "correction", reply: corrected },
            ],
          }
        : {}),
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
      synthetic_calls_attempted: attempted,
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
  const report = await checkInference(process.env, fetch, {
    includeSyntheticSamples: process.argv.includes("--synthetic-samples"),
  }).catch(() => ({
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
    process.env.GITHUB_ACTIONS === "true" &&
    process.argv.includes("--synthetic-samples")
  ) {
    const notice = syntheticPreflightNotice(report);
    if (notice) console.log(notice);
  }
  if (
    process.env.GEMMA_FREE_CONFIRMED === "true" &&
    report.status !== "INFERENCE VERIFIED"
  )
    process.exitCode = 1;
}
