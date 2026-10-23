/** 75 -> "1:15" */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** Subtitle shown under a sound the user added. */
export function describeSound(rec) {
  let from = "From your device";
  if (rec.origin === "mic") from = "Recorded on this device";
  if (rec.origin === "link") {
    try {
      from = "From " + new URL(rec.url).hostname;
    } catch {
      from = "From a link";
    }
  }
  return from + " · " + formatDuration(rec.duration);
}

/** Turn a file name or URL path into a readable sound name. */
export function nameFromPath(path, fallback = "Untitled sound") {
  const last = String(path || "").split("/").pop() || "";
  let base = last;
  try {
    base = decodeURIComponent(last);
  } catch {}
  base = base.replace(/\.[^.]+$/, "").trim();
  return (base || fallback).slice(0, 60);
}

/**
 * How long (in seconds of wall-clock time) a ring should play.
 * - cycle: length of one ring in the source
 * - duration: total length of the audio buffer
 * - The built-in recording contains several rings, so its ring count is capped by its length.
 *   Other sounds loop, so every ring is one full play.
 * Returns null for "loop" (rings until stopped).
 */
export function ringStopTime({ length, cycle, duration, speed = 1 }) {
  if (length === "loop") return null;
  const rings = length === "full" ? 4 : Number(length) || 1;
  let t = rings * cycle;
  if (cycle < duration - 0.5) t = Math.min(t, duration);
  return t / speed;
}
