import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../lib/format.js";
import { PauseIcon, PlayIcon } from "./Icons.jsx";

export const MAX_RECORDING_SECONDS = 60;
const BAR_COUNT = 28;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

function micErrorMessage(err) {
  const name = err && err.name;
  if (name === "NotFoundError") return "No microphone was found on this device.";
  let msg =
    name === "NotAllowedError" || name === "SecurityError"
      ? "Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again."
      : "The microphone couldn't start. Close other apps that are using it and try again.";
  let embedded = true;
  try {
    embedded = window.self !== window.top;
  } catch {}
  if (embedded) msg += " Open the app from its own web address to record.";
  return msg;
}

/**
 * Record a sound with the microphone, listen back, then add it or discard it.
 * Phases: idle → asking → recording → review (or error).
 */
export default function Recorder({ defaultName, onSave, onClose, onBeforeRecord }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [name, setName] = useState(defaultName);
  const [makeDefault, setMakeDefault] = useState(true);
  const [take, setTake] = useState(null); // { blob, url }
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);

  const session = useRef({});
  const takeUrl = useRef(null);
  const audioRef = useRef(null);
  const bars = useRef([]);

  function release() {
    const s = session.current;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.timer) clearInterval(s.timer);
    if (s.stream) s.stream.getTracks().forEach((t) => t.stop());
    if (s.ctx) s.ctx.close().catch(() => {});
    session.current = {};
  }

  function abortRecorder() {
    const mr = session.current.mr;
    if (mr && mr.state !== "inactive") {
      mr.onstop = null;
      try {
        mr.stop();
      } catch {}
    }
  }

  function dropTake() {
    if (audioRef.current) audioRef.current.pause();
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
    takeUrl.current = null;
    setTake(null);
    setPlaying(false);
  }

  useEffect(
    () => () => {
      abortRecorder();
      release();
      if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
    },
    [],
  );

  function stop() {
    const mr = session.current.mr;
    if (mr && mr.state !== "inactive") mr.stop();
  }

  async function start() {
    dropTake();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser can't record audio. Try Safari, Chrome, Edge or Firefox.");
      setPhase("error");
      return;
    }
    onBeforeRecord?.();
    setPhase("asking");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
    } catch (e) {
      setError(micErrorMessage(e));
      setPhase("error");
      return;
    }

    const type = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
    let mr;
    try {
      mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError("This browser can't record audio.");
      setPhase("error");
      return;
    }

    const chunks = [];
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mr.mimeType || type || "audio/webm" });
      release();
      if (!blob.size) {
        setError("Nothing was recorded. Try again.");
        setPhase("error");
        return;
      }
      const url = URL.createObjectURL(blob);
      takeUrl.current = url;
      setTake({ blob, url });
      setPhase("review");
    };

    // Live level bars while recording
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    const history = new Array(BAR_COUNT).fill(0);
    const startedAt = Date.now();
    session.current = { stream, mr, ctx };

    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      history.push(Math.min(1, Math.sqrt(sum / data.length) * 5));
      history.shift();
      bars.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleY(${Math.max(0.08, history[i]).toFixed(3)})`;
      });
      session.current.raf = requestAnimationFrame(tick);
    };
    session.current.raf = requestAnimationFrame(tick);
    session.current.timer = setInterval(() => {
      const s = (Date.now() - startedAt) / 1000;
      setSeconds(s);
      if (s >= MAX_RECORDING_SECONDS) stop();
    }, 100);

    setSeconds(0);
    mr.start(250);
    setPhase("recording");
  }

  function togglePreview() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.currentTime = 0;
      a.play().catch(() => {});
    } else a.pause();
  }

  async function save() {
    if (!take) return;
    setSaving(true);
    const ok = await onSave(take.blob, name.trim() || defaultName, makeDefault);
    setSaving(false);
    if (ok) onClose();
  }

  function cancel() {
    abortRecorder();
    release();
    dropTake();
    onClose();
  }

  if (phase === "review") {
    return (
      <div className="rec" role="group" aria-label="Review recording">
        <audio
          ref={audioRef}
          src={take.url}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <div className="take">
          <button
            className="round lg"
            id="rec-preview"
            onClick={togglePreview}
            aria-label={playing ? "Pause recording" : "Play recording"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className="take-info">
            <span className="nm">Your recording</span>
            <small>{formatDuration(seconds)} · listen before you add it</small>
          </div>
        </div>
        <input
          className="field"
          id="rec-name"
          value={name}
          maxLength={60}
          aria-label="Sound name"
          placeholder="Name this sound"
          onChange={(e) => setName(e.target.value)}
        />
        <label className="toggle-row" htmlFor="rec-default">
          <span>Use as the bell sound</span>
          <input
            type="checkbox"
            className="switch"
            id="rec-default"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
          />
        </label>
        <div className="rec-actions">
          <button className="btn2" id="rec-cancel" onClick={cancel}>
            Cancel
          </button>
          <button className="btn2" id="rec-again" onClick={start}>
            Record again
          </button>
          <button className="btn1" id="rec-save" onClick={save} disabled={saving}>
            {saving ? "Adding…" : "Add to sounds"}
          </button>
        </div>
      </div>
    );
  }

  const recording = phase === "recording";
  const hint =
    phase === "asking"
      ? "Allow the microphone to start recording."
      : recording
        ? "Recording… tap to stop."
        : phase === "error"
          ? error
          : "Tap to start recording. Up to one minute.";

  return (
    <div className="rec" role="group" aria-label="Record a sound">
      <div className={"wave" + (recording ? " live" : "")} aria-hidden="true">
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <span key={i} ref={(el) => (bars.current[i] = el)} />
        ))}
      </div>
      <div className="timer">
        {formatDuration(recording ? seconds : 0)}
        <small> / {formatDuration(MAX_RECORDING_SECONDS)}</small>
      </div>
      <button
        className={"rec-btn" + (recording ? " on" : "")}
        id="rec-toggle"
        disabled={phase === "asking"}
        onClick={recording ? stop : start}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        <span className="core" />
      </button>
      <p className="rec-hint" role="status">
        {hint}
      </p>
      <button className="btn2 wide" id="rec-close" onClick={cancel}>
        Cancel
      </button>
    </div>
  );
}
