import { forgetSource, registerBlob, setSourceLoader } from "./audio.js";

/*
 * Sounds the user adds are stored in this browser with IndexedDB.
 * If IndexedDB is unavailable (private mode, blocked storage) they live in memory
 * until the page closes.
 */

export const MAX_BYTES = 25 * 1024 * 1024;
const DB_NAME = "bell-sounds";
const STORE = "sounds";

const memory = new Map();
let dbPromise = null;
let persistent = true;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error("blocked"));
        setTimeout(() => reject(new Error("timeout")), 3000);
      } catch (e) {
        reject(e);
      }
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

const meta = ({ blob: _blob, ...rest }) => rest;

export function isPersistent() {
  return persistent;
}

export async function listSounds() {
  try {
    const rows = await tx("readonly", (st) => st.getAll());
    rows.forEach((r) => memory.set(r.id, r));
  } catch {
    persistent = false;
  }
  return Array.from(memory.values())
    .sort((a, b) => a.added - b.added)
    .map(meta);
}

async function getRecord(id) {
  if (memory.has(id)) return memory.get(id);
  try {
    return await tx("readonly", (st) => st.get(id));
  } catch {
    return null;
  }
}

/**
 * Add a sound. Validates that the browser can actually play it.
 * origin: "device" | "link" | "mic"
 */
export async function addSound(blob, { name, origin, url = "" }) {
  if (blob.size > MAX_BYTES) throw new Error("The file is larger than 25 MB.");
  const id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let buffer;
  try {
    buffer = await registerBlob(id, blob);
  } catch {
    throw new Error("That file isn't a sound this browser can play. Try an MP3, WAV or M4A.");
  }
  const rec = {
    id,
    name: (name || "Untitled sound").slice(0, 60),
    origin,
    url,
    duration: buffer.duration,
    added: Date.now(),
    blob,
  };
  memory.set(id, rec);
  try {
    await tx("readwrite", (st) => st.put(rec));
  } catch {
    persistent = false;
  }
  return meta(rec);
}

export async function removeSound(id) {
  memory.delete(id);
  forgetSource(id);
  try {
    await tx("readwrite", (st) => st.delete(id));
  } catch {}
}

/** Download a sound from a link. Fails clearly when the site doesn't allow it. */
export async function fetchSoundFromLink(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error("That doesn't look like a web address. It should start with https://");
  }
  let res;
  try {
    res = await fetch(url.href);
  } catch {
    throw new Error(
      url.hostname + " doesn't allow other sites to load its files. Download the sound and use Choose from device instead.",
    );
  }
  if (!res.ok) throw new Error(url.hostname + " answered with error " + res.status + ". Check the link.");
  return res.blob();
}

// Let the audio engine load stored sounds on demand.
setSourceLoader(async (id) => {
  const rec = await getRecord(id);
  return rec ? rec.blob : null;
});
