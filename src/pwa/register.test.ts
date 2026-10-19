import { describe, expect, it } from "vitest";
import { isIOSInstallCandidate } from "./register";

describe("PWA installation guidance", () => {
  it("recognizes iPhone and iPad Safari installation candidates", () => {
    expect(isIOSInstallCandidate("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 1, false)).toBe(true);
    expect(isIOSInstallCandidate("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 5, false)).toBe(true);
  });

  it("does not suggest Add to Home Screen for installed apps or other browsers", () => {
    expect(isIOSInstallCandidate("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "iPhone", 1, true)).toBe(false);
    expect(isIOSInstallCandidate("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0, false)).toBe(false);
  });
});
