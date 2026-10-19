export function createApplicationServiceWorker(cacheVersion: string, precacheUrls: string[]): string {
  return `const CACHE_NAME = "em-po-planu-shell-${cacheVersion}";
const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};
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
`;
}
