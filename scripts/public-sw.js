// Public assets only. Never cache auth, API, account, reports, or other origins.
const CACHE = "engjatra-public-v1";
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const r = event.request,
    u = new URL(r.url);
  if (
    r.method !== "GET" ||
    u.origin !== self.location.origin ||
    u.pathname.startsWith("/api/") ||
    !(/^\/(assets|brand|content)\//.test(u.pathname) || r.mode === "navigate")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(r);
        if (response.ok) await cache.put(r, response.clone());
        return response;
      } catch {
        const saved = await cache.match(r);
        if (saved) return saved;
        if (r.mode === "navigate") {
          const root = await cache.match("/");
          if (root) return root;
        }
        return new Response("Offline", { status: 503 });
      }
    })(),
  );
});
