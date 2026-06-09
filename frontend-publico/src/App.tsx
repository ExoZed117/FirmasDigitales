import React, { useState } from "react";
import PublicPortal from "./portals/PublicPortal";

const ApiConfigWidget: React.FC = () => {
  const currentUrl = localStorage.getItem("blockcert_api_url") || "http://localhost:3001";
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(currentUrl);

  const handleSave = (url: string) => {
    let formattedUrl = url.trim();
    if (formattedUrl.endsWith("/")) {
      formattedUrl = formattedUrl.slice(0, -1);
    }
    localStorage.setItem("blockcert_api_url", formattedUrl);
    window.location.reload();
  };

  return (
    <div style={{ position: "relative", zIndex: 9999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--glass-border)",
          padding: "0.4rem 0.8rem",
          borderRadius: "4px",
          fontSize: "0.82rem",
          color: "var(--text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
      >
        <span>🔌</span>
        <span style={{ fontWeight: "600" }}>Conexión API:</span>
        <span style={{ opacity: 0.8, fontSize: "0.78rem" }}>
          {currentUrl.includes("localhost") ? "Localhost" : "Túnel / ngrok"}
        </span>
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "120%",
          right: 0,
          width: "280px",
          background: "var(--bg-glass)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)",
          padding: "1rem",
          borderRadius: "6px",
          boxShadow: "var(--shadow-glow-hover)",
          textAlign: "left"
        }}>
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", color: "var(--accent-purple)" }}>Configuración de Conexión</h4>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Configura la URL base del backend para las peticiones de red.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: "0.8rem", padding: "0.4rem", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="http://localhost:3001"
            />
            
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: "0.3rem", fontSize: "0.75rem" }}
                onClick={() => {
                  setInputValue("http://localhost:3001");
                  handleSave("http://localhost:3001");
                }}
              >
                Localhost
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, padding: "0.3rem", fontSize: "0.75rem" }}
                onClick={() => handleSave(inputValue)}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="header animate-slide-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="header-brand">
            <h1 className="header-logo">BlockCert Publico</h1>
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Verificacion Publica y Autenticidad
          </div>
        </div>
        <ApiConfigWidget />
      </header>

      {/* Main Area */}
      <main className="main-content">
        <PublicPortal />
      </main>

      <footer style={{ textAlign: "center", padding: "1.5rem", borderTop: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
        Sistema de Certificacion Academica Blockchain - Distribuidos U. - Ethereum y SHA-256
      </footer>
    </div>
  );
};

export default App;
