/* Public files only. No API, OAuth, account data or cross-origin caching. */
const SHELL = "engjatra-shell-__BUILD__";
const PUBLIC = "engjatra-public-content-v2";
const PRECACHE = []; // __PRECACHE__
const CONTENT_LIMIT = 180;
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      cache.addAll(
        PRECACHE.map(
          (url) =>
            new Request(new URL(url, self.location.origin), {
              cache: "reload",
            }),
        ),
      ),
    ),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if ((await caches.keys()).includes("engjatra-public-v1")) {
        const legacy = await caches.open("engjatra-public-v1");
        const content = await caches.open(PUBLIC);
        for (const request of await legacy.keys()) {
          const url = new URL(request.url);
          if (
            url.origin === self.location.origin &&
            url.pathname.startsWith("/content/") &&
            !url.search
          ) {
            const response = await legacy.match(request);
            if (response)
              await store(content, request, response, CONTENT_LIMIT);
          }
        }
        await caches.delete("engjatra-public-v1");
      }
      const names = (await caches.keys()).filter((name) =>
        name.startsWith("engjatra-shell-"),
      );
      // Keep one previous shell for other tabs still using its lazy chunks.
      const previous = names.filter((name) => name !== SHELL).at(-1);
      await Promise.all(
        names
          .filter((name) => name !== SHELL && name !== previous)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});
async function store(cache, key, response, limit) {
  if (!response.ok || response.type === "opaque") return;
  try {
    await cache.put(key, response.clone());
    if (limit) {
      const keys = await cache.keys();
      await Promise.all(
        keys
          .slice(0, Math.max(0, keys.length - limit))
          .map((request) => cache.delete(request)),
      );
    }
  } catch {
    /* Quota errors must never turn a successful network response into a failure. */
  }
}
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api") ||
    url.search
  )
    return;
  const content = url.pathname.startsWith("/content/");
  const staticAsset =
    /^\/(assets|brand|icons)\//.test(url.pathname) ||
    url.pathname === "/theme-init.js" ||
    url.pathname === "/manifest.webmanifest";
  const navigation = request.mode === "navigate";
  if (!content && !staticAsset && !navigation) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(content ? PUBLIC : SHELL);
      // Fingerprinted assets and versioned lessons are immutable. Manifest stays network-first.
      if (
        staticAsset ||
        (content && url.pathname !== "/content/manifest.json")
      ) {
        const hit = await cache.match(request);
        if (hit) return hit;
      }
      try {
        const response = await fetch(request);
        // Navigation HTML is a public shell, cached under one clean root key.
        if (response.ok)
          await store(
            cache,
            navigation ? "/" : request,
            response,
            content ? CONTENT_LIMIT : undefined,
          );
        return response;
      } catch {
        const fallback = await cache.match(navigation ? "/" : request);
        return (
          fallback ||
          new Response(
            "এই পাঠ অফলাইনে সংরক্ষিত নেই। সংযোগ ফিরে এলে আবার খোলো।",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          )
        );
      }
    })(),
  );
});
