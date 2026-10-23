import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULTS, STORAGE_KEY, applyTheme, loadSettings, sanitize, saveSettings } from "./settings.js";

describe("sanitize", () => {
  it("returns defaults for nothing", () => {
    expect(sanitize(null)).toEqual(DEFAULTS);
  });
  it("keeps valid values and clamps numbers", () => {
    expect(sanitize({ theme: "dark", volume: 4, speed: 0.1, length: "loop", sound: "u1" })).toEqual({
      theme: "dark",
      volume: 1,
      speed: 0.5,
      length: "loop",
      sound: "u1",
      keepAwake: true,
    });
  });
  it("drops invalid values", () => {
    expect(sanitize({ theme: "neon", length: "9", volume: "loud" })).toEqual(DEFAULTS);
  });
});

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips settings", () => {
    saveSettings({ ...DEFAULTS, theme: "light" });
    expect(loadSettings().theme).toBe("light");
  });
  it("survives corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadSettings()).toEqual(DEFAULTS);
  });
});

describe("applyTheme", () => {
  it("sets and clears the theme attribute", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
