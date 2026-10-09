import { beforeEach, it, expect, vi } from "vitest";
import { SyncEngine } from "../packages/data/sync";
import { ApiError } from "../packages/data/client";
import { initialProgress } from "../packages/contracts/api";
beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => entries.set(k, v),
    removeItem: (k: string) => entries.delete(k),
  });
});
it("retains pending work through refresh and replays the same key", async () => {
  const states = vi.fn();
  const read = vi
    .fn()
    .mockResolvedValue({ revision: 0, state: initialProgress });
  const offline = vi.fn().mockRejectedValue(new TypeError("offline"));
  const engine = new SyncEngine("test", states, read, offline);
  await engine.init();
  await engine.update({ ...initialProgress, step: 1 });
  expect(states.mock.calls.at(-1)?.[1]).toBe("pending");
  const saved = JSON.parse(localStorage.getItem("test")!);
  const online = vi
    .fn()
    .mockResolvedValue({ revision: 1, state: { ...initialProgress, step: 1 } });
  const restarted = new SyncEngine("test", states, read, online);
  await restarted.init();
  expect(online.mock.calls[0][2]).toBe(saved.key);
  expect(restarted.pending).toBeNull();
  expect(restarted.snapshot.state.step).toBe(1);
});
it("conflict preserves both devices completed lessons and retries against the new revision", async () => {
  const server = {
    revision: 2,
    state: { ...initialProgress, completed: ["P0-01"] },
  };
  const write = vi
    .fn()
    .mockRejectedValueOnce(new ApiError("CONFLICT", 409, { snapshot: server }))
    .mockImplementation(async (s) => ({ revision: 3, state: s }));
  const engine = new SyncEngine(
    "test",
    vi.fn(),
    async () => ({ revision: 0, state: initialProgress }),
    write,
  );
  await engine.update({ ...initialProgress, completed: ["A1-01"] });
  expect(write.mock.calls[1][0].completed).toEqual(["P0-01", "A1-01"]);
  expect(write.mock.calls[1][1]).toBe(2);
  expect(engine.snapshot.revision).toBe(3);
});
it("rapid updates are not overwritten by an earlier request response", async () => {
  let release:
    | ((s: { revision: number; state: typeof initialProgress }) => void)
    | undefined;
  const write = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          release = r;
        }),
    )
    .mockImplementation(async (s) => ({ revision: 2, state: s }));
  const engine = new SyncEngine(
    "test",
    vi.fn(),
    async () => ({ revision: 0, state: initialProgress }),
    write,
  );
  const first = engine.update({ ...initialProgress, step: 1 });
  await engine.update({ ...initialProgress, step: 2 });
  release!({ revision: 1, state: { ...initialProgress, step: 1 } });
  await first;
  expect(engine.snapshot.state.step).toBe(2);
  expect(engine.pending).toBeNull();
});
it("storage exhaustion remains visible and does not falsely claim a durable offline queue", async () => {
  const states = vi.fn();
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new DOMException("Quota", "QuotaExceededError");
    },
    removeItem: () => {},
  });
  const engine = new SyncEngine(
    "test",
    states,
    async () => ({ revision: 0, state: initialProgress }),
    async () => {
      throw Error("offline");
    },
  );
  await engine.update({ ...initialProgress, step: 1 });
  expect(states.mock.calls.at(-1)?.[1]).toBe("storage_error");
  expect(engine.pending?.step).toBe(1);
});
