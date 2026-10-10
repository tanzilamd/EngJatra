import { it, expect, vi } from "vitest";
import {
  checkGemma,
  checkInference,
  syntheticPreflightNotice,
} from "../scripts/ai-check";
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
it("failed synthetic schema check records attempted count and safe field diagnosis without retrying or leaking output", async () => {
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
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      assistant_reply_en: "Hello!",
                      short_explanation_bn: "ভালো শুরু।",
                      feedback_type: "none",
                      suggested_revision_en: null,
                      next_question_en: "How are you?",
                      source_unit_id: "P0-01",
                      learning_tags: "private malformed provider value",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      ),
    );
  const report = await checkInference(
    {
      GEMMA_API_KEY: "private-test-key",
      GEMMA_MODEL: "gemma-test-it",
      GEMMA_FREE_CONFIRMED: "true",
      GEMMA_ALLOWED_COUNTRIES: "BD",
    },
    network,
  );
  expect(report).toMatchObject({
    status: "BLOCKED",
    enabled: false,
    synthetic_calls_attempted: 1,
    diagnostic: { stage: "schema", fields: ["learning_tags"] },
  });
  expect(network).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(report)).not.toMatch(
    /private-test-key|private malformed provider value/,
  );
});

it("validated synthetic samples are opt-in and never include the key or provider envelope", async () => {
  const reply = {
    assistant_reply_en: "Good start!",
    short_explanation_bn: "I-এর পরে go বসে।",
    feedback_type: "clear_error",
    suggested_revision_en: "I go to the market.",
    next_question_en: "What do you buy?",
    learning_tags: ["grammar"],
    source_unit_id: "P0-01",
  };
  const network = vi.fn().mockImplementation(
    async (_url, init) =>
      new Response(
        JSON.stringify(
          init?.method === "POST"
            ? {
                candidates: [
                  { content: { parts: [{ text: JSON.stringify(reply) }] } },
                ],
              }
            : {
                name: "models/gemma-test-it",
                supportedGenerationMethods: ["generateContent"],
              },
        ),
      ),
  );
  const env = {
    GEMMA_API_KEY: "private-test-key",
    GEMMA_MODEL: "gemma-test-it",
    GEMMA_FREE_CONFIRMED: "true",
    GEMMA_ALLOWED_COUNTRIES: "BD",
  };
  expect(await checkInference(env, network)).not.toHaveProperty(
    "synthetic_samples",
  );
  const report = await checkInference(env, network, {
    includeSyntheticSamples: true,
  });
  expect(report).toHaveProperty("synthetic_samples", [
    { case: "greeting", reply },
    { case: "correction", reply },
  ]);
  expect(JSON.stringify(report)).not.toMatch(
    /private-test-key|candidates|parts/,
  );
  const notice = syntheticPreflightNotice({
    ...report,
    private_key: "private-test-key",
  });
  expect(notice).toContain("::notice title=EngJatra synthetic AI preflight::");
  expect(notice).not.toContain("private-test-key");
  expect(
    syntheticPreflightNotice({ ...report, synthetic_samples: undefined }),
  ).toBeUndefined();
  expect(
    syntheticPreflightNotice({
      ...report,
      synthetic_samples: [
        {
          case: "greeting",
          reply: { ...reply, next_question_en: "Contact private@example.test" },
        },
        { case: "correction", reply },
      ],
    }),
  ).toBeUndefined();
  expect(
    syntheticPreflightNotice({
      ...report,
      synthetic_samples: [
        {
          case: "greeting",
          reply: { ...reply, next_question_en: "What is your name?" },
        },
        { case: "correction", reply },
      ],
    }),
  ).toBeUndefined();
  const escaped = syntheticPreflightNotice({
    ...report,
    synthetic_samples: [
      {
        case: "greeting",
        reply: { ...reply, assistant_reply_en: "Hello %0A::error!" },
      },
      { case: "correction", reply },
    ],
  });
  expect(escaped).toContain("%250A::error");
  expect(escaped?.split("\n")).toHaveLength(1);
});

it("prepublication rejects a schema-valid unrelated correction without retrying or archiving it", async () => {
  const reply = {
    assistant_reply_en: "Good start!",
    short_explanation_bn: "বাক্যটি আবার দেখি।",
    feedback_type: "clear_error",
    suggested_revision_en: "Hello!",
    next_question_en: "How are you?",
    learning_tags: ["grammar"],
    source_unit_id: "P0-01",
  };
  const network = vi.fn().mockImplementation(
    async (_url, init) =>
      new Response(
        JSON.stringify(
          init?.method === "POST"
            ? {
                candidates: [
                  { content: { parts: [{ text: JSON.stringify(reply) }] } },
                ],
              }
            : {
                name: "models/gemma-test-it",
                supportedGenerationMethods: ["generateContent"],
              },
        ),
      ),
  );
  const report = await checkInference(
    {
      GEMMA_API_KEY: "private-test-key",
      GEMMA_MODEL: "gemma-test-it",
      GEMMA_FREE_CONFIRMED: "true",
      GEMMA_ALLOWED_COUNTRIES: "BD",
    },
    network,
    { includeSyntheticSamples: true },
  );
  expect(report).toMatchObject({
    status: "BLOCKED",
    enabled: false,
    synthetic_calls_attempted: 2,
  });
  expect(report).not.toHaveProperty("synthetic_samples");
  expect(network).toHaveBeenCalledTimes(3);
});
