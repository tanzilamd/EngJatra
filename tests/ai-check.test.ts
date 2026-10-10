import { it, expect, vi } from "vitest";
import { checkGemma, checkInference } from "../scripts/ai-check";
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

it("activation preflight performs two schema-checked synthetic calls only after explicit free and region gates", async () => {
  const reply = {
    assistant_reply_en: "Good start!",
    short_explanation_bn: "I-এর পরে go বসে।",
    feedback_type: "clear_error",
    suggested_revision_en: "I go to the market.",
    next_question_en: "What do you buy?",
    learning_tags: ["grammar"],
    source_unit_id: "P0-01",
  };
  const network = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "models/gemma-test-it",
          supportedGenerationMethods: ["generateContent"],
        }),
      ),
    )
    .mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(reply) }] } },
            ],
          }),
        ),
    );
  const env = {
    GEMMA_API_KEY: "private-test-key",
    GEMMA_MODEL: "gemma-test-it",
    GEMMA_FREE_CONFIRMED: "true",
    GEMMA_ALLOWED_COUNTRIES: "BD,US",
  };
  expect(await checkInference(env, network)).toMatchObject({
    status: "INFERENCE VERIFIED",
    inference_tested: true,
    synthetic_calls: 2,
  });
  expect(network).toHaveBeenCalledTimes(3);
  expect(
    JSON.parse(network.mock.calls[2][1].body).contents[0].parts[0].text,
  ).toContain("Good start!");
  network.mockClear().mockResolvedValue(
    new Response(
      JSON.stringify({
        name: "models/gemma-test-it",
        supportedGenerationMethods: ["generateContent"],
      }),
    ),
  );
  expect(
    await checkInference({ ...env, GEMMA_ALLOWED_COUNTRIES: "GB" }, network),
  ).toMatchObject({ status: "BLOCKED", inference_tested: false });
  expect(network).toHaveBeenCalledTimes(1);
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
