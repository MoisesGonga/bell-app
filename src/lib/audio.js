import { ENVELOPE_WINDOW, encodeWav, envelope, renderSamples, toMono } from "./clip.js";

/*
 * Audio engine.
 *
 * Decoding uses Web Audio, but playback uses a single <audio> element, because phones keep
 * media elements playing when the screen locks or the app is in the background, while they
 * suspend Web Audio after a short while. Each ring is pre-rendered into a WAV clip
 * (see clip.js), so playback needs no JavaScript timers that the browser could throttle.
 *
 * Also handled here:
 * - Media Session: title and Pause/Stop on the lock screen and in notifications.
 * - Screen Wake Lock: optionally keeps the screen on while ringing.
 * - Interruptions (a phone call, another app taking audio) end the ring cleanly.
 */

export const RECORDING_URL = `${import.meta.env.BASE_URL}sounds/old-phone.mp3`;
const ICON_URL = `${import.meta.env.BASE_URL}icon.svg`;
const CLIP_CACHE_SIZE = 8;

// Decoded sounds by id. `cycle` is the length of one ring in seconds.
const sources = {
  recording: { cycle: 5.3, buffer: null },
  synth: { cycle: 3.0, buffer: null },
};

let ctx = null;
let loader = null; // async (id) => Blob | null, for sounds the user added
let el = null;
let current = null; // { key, clip, title, onEnd, baseVolume }
let unlocked = false;
let wakeLock = null;
let wantWakeLock = false;
let fadeTimer = null;
const clips = new Map(); // key -> { url, env, sampleRate, loop }

export function setSourceLoader(fn) {
  loader = fn;
}

/** Web Audio is only used to decode and synthesize, so a suspended context is fine. */
function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
  }
  return ctx;
}

export function decode(arrayBuffer) {
  const c = context();
  return new Promise((resolve, reject) => c.decodeAudioData(arrayBuffer, resolve, reject));
}

/** Decode a Blob and keep it ready to play under `id`. Returns the decoded buffer. */
export async function registerBlob(id, blob) {
  const buffer = await decode(await blob.arrayBuffer());
  sources[id] = { cycle: buffer.duration, buffer };
  return buffer;
}

export function forgetSource(id) {
  delete sources[id];
  for (const [key, clip] of clips) {
    if (key.startsWith(id + "|") && current?.clip !== clip) {
      URL.revokeObjectURL(clip.url);
      clips.delete(key);
    }
  }
}

/** Two steel gongs struck by a clapper ~26 times a second, in two bursts. */
function buildSynth() {
  const c = context();
  const sr = c.sampleRate;
  const n = Math.floor(sr * 3.0);
  const buf = c.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  const gongs = [
    [[1046, 1], [2793, 0.55], [4120, 0.3], [5540, 0.15]],
    [[1175, 1], [3011, 0.5], [4398, 0.28], [5890, 0.14]],
  ];
  let i = 0;
  for (const [s, e] of [[0, 0.75], [1.0, 1.75]]) {
    for (let t0 = s; t0 < e; t0 += 1 / 26, i++) {
      const g = gongs[i % 2];
      const start = Math.floor(t0 * sr);
      const len = Math.min(n - start, Math.floor(sr * 0.35));
      for (let k = 0; k < len; k++) {
        const t = k / sr;
        let v = 0;
        for (const [f, a] of g) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (6 + f / 400));
        d[start + k] += v * 0.22;
      }
    }
  }
  for (let k = 0; k < n; k++) d[k] = Math.tanh(d[k] * 1.6) * 0.8;
  return buf;
}

async function getSource(id) {
  let s = sources[id];
  if (!s) {
    const blob = loader ? await loader(id) : null;
    if (!blob) throw new Error("This sound is no longer available.");
    await registerBlob(id, blob);
    s = sources[id];
  }
  if (!s.buffer) {
    if (id === "recording") {
      const res = await fetch(RECORDING_URL);
      if (!res.ok) throw new Error("The ring sound couldn't be loaded.");
      s.buffer = await decode(await res.arrayBuffer());
    } else {
      s.buffer = buildSynth();
    }
  }
  return s;
}

const clipKey = (id, length, volume) => `${id}|${length}|${Math.round(volume * 100)}`;

async function buildClip(id, length, volume) {
  const key = clipKey(id, length, volume);
  if (clips.has(key)) return clips.get(key);
  const s = await getSource(id);
  const channels = Array.from({ length: s.buffer.numberOfChannels }, (_, i) => s.buffer.getChannelData(i));
  const { samples, loop } = renderSamples({
    mono: toMono(channels),
    sampleRate: s.buffer.sampleRate,
    cycle: s.cycle,
    length,
    volume,
  });
  const url = URL.createObjectURL(new Blob([encodeWav(samples, s.buffer.sampleRate)], { type: "audio/wav" }));
  const clip = { url, env: envelope(samples), sampleRate: s.buffer.sampleRate, loop };
  clips.set(key, clip);
  // Keep the cache small; never drop the clip that is playing.
  while (clips.size > CLIP_CACHE_SIZE) {
    const [oldKey, old] = clips.entries().next().value;
    if (current?.clip === old) break;
    URL.revokeObjectURL(old.url);
    clips.delete(oldKey);
  }
  return clip;
}

/** Build a clip ahead of time so the next tap starts instantly. Errors are ignored. */
export function prepare({ id, length, volume }) {
  buildClip(id, length, volume).catch(() => {});
}

function element() {
  if (el) return el;
  el = new Audio();
  el.preload = "auto";
  el.setAttribute("playsinline", "");
  el.preservesPitch = false; // faster sounds higher, like tape
  el.mozPreservesPitch = false;
  el.webkitPreservesPitch = false;
  // Ignore events from an earlier clip (for example the silent unlock clip).
  const isCurrent = () => current && el.src === current.clip.url;
  el.addEventListener("ended", () => {
    if (isCurrent()) finish();
  });
  // A pause we didn't ask for (phone call, another app, lock-screen pause) ends the ring.
  el.addEventListener("pause", () => {
    if (isCurrent() && !el.ended) finish();
  });
  setupMediaSession();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && current && wantWakeLock) requestWakeLock();
  });
  return el;
}

/** iOS only lets a media element play after a tap. Play a silent clip inside the tap once. */
let silentUrl = null;
function unlock() {
  if (unlocked) return;
  const e = element();
  if (!silentUrl) {
    silentUrl = URL.createObjectURL(new Blob([encodeWav(new Float32Array(441), 44100)], { type: "audio/wav" }));
  }
  e.src = silentUrl;
  const p = e.play();
  if (p && p.then) p.then(() => (unlocked = true)).catch(() => {});
}

function finish() {
  const done = current;
  current = null;
  releaseWakeLock();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
  done?.onEnd?.();
}

function setupMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const end = () => stop(false);
  for (const action of ["pause", "stop"]) {
    try {
      navigator.mediaSession.setActionHandler(action, end);
    } catch {}
  }
}

function showInMediaSession(title) {
  if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
  navigator.mediaSession.metadata = new window.MediaMetadata({
    title,
    artist: "Bell",
    artwork: [{ src: ICON_URL, sizes: "any", type: "image/svg+xml" }],
  });
  navigator.mediaSession.playbackState = "playing";
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => (wakeLock = null));
  } catch {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}

function start(clip, { title, speed, volume, keepAwake, onEnd }) {
  const e = element();
  clearInterval(fadeTimer);
  if (current) {
    const prev = current;
    current = null;
    prev.onEnd?.();
  }
  e.pause();
  e.src = clip.url;
  e.loop = clip.loop;
  e.defaultPlaybackRate = speed;
  e.playbackRate = speed;
  e.volume = 1;
  current = { clip, title, onEnd, baseVolume: volume };
  unlocked = true;
  wantWakeLock = !!keepAwake;
  if (keepAwake) requestWakeLock();
  showInMediaSession(title);
  const p = e.play();
  return p && p.then ? p : Promise.resolve();
}

export function isPlaying() {
  return current !== null;
}

/**
 * Ring. Call this directly from a tap so phones allow the sound.
 * Resolves once playback has started; `onEnd` runs when it finishes or is stopped.
 */
export function play({ id, length, volume, speed, title = "Bell", keepAwake = false, onEnd }) {
  const opts = { title, speed, volume, keepAwake, onEnd };
  const cached = clips.get(clipKey(id, length, volume));
  if (cached) return start(cached, opts);
  unlock();
  return buildClip(id, length, volume).then((clip) => start(clip, opts));
}

export function stop(fade = false) {
  if (!current || !el) return;
  const done = current;
  current = null;
  const finishPause = () => {
    el.pause();
    el.volume = 1;
    releaseWakeLock();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
    done.onEnd?.();
  };
  if (!fade) return finishPause();
  // Short fade where the browser allows changing volume (not on iPhone).
  let v = el.volume;
  clearInterval(fadeTimer);
  fadeTimer = setInterval(() => {
    v -= 0.1;
    if (v <= 0.05) {
      clearInterval(fadeTimer);
      finishPause();
    } else {
      el.volume = v;
    }
  }, 30);
}

/** Volume is baked into each clip; while ringing, turn down live where the browser allows it. */
export function setVolume(v) {
  if (!current || !el) return;
  try {
    el.volume = Math.max(0, Math.min(1, v / (current.baseVolume || 1)));
  } catch {}
}

export function setSpeed(v) {
  if (!el) return;
  el.defaultPlaybackRate = v;
  if (current) el.playbackRate = v;
}

export function setKeepAwake(on) {
  wantWakeLock = on;
  if (!current) return;
  if (on) requestWakeLock();
  else releaseWakeLock();
}

/** Loudness of what is playing right now, 0..1, from the clip's pre-computed envelope. */
export function level() {
  if (!current || !el || el.paused) return 0;
  const { env, sampleRate } = current.clip;
  const i = Math.floor((el.currentTime * sampleRate) / ENVELOPE_WINDOW);
  return env[Math.min(env.length - 1, Math.max(0, i))] || 0;
}
