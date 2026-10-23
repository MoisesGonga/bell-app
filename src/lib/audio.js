import { ringStopTime } from "./format.js";

/*
 * Audio engine.
 * One shared AudioContext; every sound runs through a gain node and an analyser,
 * so the bell can swing in time with whatever is actually playing.
 */

export const RECORDING_URL = `${import.meta.env.BASE_URL}sounds/old-phone.mp3`;

// Decoded sounds by id. `cycle` is the length of one ring in seconds.
const sources = {
  recording: { cycle: 5.3, buffer: null, peak: 0.1 },
  synth: { cycle: 3.0, buffer: null, peak: 0.1 },
};

let ctx = null;
let analyser = null;
let master = null;
let current = null;
let loader = null; // async (id) => Blob | null, for sounds the user added

export function setSourceLoader(fn) {
  loader = fn;
}

export function ensureContext() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
    master = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function measurePeak(buffer) {
  const d = buffer.getChannelData(0);
  const w = 1024;
  let peak = 0;
  for (let i = 0; i + w < d.length; i += w) {
    let s = 0;
    for (let k = 0; k < w; k++) s += d[i + k] * d[i + k];
    peak = Math.max(peak, Math.sqrt(s / w));
  }
  return peak || 0.1;
}

export function decode(arrayBuffer) {
  ensureContext();
  return new Promise((resolve, reject) => ctx.decodeAudioData(arrayBuffer, resolve, reject));
}

/** Decode a Blob and keep it ready to play under `id`. Returns the decoded buffer. */
export async function registerBlob(id, blob) {
  const buffer = await decode(await blob.arrayBuffer());
  sources[id] = { cycle: buffer.duration, buffer, peak: measurePeak(buffer) };
  return buffer;
}

export function forgetSource(id) {
  delete sources[id];
}

/** Two steel gongs struck by a clapper ~26 times a second, in two bursts. */
function buildSynth() {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * 3.0);
  const buf = ctx.createBuffer(1, n, sr);
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
  ensureContext();
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
    s.peak = measurePeak(s.buffer);
  }
  return s;
}

export function isPlaying() {
  return current !== null;
}

export function stop(fade = false) {
  if (!current) return;
  const { src, gain } = current;
  current = null;
  const t = ctx.currentTime;
  const f = fade ? 0.35 : 0.03;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(0, t + f);
  try {
    src.stop(t + f + 0.02);
  } catch {}
}

/**
 * Play a sound. Resolves once playback has started.
 * `onEnd` is called when this playback finishes or is replaced.
 */
export async function play({ id, length, volume, speed, onEnd }) {
  const s = await getSource(id);
  stop(false);
  master.gain.value = volume;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = s.buffer;
  src.playbackRate.value = speed;
  src.loop = true;
  src.connect(gain);
  gain.connect(analyser);
  const me = { src, gain, peak: s.peak, timed: length !== "loop" };
  current = me;
  src.onended = () => {
    if (current === me) current = null;
    onEnd && onEnd();
  };
  const t = ctx.currentTime;
  src.start(t);
  const stopAt = ringStopTime({ length, cycle: s.cycle, duration: s.buffer.duration, speed });
  if (stopAt !== null) {
    gain.gain.setValueAtTime(1, t + Math.max(0, stopAt - 0.25));
    gain.gain.linearRampToValueAtTime(0, t + stopAt);
    src.stop(t + stopAt + 0.02);
  }
}

export function setVolume(v) {
  if (master) master.gain.value = v;
}

/** Speed changes apply live to open-ended rings; timed rings pick it up next time. */
export function setSpeed(v) {
  if (current && !current.timed) current.src.playbackRate.setTargetAtTime(v, ctx.currentTime, 0.05);
}

const timeData = new Float32Array(1024);

/** Loudness of what is playing right now, 0..1, relative to the sound's own peak. */
export function level() {
  if (!analyser || !current) return 0;
  analyser.getFloatTimeDomainData(timeData);
  let s = 0;
  for (let i = 0; i < timeData.length; i++) s += timeData[i] * timeData[i];
  return Math.min(1, Math.sqrt(s / timeData.length) / current.peak);
}
