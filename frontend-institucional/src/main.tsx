import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept window.fetch to automatically bypass ngrok browser warnings
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input && typeof input === "object" && "url" in input) {
    url = (input as any).url;
  }

  if (url.includes("ngrok-free.app")) {
    init = init || {};
    const headers = init.headers || {};
    if (headers instanceof Headers) {
      headers.set("ngrok-skip-browser-warning", "true");
    } else if (Array.isArray(headers)) {
      headers.push(["ngrok-skip-browser-warning", "true"]);
    } else if (headers && typeof headers === "object") {
      (headers as any)["ngrok-skip-browser-warning"] = "true";
    }
    init.headers = headers;
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
