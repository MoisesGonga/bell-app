import { useCallback, useEffect, useMemo, useState } from "react";
import BellButton from "./components/BellButton.jsx";
import Settings from "./components/Settings.jsx";
import { SlidersIcon } from "./components/Icons.jsx";
import * as audio from "./lib/audio.js";
import * as library from "./lib/library.js";
import { describeSound, nameFromPath } from "./lib/format.js";
import { DEFAULTS, applyTheme, loadSettings, saveSettings } from "./lib/settings.js";
import { BUILT_IN_SOUNDS } from "./lib/sounds.js";


export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [open, setOpen] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [count, setCount] = useState(0);
  const [custom, setCustom] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const update = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), []);

  const sounds = useMemo(
    () =>
      BUILT_IN_SOUNDS.concat(custom.map((r) => ({ id: r.id, name: r.name, desc: describeSound(r), custom: true }))),
    [custom],
  );
  const selected = sounds.find((x) => x.id === settings.sound) || BUILT_IN_SOUNDS[0];

  useEffect(() => {
    library.listSounds().then((list) => {
      setCustom(list);
      setPersistent(library.isPersistent());
      setLoaded(true);
    });
  }, []);

  // If the default sound was deleted, fall back to the old phone.
  useEffect(() => {
    if (loaded && !sounds.some((x) => x.id === settings.sound)) update({ sound: DEFAULTS.sound });
  }, [loaded, sounds, settings.sound, update]);

  useEffect(() => {
    applyTheme(settings.theme);
    saveSettings(settings);
  }, [settings]);
  useEffect(() => audio.setVolume(settings.volume), [settings.volume]);
  useEffect(() => audio.setSpeed(settings.speed), [settings.speed]);

  function play(id, length, countIt) {
    if (playingId) {
      audio.stop(true);
      setPlayingId(null);
      if (playingId === id) return;
    }
    setPlayingId(id);
    if (countIt) setCount((c) => c + 1);
    audio
      .play({
        id,
        length,
        volume: settings.volume,
        speed: settings.speed,
        onEnd: () => setPlayingId((p) => (p === id ? null : p)),
      })
      .catch(() => {
        setPlayingId(null);
        setMessage({ err: true, text: "That sound couldn't be played. Try adding it again." });
      });
  }

  const ringBell = () => play(playingId || selected.id, settings.length, !playingId);

  async function addOne(blob, name, origin, url) {
    const rec = await library.addSound(blob, { name, origin, url });
    setCustom((list) => list.concat(rec));
    return rec;
  }

  async function onAddFiles(files) {
    if (!files.length) return;
    setBusy(true);
    setMessage({ text: "Adding…" });
    const ok = [];
    const bad = [];
    for (const f of files) {
      try {
        ok.push(await addOne(f, nameFromPath(f.name), "device"));
      } catch (e) {
        bad.push(`${f.name}: ${e.message}`);
      }
    }
    if (ok.length === 1 && !bad.length) update({ sound: ok[0].id });
    setBusy(false);
    setMessage(
      bad.length
        ? { err: true, text: (ok.length ? `Added ${ok.length}. ` : "") + bad.join(" ") }
        : {
            text:
              ok.length === 1 ? `Added “${ok[0].name}” and set it as the default.` : `Added ${ok.length} sounds.`,
          },
    );
  }

  async function onAddLink(url, clear) {
    setBusy(true);
    setMessage({ text: "Loading the link…" });
    try {
      const blob = await library.fetchSoundFromLink(url);
      let path = "";
      try {
        path = new URL(url).pathname;
      } catch {}
      const rec = await addOne(blob, nameFromPath(path, "Sound from link"), "link", url);
      update({ sound: rec.id });
      clear();
      setMessage({ text: `Added “${rec.name}” and set it as the default.` });
    } catch (e) {
      setMessage({ err: true, text: e.message });
    }
    setBusy(false);
  }

  async function onSaveRecording(blob, name, makeDefault) {
    setBusy(true);
    try {
      const rec = await addOne(blob, name, "mic");
      if (makeDefault) update({ sound: rec.id });
      setMessage({ text: `Added “${rec.name}”` + (makeDefault ? " and set it as the bell sound." : ".") });
      return true;
    } catch (e) {
      setMessage({ err: true, text: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onBeforeRecord() {
    if (playingId) {
      audio.stop(false);
      setPlayingId(null);
    }
  }

  async function onDelete(id) {
    if (playingId === id) {
      audio.stop(false);
      setPlayingId(null);
    }
    await library.removeSound(id);
    setCustom((list) => list.filter((r) => r.id !== id));
    setMessage({ text: "Sound deleted." });
  }

  const closeSettings = useCallback(() => setOpen(false), []);

  return (
    <div className="app">
      <header>
        <span className="brand">Bell</span>
        <button className="icon-btn" id="open-settings" aria-label="Settings" onClick={() => setOpen(true)}>
          <SlidersIcon />
        </button>
      </header>

      <main>
        <h1>Ring the bell.</h1>
        <p className="sub">Tap it to ring. Turn your sound on.</p>
        <BellButton ringing={!!playingId} speed={settings.speed} onClick={ringBell} />
        <div className="meta" aria-live="polite">
          <span>{selected.name}</span>
          <span className="dot" />
          <span>{playingId ? "Ringing · tap to stop" : "Ready"}</span>
          <span className="dot" />
          <span>
            <b>{count}</b>
            {count === 1 ? " ring" : " rings"}
          </span>
        </div>
      </main>

      <footer>Press Space or Enter to ring from the keyboard.</footer>

      {open && (
        <Settings
          settings={settings}
          update={update}
          sounds={sounds}
          playingId={playingId}
          busy={busy}
          message={message}
          persistent={persistent}
          recordingCount={custom.filter((c) => c.origin === "mic").length}
          onClose={closeSettings}
          onTest={() => play(playingId || selected.id, settings.length, false)}
          onPreview={(id) => play(id, "1", false)}
          onAddFiles={onAddFiles}
          onAddLink={onAddLink}
          onDelete={onDelete}
          onSaveRecording={onSaveRecording}
          onBeforeRecord={onBeforeRecord}
        />
      )}
    </div>
  );
}
