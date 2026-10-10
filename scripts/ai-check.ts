import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await mkdir(".wrangler", { recursive: true });
  const report = await checkGemma(process.env).catch(() => ({
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
    report.status !== "METADATA VERIFIED"
  )
    process.exitCode = 1;
}
