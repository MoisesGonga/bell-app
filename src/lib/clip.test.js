import { describe, expect, it } from "vitest";
import { encodeWav, envelope, renderSamples, toMono } from "./clip.js";

const sr = 1000;
const ones = (n) => new Float32Array(n).fill(1);

describe("toMono", () => {
  it("averages channels", () => {
    const out = toMono([new Float32Array([1, 0]), new Float32Array([0, 1])]);
    expect(Array.from(out)).toEqual([0.5, 0.5]);
  });
});

describe("renderSamples", () => {
  it("renders one cycle for loop mode, without a fade", () => {
    const { samples, loop } = renderSamples({ mono: ones(4000), sampleRate: sr, cycle: 2, length: "loop", volume: 1 });
    expect(loop).toBe(true);
    expect(samples.length).toBe(2000);
    expect(samples[1999]).toBe(1);
  });

  it("repeats a short sound for each ring and fades out the end", () => {
    const { samples, loop } = renderSamples({ mono: ones(1000), sampleRate: sr, cycle: 1, length: "2", volume: 1 });
    expect(loop).toBe(false);
    expect(samples.length).toBe(2000);
    expect(samples[500]).toBe(1);
    expect(samples[1999]).toBe(0);
  });

  it("bakes in the volume", () => {
    const { samples } = renderSamples({ mono: ones(1000), sampleRate: sr, cycle: 1, length: "1", volume: 0.5 });
    expect(samples[100]).toBe(0.5);
  });
});

describe("envelope", () => {
  it("normalises loudness to the loudest window", () => {
    const s = new Float32Array(8);
    s.fill(0.5, 0, 4);
    s.fill(0.25, 4, 8);
    expect(Array.from(envelope(s, 4))).toEqual([1, 0.5]);
  });
});

describe("encodeWav", () => {
  it("writes a valid 16-bit mono header", () => {
    const buf = encodeWav(new Float32Array([0, 1, -1]), 44100);
    const v = new DataView(buf);
    const tag = (o) => String.fromCharCode(...new Uint8Array(buf, o, 4));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint32(40, true)).toBe(6);
    expect(v.getInt16(46, true)).toBe(32767);
    expect(v.getInt16(48, true)).toBe(-32768);
  });
});
