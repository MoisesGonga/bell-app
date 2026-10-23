import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyTheme, loadSettings } from "./lib/settings.js";
import "./styles.css";

// Apply the saved appearance before the first paint to avoid a flash.
applyTheme(loadSettings().theme);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
