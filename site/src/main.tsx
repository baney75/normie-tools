import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/motion.css";
import "./styles/container.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline shell. Production only; same-origin files only.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
