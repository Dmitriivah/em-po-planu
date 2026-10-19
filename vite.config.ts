import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { createApplicationServiceWorker } from "./src/pwa/serviceWorker";

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
        source: createApplicationServiceWorker(cacheVersion, precache),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), applicationServiceWorker()],
});
