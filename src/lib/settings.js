export const STORAGE_KEY = "bell-settings";

export const DEFAULTS = Object.freeze({
  theme: "system", // "light" | "dark" | "system"
  sound: "recording", // id of the default bell sound
  volume: 0.8, // 0..1
  length: "1", // "1" | "2" | "full" | "loop"
  speed: 1, // 0.5..2
});

const THEMES = ["light", "dark", "system"];
const LENGTHS = ["1", "2", "full", "loop"];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Merge stored values over the defaults, dropping anything invalid. */
export function sanitize(raw) {
  const s = { ...DEFAULTS };
  if (!raw || typeof raw !== "object") return s;
  if (THEMES.includes(raw.theme)) s.theme = raw.theme;
  if (typeof raw.sound === "string" && raw.sound) s.sound = raw.sound;
  if (Number.isFinite(raw.volume)) s.volume = clamp(raw.volume, 0, 1);
  if (LENGTHS.includes(raw.length)) s.length = raw.length;
  if (Number.isFinite(raw.speed)) s.speed = clamp(raw.speed, 0.5, 2);
  return s;
}

export function loadSettings() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
  else root.removeAttribute("data-theme");
}
