import { it, expect, vi } from "vitest";
import { tutorRequest } from "../workers/api/src/tutor-request";
it("duplicate in-flight requests share work, differ by user, reject changed payload and expire bounded receipts", async () => {
  const key = crypto.randomUUID(),
    run = vi.fn(async () => ({ reply: "fixture only" }));
  const result = await Promise.all([
    tutorRequest("a", key, "same", run, 0),
    tutorRequest("a", key, "same", run, 1),
  ]);
  expect(result[0]).toEqual(result[1]);
  expect(run).toHaveBeenCalledTimes(1);
  await expect(
    tutorRequest("a", key, "different", run, 2),
  ).rejects.toMatchObject({ status: 409 });
  await tutorRequest("b", key, "same", run, 3);
  expect(run).toHaveBeenCalledTimes(2);
  await tutorRequest("a", key, "same", run, 30001);
  expect(run).toHaveBeenCalledTimes(3);
});
it("transport rejection does not retain failed work forever", async () => {
  const key = crypto.randomUUID(),
    run = vi
      .fn()
      .mockRejectedValueOnce(Error("fixture failure"))
      .mockResolvedValueOnce("success");
  await expect(tutorRequest("a", key, "test", run)).rejects.toThrow(
    "fixture failure",
  );
  expect(await tutorRequest("a", key, "test", run)).toBe("success");
});
