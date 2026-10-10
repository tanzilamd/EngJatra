import type { Plugin } from "vite";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
// Pin shell caches to the actual emitted build, without a second service worker.
export function pwaBuild(): Plugin {
  let output = "";
  return {
    name: "engjatra-pwa",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, context) {
        if (!context.bundle) return [];
        return Object.keys(context.bundle)
          .filter((name) =>
            /(?:hind-siliguri-bengali-(?:400|600)|inter-latin-600)-normal-.*\.woff2$/.test(
              name,
            ),
          )
          .map((name) => ({
            tag: "link",
            attrs: {
              rel: "preload",
              href: `/${name}`,
              as: "font",
              type: "font/woff2",
              crossorigin: "anonymous",
            },
            injectTo: "head" as const,
          }));
      },
    },
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
    },
    async writeBundle(_, bundle) {
      const entry = Object.values(bundle).filter(
        (item) => item.type === "chunk" && item.isEntry,
      );
      const css = Object.keys(bundle).filter((name) => name.endsWith(".css"));
      const urls = [
        "/",
        "/theme-init.js",
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/maskable-512.png",
        "/icons/apple-touch-icon.png",
        "/brand/logo-mark.svg",
        ...entry.map((item) => `/${item.fileName}`),
        // Root lazy imports include the workspace and delayed Auth SDK. Both
        // must survive offline reload even if downloaded before SW activation.
        ...entry.flatMap((item) =>
          item.type === "chunk"
            ? item.dynamicImports.map((name) => `/${name}`)
            : [],
        ),
        ...css.map((name) => `/${name}`),
        ...Object.keys(bundle)
          .filter((name) => name.endsWith(".woff2"))
          .map((name) => `/${name}`),
      ];
      const html = await readFile(resolve(output, "index.html"));
      const source = await readFile("scripts/public-sw.js", "utf8");
      const fingerprint = createHash("sha256").update(html).update(source);
      for (const url of urls.filter((url) => url !== "/"))
        fingerprint.update(await readFile(resolve(output, url.slice(1))));
      const hash = fingerprint.digest("hex").slice(0, 16);
      await writeFile(
        resolve(output, "sw.js"),
        source
          .replaceAll("__BUILD__", hash)
          .replace("[]; // __PRECACHE__", `${JSON.stringify(urls)};`),
      );
    },
  };
}
