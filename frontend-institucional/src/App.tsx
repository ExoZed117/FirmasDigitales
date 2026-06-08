import React, { useState, useEffect } from "react";
import { Web3Provider } from "./context/Web3Context";
import Login from "./portals/Login";
import AdminPortal from "./portals/AdminPortal";
import CollaboratorPortal from "./portals/CollaboratorPortal";

interface UserSession {
  role: string;
  name: string;
}

const MainApp: React.FC = () => {
  const [collabToken, setCollabToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserSession | null>(null);
  const [animateAdmin, setAnimateAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => setAnimateAdmin(true), 40);
      return () => clearTimeout(timer);
    } else {
      setAnimateAdmin(false);
    }
  }, [user]);

  // Simple routing detection on load
  useEffect(() => {
    // 1. Check path routing: e.g. /sign/TOKEN
    const path = window.location.pathname;
    if (path.startsWith("/sign/")) {
      const token = path.split("/sign/")[1];
      if (token) {
        setCollabToken(token);
        return;
      }
    }

    // 2. Check query parameter: e.g. ?token=TOKEN
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setCollabToken(tokenParam);
      return;
    }

    // 3. Restore session if logged in
    const cachedUser = localStorage.getItem("blockcert_user");
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (e) {
        localStorage.removeItem("blockcert_user");
      }
    }
  }, []);

  const handleLogin = (role: string, name: string) => {
    const session = { role, name };
    setUser(session);
    localStorage.setItem("blockcert_user", JSON.stringify(session));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("blockcert_user");
  };

  // If a collaborator token is loaded, show only the validator portal (clean fullscreen view)
  if (collabToken) {
    return (
      <div className="app-container">
        <header className="header" style={{ justifyContent: "center" }}>
          <div className="header-brand">
            <h1 className="header-logo">BlockCert</h1>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginLeft: "0.5rem", borderLeft: "1px solid var(--glass-border)", paddingLeft: "0.5rem" }}>
              Portal de Colaboradores
            </span>
          </div>
        </header>
        <main className="main-content">
          <CollaboratorPortal token={collabToken} />
        </main>
        <footer style={{ textAlign: "center", padding: "1.5rem", borderTop: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Sistema de Certificacion Academica Blockchain - Distribuidos U.
        </footer>
      </div>
    );
  }

  // Render main screen with smooth transition panels
  return (
    <div className="transition-grid" style={{ minHeight: "100vh" }}>
      
      {/* 1. Login View - animated exit */}
      <div className={`transition-panel ${!user ? "active" : ""}`} style={{ width: "100%" }}>
        <div className="app-container" style={{ justifyContent: "center" }}>
          <main className="main-content">
            <Login onLogin={handleLogin} />
          </main>
        </div>
      </div>
      
      {/* 2. Admin Dashboard View - animated entry */}
      <div className={`transition-panel ${user ? "active" : ""}`} style={{ width: "100%" }}>
        {user && (
          <div className={`app-container ${animateAdmin ? "admin-enter-active" : "admin-enter"}`}>
            {/* Premium Header */}
            <header className="header">
              <div className="header-brand">
                <h1 className="header-logo">BlockCert</h1>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginLeft: "0.5rem", borderLeft: "1px solid var(--glass-border)", paddingLeft: "0.5rem" }}>
                  Administracion
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid var(--glass-border)",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "var(--text-primary)"
                }}>
                  <span style={{ fontWeight: "600" }}>{user.name}</span>
                  <span style={{
                    fontSize: "0.7rem",
                    background: "var(--accent-purple)",
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: "2px",
                    textTransform: "uppercase"
                  }}>
                    {user.role}
                  </span>
                </div>
                <button className="connect-btn" style={{ background: "var(--danger)", padding: "0.4rem 1rem", fontSize: "0.82rem" }} onClick={handleLogout}>
                  Cerrar Sesion
                </button>
              </div>
            </header>

            {/* Main Area */}
            <main className="main-content" style={{ padding: "1.5rem 2rem" }}>
              <AdminPortal />
            </main>

            <footer style={{ textAlign: "center", padding: "1.5rem", borderTop: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Sistema de Certificacion Academica Blockchain - Distribuidos U. - Ethereum y SHA-256
            </footer>
          </div>
        )}
      </div>

    </div>
  );
};

export default function App() {
  return (
    <Web3Provider>
      <MainApp />
    </Web3Provider>
  );
}
