import React from "react";
import PublicPortal from "./portals/PublicPortal";

const App: React.FC = () => {
  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="header animate-slide-up">
        <div className="header-brand">
          <h1 className="header-logo">BlockCert Publico</h1>
        </div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Verificacion Publica y Autenticidad
        </div>
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
