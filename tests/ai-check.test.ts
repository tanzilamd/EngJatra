import { it, expect, vi } from "vitest";
import { checkGemma } from "../scripts/ai-check";
it("metadata check uses only a bounded protected GET, even with a configured disabled key", async () => {
  const network = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        name: "models/gemma-test-it",
        supportedGenerationMethods: ["generateContent"],
      }),
    ),
  );
  const report = await checkGemma(
    {
      GEMMA_API_KEY: "private-test-key",
      GEMMA_MODEL: "gemma-test-it",
      GEMMA_FREE_CONFIRMED: "false",
    },
    network,
  );
  expect(report).toMatchObject({
    status: "METADATA VERIFIED",
    enabled: false,
    inference_tested: false,
  });
  expect(network).toHaveBeenCalledTimes(1);
  expect(network.mock.calls[0][1]).not.toHaveProperty("body");
  expect(network.mock.calls[0][1].headers["x-goog-api-key"]).toBe(
    "private-test-key",
  );
  expect(JSON.stringify(report)).not.toContain("private-test-key");
});
it("absent credentials, forbidden metadata and incompatible models remain unverified without raw provider errors", async () => {
  const env = {
    GEMMA_API_KEY: "private-test-key",
    GEMMA_MODEL: "gemma-test-it",
  };
  const network = vi.fn();
  expect((await checkGemma({}, network)).status).toBe("NOT VERIFIED");
  expect(network).not.toHaveBeenCalled();
  network.mockResolvedValueOnce(
    new Response("private provider error", { status: 403 }),
  );
  expect(JSON.stringify(await checkGemma(env, network))).not.toContain(
    "private provider error",
  );
  network.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ name: "models/other", supportedGenerationMethods: [] }),
    ),
  );
  expect((await checkGemma(env, network)).status).toBe("BLOCKED");
});
