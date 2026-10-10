import { describe, expect, it } from "vitest";
import {
  publicSuspensions,
  suspensionMaxAge,
} from "../packages/data/offline-content";
describe("offline lesson safety", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  };
  it("refreshes every online lesson, preserves public blocks offline and isolates API sources", async () => {
    const storage = memory();
    await publicSuspensions(
      "production",
      async () => ({ items: [], private_reason: "never stored" }),
      storage,
      true,
      100,
    );
    expect(
      await publicSuspensions(
        "production",
        async () => ({ items: ["P0-01"] }),
        storage,
        true,
        200,
      ),
    ).toEqual(["P0-01"]);
    expect(
      await publicSuspensions(
        "production",
        async () => {
          throw Error();
        },
        storage,
        false,
        300,
      ),
    ).toEqual(["P0-01"]);
    expect(
      storage.getItem("engjatra.public-suspensions.production"),
    ).not.toContain("private_reason");
    await expect(
      publicSuspensions(
        "demo",
        async () => ({ items: [] }),
        storage,
        false,
        300,
      ),
    ).rejects.toThrow("CONTENT_UNAVAILABLE");
  });
  it("fails closed without a fresh observed block list, on malformed IDs or online server failure", async () => {
    const storage = memory();
    await expect(
      publicSuspensions("p", async () => ({}), storage, false, 100),
    ).rejects.toThrow();
    await publicSuspensions(
      "p",
      async () => ({ items: [] }),
      storage,
      true,
      100,
    );
    await expect(
      publicSuspensions(
        "p",
        async () => ({ items: [] }),
        storage,
        false,
        100 + suspensionMaxAge + 1,
      ),
    ).rejects.toThrow();
    await expect(
      publicSuspensions(
        "p",
        async () => ({ items: ["<script>"] }),
        storage,
        true,
        100,
      ),
    ).rejects.toThrow();
    await expect(
      publicSuspensions(
        "p",
        async () => {
          throw Error("server failed");
        },
        storage,
        true,
        200,
      ),
    ).rejects.toThrow("server failed");
  });
  it("online lessons survive unavailable local storage", async () => {
    expect(
      await publicSuspensions(
        "p",
        async () => ({ items: [] }),
        {
          getItem: () => null,
          setItem: () => {
            throw Error();
          },
        },
        true,
      ),
    ).toEqual([]);
  });
});
