import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia or IndexedDB; the app handles both being missing.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}
