import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Inyección de estilos globales para eliminar el fondo blanco del navegador
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    html, body {
      margin: 0;
      padding: 0;
      background-color: #030305;
      min-height: 100vh;
      width: 100%;
    }
  `;
  document.head.appendChild(style);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);