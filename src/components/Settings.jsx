import { useEffect, useRef, useState } from "react";
import Recorder from "./Recorder.jsx";
import Segmented from "./Segmented.jsx";
import {
  CheckIcon,
  MicIcon,
  PlayIcon,
  PlusIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
  StopIcon,
  TrashIcon,
} from "./Icons.jsx";

const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.webm";

export default function Settings({
  settings,
  update,
  sounds,
  playingId,
  busy,
  message,
  persistent,
  recordingCount,
  onClose,
  onTest,
  onPreview,
  onAddFiles,
  onAddLink,
  onDelete,
  onSaveRecording,
  onBeforeRecord,
}) {
  const doneRef = useRef(null);
  const [link, setLink] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [recorderOpen, setRecorderOpen] = useState(false);

  useEffect(() => {
    doneRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const s = settings;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="grabber" />
        <div className="sheet-head">
          <span style={{ width: 44 }} />
          <h2 id="settings-title">Settings</h2>
          <button className="text-btn" ref={doneRef} id="settings-done" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="label">Sounds</div>
        <div className="group">
          {sounds.map((snd) => (
            <div className="row" key={snd.id}>
              <button
                className="round"
                id={`preview-${snd.id}`}
                onClick={() => onPreview(snd.id)}
                aria-label={(playingId === snd.id ? "Stop " : "Play ") + snd.name}
              >
                {playingId === snd.id ? <StopIcon /> : <PlayIcon />}
              </button>
              <button
                className="choice"
                id={`sound-${snd.id}`}
                aria-pressed={s.sound === snd.id}
                onClick={() => {
                  update({ sound: snd.id });
                  setConfirmId(null);
                }}
              >
                <span className="nm">{snd.name}</span>
                <small>{snd.desc}</small>
              </button>
              {s.sound === snd.id && <CheckIcon />}
              {snd.custom &&
                (confirmId === snd.id ? (
                  <button
                    className="del-confirm"
                    id={`confirm-del-${snd.id}`}
                    onClick={() => {
                      setConfirmId(null);
                      onDelete(snd.id);
                    }}
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    className="del"
                    id={`del-${snd.id}`}
                    aria-label={"Delete " + snd.name}
                    onClick={() => setConfirmId(snd.id)}
                  >
                    <TrashIcon />
                  </button>
                ))}
            </div>
          ))}
        </div>
        <p className="note">Tap a sound to make it the default for the bell.</p>

        <div className="label">Add a sound</div>
        <div className="group">
          <div className="row">
            <label className={"add-btn" + (busy ? " is-busy" : "")} htmlFor="file-input" id="add-file">
              <span className="round">
                <PlusIcon />
              </span>
              Choose from device
            </label>
            <input
              id="file-input"
              type="file"
              accept={AUDIO_ACCEPT}
              multiple
              className="vh"
              disabled={busy}
              onChange={(e) => {
                onAddFiles(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
          </div>
          <div className="row">
            <button
              className="add-btn"
              id="add-record"
              disabled={busy || recorderOpen}
              onClick={() => setRecorderOpen(true)}
            >
              <span className="round">
                <MicIcon />
              </span>
              Record with microphone
            </button>
          </div>
          {recorderOpen && (
            <Recorder
              defaultName={`Recording ${recordingCount + 1}`}
              onSave={onSaveRecording}
              onBeforeRecord={onBeforeRecord}
              onClose={() => setRecorderOpen(false)}
            />
          )}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (link.trim()) onAddLink(link.trim(), () => setLink(""));
            }}
          >
            <div className="link-row">
              <input
                id="link-input"
                type="url"
                placeholder="https://… link to an MP3 or WAV"
                value={link}
                aria-label="Sound link"
                onChange={(e) => setLink(e.target.value)}
              />
              <button className="small-btn" id="add-link" type="submit" disabled={busy || !link.trim()}>
                Add
              </button>
            </div>
          </form>
        </div>
        {message && (
          <p className={"note" + (message.err ? " err" : "")} role="status">
            {message.text}
          </p>
        )}
        <p className="note">
          {persistent
            ? "Sounds you add are saved in this browser on this device."
            : "This browser can't save sounds, so added sounds last until you close the page."}
        </p>

        <div className="label">Volume</div>
        <div className="group">
          <div className="row">
            <div className="vol">
              <SpeakerLowIcon />
              <input
                type="range"
                id="volume"
                min={0}
                max={1}
                step={0.01}
                value={s.volume}
                aria-label="Volume"
                style={{ "--p": Math.round(s.volume * 100) + "%" }}
                onChange={(e) => update({ volume: Number(e.target.value) })}
              />
              <SpeakerHighIcon />
            </div>
          </div>
        </div>

        <div className="label">Speed</div>
        <div className="group">
          <div className="row">
            <span>Playback speed</span>
            <span className="speed-val">{s.speed.toFixed(2)}×</span>
          </div>
          <div className="row">
            <div className="vol">
              <span className="end">0.5×</span>
              <input
                type="range"
                id="speed"
                min={0.5}
                max={2}
                step={0.05}
                value={s.speed}
                aria-label="Playback speed"
                style={{ "--p": Math.round(((s.speed - 0.5) / 1.5) * 100) + "%" }}
                onChange={(e) => update({ speed: Number(e.target.value) })}
              />
              <span className="end">2×</span>
            </div>
          </div>
          <div className="row">
            <Segmented
              label="Speed presets"
              full
              value={String(s.speed)}
              onChange={(v) => update({ speed: Number(v) })}
              options={[
                ["0.5", "Slow"],
                ["1", "Normal"],
                ["1.5", "Fast"],
                ["2", "Fastest"],
              ]}
            />
          </div>
        </div>
        <p className="note">Faster also makes the sound higher, like an old tape speeding up.</p>

        <div className="label">Ring length</div>
        <div className="group">
          <div className="row">
            <Segmented
              label="Ring length"
              full
              value={s.length}
              onChange={(v) => update({ length: v })}
              options={[
                ["1", "1 ring"],
                ["2", "2 rings"],
                ["full", "4 rings"],
                ["loop", "Until tap"],
              ]}
            />
          </div>
        </div>
        <p className="note">
          For sounds you add, one ring plays the whole file once. Tap the bell while it rings to stop it.
        </p>

        <div className="label">While ringing</div>
        <div className="group">
          <div className="row">
            <label className="toggle-row" htmlFor="keep-awake">
              <span>Keep the screen on</span>
              <input
                type="checkbox"
                className="switch"
                id="keep-awake"
                checked={s.keepAwake}
                onChange={(e) => update({ keepAwake: e.target.checked })}
              />
            </label>
          </div>
        </div>
        <p className="note">
          The ring keeps playing if you lock the phone or switch apps, and you can stop it from the lock screen. A
          new ring can only start while Bell is open.
        </p>

        <div className="label">Appearance</div>
        <div className="group">
          <div className="row">
            <Segmented
              label="Appearance"
              full
              value={s.theme}
              onChange={(v) => update({ theme: v })}
              options={[
                ["light", "Light"],
                ["dark", "Dark"],
                ["system", "Automatic"],
              ]}
            />
          </div>
        </div>

        <button className="test" id="test-sound" onClick={onTest}>
          {playingId ? "Stop" : "Play default sound"}
        </button>
      </div>
    </>
  );
}
