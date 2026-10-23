import { describe, expect, it } from "vitest";
import { describeSound, formatDuration, nameFromPath, ringStopTime } from "./format.js";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5.4)).toBe("0:05");
    expect(formatDuration(75)).toBe("1:15");
  });
  it("treats bad input as zero", () => {
    expect(formatDuration(undefined)).toBe("0:00");
    expect(formatDuration(-3)).toBe("0:00");
  });
});

describe("describeSound", () => {
  it("names where a sound came from", () => {
    expect(describeSound({ origin: "device", duration: 3 })).toBe("From your device · 0:03");
    expect(describeSound({ origin: "mic", duration: 12 })).toBe("Recorded on this device · 0:12");
    expect(describeSound({ origin: "link", url: "https://example.com/a.mp3", duration: 61 })).toBe(
      "From example.com · 1:01",
    );
  });
  it("handles a broken link", () => {
    expect(describeSound({ origin: "link", url: "nope", duration: 1 })).toBe("From a link · 0:01");
  });
});

describe("nameFromPath", () => {
  it("drops folders and extensions", () => {
    expect(nameFromPath("/sounds/My%20Ring.mp3")).toBe("My Ring");
    expect(nameFromPath("door-bell.wav")).toBe("door-bell");
  });
  it("falls back when empty", () => {
    expect(nameFromPath("", "Sound from link")).toBe("Sound from link");
  });
});

describe("ringStopTime", () => {
  const recording = { cycle: 5.3, duration: 20.2 };
  const added = { cycle: 2, duration: 2 };

  it("rings until stopped on loop", () => {
    expect(ringStopTime({ ...recording, length: "loop" })).toBeNull();
  });
  it("plays whole rings of the recording", () => {
    expect(ringStopTime({ ...recording, length: "1" })).toBeCloseTo(5.3);
    expect(ringStopTime({ ...recording, length: "2" })).toBeCloseTo(10.6);
  });
  it("caps the recording at its own length", () => {
    expect(ringStopTime({ ...recording, length: "full" })).toBeCloseTo(20.2);
  });
  it("repeats added sounds once per ring", () => {
    expect(ringStopTime({ ...added, length: "full" })).toBeCloseTo(8);
  });
  it("gets shorter when played faster", () => {
    expect(ringStopTime({ ...recording, length: "1", speed: 2 })).toBeCloseTo(2.65);
  });
});
