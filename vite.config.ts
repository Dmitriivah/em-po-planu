import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

function applicationServiceWorker(): Plugin {
  return {
    name: "application-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const builtAssets = Object.keys(bundle)
        .filter((file) => /\.(?:js|css)$/.test(file))
        .map((file) => `/${file}`);
      const precache = [
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/icon-maskable-512.png",
        "/icons/apple-touch-icon.png",
        ...builtAssets,
      ];
      const htmlAsset = bundle["index.html"];
      const htmlSource = htmlAsset?.type === "asset" && typeof htmlAsset.source === "string" ? htmlAsset.source : "";
      const manifestSource = readFileSync(new URL("./public/manifest.webmanifest", import.meta.url), "utf8");
      const cacheVersion = `${precache.join("\n")}\n${htmlSource}\n${manifestSource}`.split("").reduce((hash, character) =>
        Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0,
      0x811c9dc5).toString(36);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const CACHE_NAME = "em-po-planu-shell-${cacheVersion}";
const PRECACHE_URLS = ${JSON.stringify(precache)};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => {
    if (!self.registration.active) return self.skipWaiting();
  }));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith("em-po-planu-shell-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)),
  )).then(() => self.clients.claim()));
});
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const shellCache = await caches.open(CACHE_NAME);
      const cached = await shellCache.match("/index.html");
      if (cached) return cached;
      return Response.error();
    }));
    return;
  }
  if (!PRECACHE_URLS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const shellCache = await caches.open(CACHE_NAME);
    const cached = await shellCache.match(url.pathname);
    return cached || fetch(request);
  })());
});
`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), applicationServiceWorker()],
});
