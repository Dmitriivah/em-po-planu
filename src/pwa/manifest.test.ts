import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const manifestPath = fileURLToPath(new URL("../../public/manifest.webmanifest", import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  name: string;
  short_name: string;
  display: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
};

describe("installable web app manifest", () => {
  it("declares the application identity and standalone display mode", () => {
    expect(manifest.name).toBe("Ем по плану");
    expect(manifest.short_name).toBe("Ем по плану");
    expect(manifest.display).toBe("standalone");
  });

  it("ships valid 192, 512, maskable and Apple home-screen PNG icons", () => {
    for (const icon of manifest.icons) {
      const path = fileURLToPath(new URL(`../../public${icon.src}`, import.meta.url));
      const png = readFileSync(path);
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
      expect(icon.type).toBe("image/png");
    }

    expect(manifest.icons.find((icon) => icon.purpose === "maskable")?.src).toBe("/icons/icon-maskable-512.png");
    expect(readFileSync(fileURLToPath(new URL("../../public/icons/apple-touch-icon.png", import.meta.url))).readUInt32BE(16)).toBe(180);
  });
});
