import { it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
function worker({ quota = false }: { quota?: boolean } = {}) {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const buckets = new Map<string, Map<string, Response>>();
  const key = (value: string | Request) =>
    typeof value === "string"
      ? new URL(value, "https://example.test").href
      : value.url;
  const network = vi.fn(async () => new Response("public network file"));
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  const cache = {
    async open(name: string) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const bucket = buckets.get(name)!;
      return {
        async addAll(urls: (string | Request)[]) {
          for (const url of urls)
            bucket.set(key(url), new Response("precache"));
        },
        async match(request: string | Request) {
          return bucket.get(key(request))?.clone();
        },
        async put(request: string | Request, response: Response) {
          if (quota) throw Error("quota");
          bucket.set(key(request), response);
        },
        async keys() {
          return [...bucket.keys()].map((url) => new Request(url));
        },
        async delete(request: string | Request) {
          return bucket.delete(key(request));
        },
      };
    },
    async keys() {
      return [...buckets.keys()];
    },
    async delete(name: string) {
      return buckets.delete(name);
    },
  };
  const source = readFileSync("scripts/public-sw.js", "utf8")
    .replaceAll("__BUILD__", "build-new")
    .replace("[]; // __PRECACHE__", '["/", "/assets/entry.js"];');
  runInNewContext(source, {
    self: {
      location: { origin: "https://example.test" },
      clients: { claim },
      skipWaiting,
      addEventListener: (name: string, handler: (typeof handlers)[string]) => {
        handlers[name] = handler;
      },
    },
    caches: cache,
    fetch: network,
    Response,
    Request,
    URL,
  });
  async function fetch(url: string, mode = "cors") {
    let response: Promise<Response> | undefined;
    handlers.fetch({
      request: {
        method: "GET",
        url: new URL(url, "https://example.test").href,
        mode,
      },
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    return response;
  }
  async function lifecycle(type: string) {
    let promise: Promise<unknown> | undefined;
    handlers[type]({
      waitUntil: (value: Promise<unknown>) => {
        promise = value;
      },
    });
    await promise;
  }
  return {
    cache,
    buckets,
    network,
    handlers,
    skipWaiting,
    claim,
    fetch,
    lifecycle,
  };
}
it("never caches API, authentication query, cross-origin or non-GET requests", async () => {
  const w = worker();
  for (const url of [
    "/api/learning/snapshot",
    "/?code=private",
    "/assets/file.js?access_token=private",
    "https://auth.example.test/user",
  ]) {
    expect(await w.fetch(url)).toBeUndefined();
  }
  let intercepted = false;
  w.handlers.fetch({
    request: { url: "https://example.test/content/lesson", method: "POST" },
    respondWith: () => {
      intercepted = true;
    },
  });
  expect(intercepted).toBe(false);
  expect(w.network).not.toHaveBeenCalled();
  expect(w.buckets.size).toBe(0);
});
it("quota failure returns the successful response; cached immutable lessons remain readable offline", async () => {
  const full = worker({ quota: true });
  expect(await (await full.fetch("/assets/entry.js"))!.text()).toBe(
    "public network file",
  );
  const w = worker();
  await w.fetch("/content/3.0.0/P0/P0-01.json");
  w.network.mockRejectedValue(Error("offline"));
  expect(await (await w.fetch("/content/3.0.0/P0/P0-01.json"))!.text()).toBe(
    "public network file",
  );
  expect((await w.fetch("/content/3.0.0/P0/P0-02.json"))!.status).toBe(503);
});
it("updates wait for user activation and retain one previous shell without deleting teaching caches", async () => {
  const w = worker();
  await w.cache.open("engjatra-shell-build-oldest");
  await w.cache.open("engjatra-shell-build-previous");
  await w.cache.open("engjatra-public-content-v2");
  await w.lifecycle("install");
  expect(w.skipWaiting).not.toHaveBeenCalled();
  w.handlers.message({ data: { type: "ACTIVATE_UPDATE" } });
  expect(w.skipWaiting).toHaveBeenCalledOnce();
  await w.lifecycle("activate");
  expect(await w.cache.keys()).toEqual([
    "engjatra-shell-build-previous",
    "engjatra-public-content-v2",
    "engjatra-shell-build-new",
  ]);
  expect(w.claim).toHaveBeenCalledOnce();
});
it("bounds immutable public content cache and sanitizes navigation to a single public shell", async () => {
  const w = worker();
  for (let i = 0; i < 182; i++) await w.fetch(`/content/3.0.0/P0/${i}.json`);
  expect(w.buckets.get("engjatra-public-content-v2")!.size).toBe(180);
  await w.fetch("/lesson/P0-01", "navigate");
  expect([...w.buckets.get("engjatra-shell-build-new")!.keys()]).toEqual([
    "https://example.test/",
  ]);
  w.network.mockRejectedValue(Error());
  expect(await (await w.fetch("/learn", "navigate"))!.text()).toBe(
    "public network file",
  );
});
it("upgrades legacy public caches without keeping OAuth queries or losing previously read lessons", async () => {
  const w = worker();
  const cache = await w.cache.open("engjatra-public-v1");
  await cache.put("/content/3.0.0/P0/P0-01.json", new Response("old lesson"));
  await cache.put("/?code=old-private-code", new Response("shell"));
  await w.lifecycle("activate");
  expect(w.buckets.has("engjatra-public-v1")).toBe(false);
  expect([...w.buckets.get("engjatra-public-content-v2")!.keys()]).toEqual([
    "https://example.test/content/3.0.0/P0/P0-01.json",
  ]);
});
