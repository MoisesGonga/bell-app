# Bell

Tap the bell to hear an old telephone ring. A small React app in a black-and-white, Apple-inspired style with light and dark appearance.

## Features

- The bell swings in time with the sound, driven by its live loudness
- Two built-in sounds: a recorded rotary telephone and a generated two-gong bell
- Sound library: add sounds from your device, from a link, or record one with the microphone, then pick the default
- Volume, playback speed (0.5×–2×) and ring length (1, 2, 4 rings or until tapped)
- Light, Dark or Automatic appearance; responsive from phones to desktops
- Added sounds are stored in the browser with IndexedDB
- Keeps ringing when the phone locks or the app goes to the background; Pause/Stop from the lock screen (Media Session)
- Optional "keep the screen on while ringing" (Screen Wake Lock)

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
    audio.js              playback engine: media element, lock-screen controls, wake lock
    clip.js               renders each ring to a WAV clip (pure, tested)
    library.js            IndexedDB sound library
    settings.js           saved preferences
    format.js             pure helpers (tested)
public/sounds/            built-in recording
```

## Branches and releases

| Branch | Purpose | Deploys to |
| --- | --- | --- |
| `main` | Production. Only receives merges from `dev`. | Vercel **Production** (the main domain) |
| `dev` | Integration. All work lands here first. | Vercel **Preview** with a fixed `dev` branch URL |
| `feature/*`, `fix/*` | One change each, branched from `dev`. | Vercel **Preview** per pull request |

Flow:

1. Branch from `dev`: `git switch dev && git pull && git switch -c feature/my-change`
2. Open a pull request into `dev`. CI must pass; Vercel posts a preview link to test.
3. Merge into `dev`. The `dev` preview URL updates so the change can be checked as a whole.
4. When `dev` is ready to release, open a pull request from `dev` into `main`.
5. Merge into `main`. Vercel deploys to production.

Hotfix: branch `fix/*` from `main`, merge into `main`, then merge `main` back into `dev`.

## CI/CD

- **CI** — GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests and a production build on every push to `main` or `dev` and on every pull request into them.
- **CD** — Vercel is connected to this repository with `main` as the production branch. Pushes to `main` deploy to production; pushes to `dev` and pull requests deploy previews.
- **Dependencies** — Dependabot opens weekly update pull requests against `dev`.

### Recommended GitHub settings

In **Settings → Branches → Add branch ruleset** (or classic branch protection), for both `main` and `dev`:

- Require a pull request before merging
- Require status checks to pass: **Lint, test and build**
- Block force pushes and deletions

For `main`, also restrict who can push, and allow merges only from `dev` (or `fix/*` for hotfixes).

## License

MIT, see [LICENSE](LICENSE).

## Credits

"Old phone" sound effect by scottishperson, from Pixabay (Pixabay Content License).
