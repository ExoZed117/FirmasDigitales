import React, { useState } from "react";

interface LoginProps {
  onLogin: (role: string, username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simulated short delay for authentic feel
    setTimeout(() => {
      const lowerUser = username.trim().toLowerCase();
      const pass = password.trim();

      if (lowerUser === "admin" && pass === "admin") {
        setIsExiting(true);
        setTimeout(() => {
          onLogin("admin", "Administrador Principal");
        }, 500);
      } else if (lowerUser === "rector" && pass === "rector") {
        setIsExiting(true);
        setTimeout(() => {
          onLogin("rector", "Rector General");
        }, 500);
      } else {
        setError("Credenciales incorrectas. Pruebe con 'admin' / 'admin' o 'rector' / 'rector'.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "70vh",
      padding: "1rem"
    }}>
      <div className={`glass-card ${isExiting ? "login-exit" : "animate-slide-up"}`} style={{
        maxWidth: "450px",
        width: "100%",
        boxShadow: "var(--shadow-glow-hover)",
        borderTop: "3px solid var(--accent-purple)",
        borderRadius: "4px"
      }}>
        <div className="text-center mb-3">
          <h2 className="header-logo" style={{ fontSize: "2.2rem", marginTop: "0.5rem" }}>BlockCert</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Portal Institucional y de Firmas
          </p>
        </div>

        {error && (
          <div className="status-alert danger mb-2" style={{ fontSize: "0.88rem", padding: "0.75rem 1rem" }}>
            <span>[Error] </span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario *</label>
            <input
              type="text"
              className="form-input"
              placeholder="ej. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña *</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn mt-3"
            style={{ width: "100%", padding: "0.9rem" }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
                <span className="wallet-dot connected" style={{ animation: "pulse 1.2s infinite ease-in-out" }}></span>
                Autenticando...
              </span>
            ) : "Iniciar Sesión"}
          </button>
        </form>

        <div style={{
          marginTop: "1.5rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--glass-border)",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          textAlign: "center"
        }}>
          <p>Credenciales de prueba:</p>
          <code style={{ color: "var(--accent-purple)", display: "block", marginTop: "0.25rem" }}>
            admin / admin (Administrador) <br />
            rector / rector (Rector)
          </code>
        </div>
      </div>
    </div>
  );
};

export default Login;
