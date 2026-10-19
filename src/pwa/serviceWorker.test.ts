import { describe, expect, it } from "vitest";
import { createApplicationServiceWorker } from "./serviceWorker";

const shellAssets = ["/", "/index.html", "/manifest.webmanifest", "/assets/app.js", "/assets/app.css"];

describe("generated application service worker", () => {
  const worker = createApplicationServiceWorker("test-version", shellAssets);

  it("precaches only the explicit app shell and static resources", () => {
    expect(worker).toContain(`const CACHE_NAME = "em-po-planu-shell-test-version"`);
    expect(worker).toContain(`const PRECACHE_URLS = ${JSON.stringify(shellAssets)}`);
    expect(worker).toContain("cache.addAll(PRECACHE_URLS)");
    expect(worker).not.toContain("localStorage");
    expect(worker).not.toContain("cache.put(");
  });

  it("falls back to the cached app shell for offline page navigation", () => {
    expect(worker).toContain('if (request.mode === "navigate")');
    expect(worker).toContain('await shellCache.match("/index.html")');
    expect(worker).toContain("if (cached) return cached");
    expect(worker).toContain("return Response.error()");
  });

  it("limits static-resource caching to same-origin, listed GET requests", () => {
    expect(worker).toContain('if (request.method !== "GET") return');
    expect(worker).toContain("if (url.origin !== self.location.origin) return");
    expect(worker).toContain("if (!PRECACHE_URLS.includes(url.pathname)) return");
  });

  it("removes only obsolete app-shell caches and waits for an explicit update action", () => {
    expect(worker).toContain('name.startsWith("em-po-planu-shell-") && name !== CACHE_NAME');
    expect(worker).toContain('if (event.data === "SKIP_WAITING") self.skipWaiting()');
  });
});
