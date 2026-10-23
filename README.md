# Bell

Tap the bell to hear an old telephone ring. A small React app in a black-and-white, Apple-inspired style with light and dark appearance.

## Features

- The bell swings in time with the sound, driven by its live loudness
- Two built-in sounds: a recorded rotary telephone and a generated two-gong bell
- Sound library: add sounds from your device, from a link, or record one with the microphone, then pick the default
- Volume, playback speed (0.5×–2×) and ring length (1, 2, 4 rings or until tapped)
- Light, Dark or Automatic appearance; responsive from phones to desktops
- Added sounds are stored in the browser with IndexedDB

## Development

Requires Node 20 or newer (see `.nvmrc`).

```bash
npm install
npm run dev       # start the dev server
npm run lint      # ESLint
npm test          # Vitest unit and component tests
npm run build     # production build in dist/
npm run check     # lint + test + build, same as CI
```

## Project structure

```
src/
  App.jsx                 app state and actions
  components/
    BellButton.jsx        the bell and its swing animation
    Settings.jsx          settings sheet
    Recorder.jsx          microphone recorder with review step
    Segmented.jsx, Icons.jsx
  lib/
    audio.js              Web Audio engine (play, stop, speed, level)
    library.js            IndexedDB sound library
    settings.js           saved preferences
    format.js             pure helpers (tested)
public/sounds/            built-in recording
```

## CI/CD

- **CI** — GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests and a production build on every push to `main` and every pull request.
- **CD** — Vercel is connected to this repository. Every push to `main` deploys to production; every pull request gets its own preview URL. Protect `main` in GitHub and require the **CI** check so only passing changes reach production.
- **Dependencies** — Dependabot opens weekly update pull requests.

## Credits

"Old phone" sound effect by scottishperson, from Pixabay (Pixabay Content License).
