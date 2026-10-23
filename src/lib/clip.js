/*
 * Pure helpers that turn a decoded sound into a ready-to-play clip.
 *
 * Phones keep a normal <audio> element playing when the screen locks or the app goes to the
 * background, but they pause Web Audio. So each ring is rendered ahead of time into a WAV file
 * with its length, fade-out and volume baked in, and played by a media element.
 * Baking the volume in also makes the volume slider work on iPhone, where media volume is
 * fixed to the hardware buttons.
 */

import { ringStopTime } from "./format.js";

export const ENVELOPE_WINDOW = 1024;
const FADE_SECONDS = 0.25;
const MAX_SECONDS = 300;

/** Mix any number of channels down to mono. */
export function toMono(channels) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] / channels.length;
  return out;
}

/**
 * Build the samples for one play of a ring.
 * - "loop": one ring cycle, played on repeat by the media element.
 * - timed lengths: the whole ring sequence, ending in a short fade.
 */
export function renderSamples({ mono, sampleRate, cycle, length, volume }) {
  const duration = mono.length / sampleRate;
  const loop = length === "loop";
  let seconds = loop ? Math.min(cycle, duration) : ringStopTime({ length, cycle, duration, speed: 1 });
  seconds = Math.min(seconds, MAX_SECONDS);
  const total = Math.max(1, Math.round(seconds * sampleRate));
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) out[i] = mono[i % mono.length] * volume;
  if (!loop) {
    const fade = Math.min(total, Math.round(FADE_SECONDS * sampleRate));
    for (let i = 0; i < fade; i++) out[total - fade + i] *= 1 - (i + 1) / fade;
  }
  return { samples: out, loop };
}

/** Loudness per window, normalised to the loudest window, for driving the bell's swing. */
export function envelope(samples, windowSize = ENVELOPE_WINDOW) {
  const count = Math.max(1, Math.ceil(samples.length / windowSize));
  const env = new Float32Array(count);
  let peak = 0;
  for (let w = 0; w < count; w++) {
    let s = 0;
    const start = w * windowSize;
    const end = Math.min(samples.length, start + windowSize);
    for (let i = start; i < end; i++) s += samples[i] * samples[i];
    env[w] = Math.sqrt(s / Math.max(1, end - start));
    peak = Math.max(peak, env[w]);
  }
  if (peak > 0) for (let w = 0; w < count; w++) env[w] /= peak;
  return env;
}

/** 16-bit PCM mono WAV. Returns an ArrayBuffer. */
export function encodeWav(samples, sampleRate) {
  const bytes = samples.length * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const text = (o, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  v.setUint32(4, 36 + bytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, bytes, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return buf;
}
