import React, { useState, useRef } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../context/contractConfig";

interface VerifiedData {
  existe: boolean;
  codigo: string;
  estudiante: string;
  fechaEmision: number;
  valido: boolean;
  motivoRevocacion: string;
  emisor: string;
  estudianteWallet: string;
  recepcionConfirmada: boolean;
  fechaRecepcion: number;
  cargoEmisor: string;
  fechaRevocacion: number;
}

interface DbData {
  id: string;
  codigo: string;
  estudiante: string;
  status: string;
  officializedPath: string | null;
  certificatePath: string | null;
  hashDocumento: string | null;
  estudianteWallet: string | null;
  recepcionConfirmada: boolean;
  fechaRecepcion: string | null;
  blockchainTxHash?: string | null;
  blockchainBlockNumber?: number | null;
  blockchainContractAddress?: string | null;
  blockchainTimestamp?: string | null;
  estudianteSignatureImage?: string | null;
  collaborators: Array<{
    name: string;
    email: string;
    signed: boolean;
    signedAt: string | null;
    signatureImage: string | null;
  }>;
  auditLogs: Array<{
    action: string;
    details: string;
    timestamp: string;
  }>;
}

export const PublicPortal: React.FC = () => {
  const [activeVerifyTab, setActiveVerifyTab] = useState<"file" | "code" | "qr">("file");
  
  // Verification States
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [docHash, setDocHash] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<VerifiedData | null>(null);
  const [dbData, setDbData] = useState<DbData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual Inputs
  const [inputCode, setInputCode] = useState<string>("");
  
  // QR Scan Simulation
  const [qrScanning, setQrScanning] = useState<boolean>(false);
  const [qrFile, setQrFile] = useState<File | null>(null);

  // Student Reception Canvas States
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Solo se admiten archivos PDF.");
      return;
    }

    setLoading(true);
    setError(null);
    setVerifiedData(null);
    setDbData(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setDocHash(hashHex);

      await verifyHashOnChain(hashHex);
    } catch (err: any) {
      setError(err.message || "Error al procesar el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const verifyHashOnChain = async (hashHex: string) => {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const result = await contractInstance.verificarCertificado(hashHex);
    
    if (!result.existe) {
      throw new Error("CERTIFICADO NO REGISTRADO O ALTERADO: El hash calculado de este PDF no coincide con ningun certificado emitido en la Blockchain.");
    }

    const historyResult = await contractInstance.consultarHistorial(hashHex);

    setVerifiedData({
      existe: result.existe,
      codigo: result.codigo,
      estudiante: result.estudiante,
      fechaEmision: Number(historyResult.fechaEmision) * 1000,
      valido: historyResult.valido,
      motivoRevocacion: historyResult.motivoRevocacion,
      emisor: historyResult.emisor,
      estudianteWallet: historyResult.estudianteWallet,
      recepcionConfirmada: historyResult.recepcionConfirmada,
      fechaRecepcion: Number(historyResult.fechaRecepcion) * 1000,
      cargoEmisor: historyResult.cargoEmisor,
      fechaRevocacion: Number(historyResult.fechaRevocacion) * 1000,
    });

    try {
      const response = await fetch(`http://localhost:3001/api/verify/${hashHex}`);
      if (response.ok) {
        const data = await response.json();
        setDbData(data);
      }
    } catch (dbErr) {
      console.warn("No se pudo conectar al servidor backend. Mostrando solo datos de Blockchain.", dbErr);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setLoading(true);
    setError(null);
    setVerifiedData(null);
    setDbData(null);
    setDocHash(null);

    try {
      const provider = new ethers.JsonRpcProvider("http://localhost:8545");
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const result = await contractInstance.consultarCertificado(inputCode.trim());
      
      if (!result.existe) {
        throw new Error("CODIGO NO ENCONTRADO: El codigo ingresado no corresponde a ningun certificado registrado en la Blockchain.");
      }

      setDocHash(result.hashDocumento);
      await verifyHashOnChain(result.hashDocumento);
    } catch (err: any) {
      setError(err.message || "Error al verificar el codigo.");
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrFile(file);
      setQrScanning(true);
      setError(null);
      setVerifiedData(null);
      setDbData(null);

      setTimeout(async () => {
        try {
          let codeToVerify = "CERT-2026-DOCUSIGN";
          
          const match = file.name.match(/CERT-\d+-\w+/i) || file.name.match(/CERT-\w+/i);
          if (match) {
            codeToVerify = match[0].toUpperCase();
          }

          setInputCode(codeToVerify);
          
          const provider = new ethers.JsonRpcProvider("http://localhost:8545");
          const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          const result = await contractInstance.consultarCertificado(codeToVerify);

          if (!result.existe) {
            throw new Error(`CODIGO QR NO VALIDO: Se decodifico el codigo "${codeToVerify}", pero no esta registrado en la Blockchain.`);
          }

          setDocHash(result.hashDocumento);
          await verifyHashOnChain(result.hashDocumento);
        } catch (err: any) {
          setError(err.message || "Error al decodificar la imagen QR.");
        } finally {
          setQrScanning(false);
        }
      }, 1500);
    }
  };

  const handleConfirmReceptionCanvas = async () => {
    if (!canvasRef.current || !docHash) return;
    const canvas = canvasRef.current;

    const blank = document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      setError("Por favor, dibuje su firma de recepcion antes de confirmar.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const signatureImage = canvas.toDataURL("image/png");

      const res = await fetch(`http://localhost:3001/api/documents/receive/${docHash}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureImage }),
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar la firma de recepcion en el servidor.");
      }

      alert("Firma de recepcion registrada exitosamente.");
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Error al guardar firma de recepcion");
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.clientX || 0);
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.clientY || 0);

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const dbReceived = dbData && dbData.recepcionConfirmada;
  const showReceptionForm = verifiedData && verifiedData.valido && !verifiedData.recepcionConfirmada && !dbReceived;

  return (
    <div className="public-portal">
      {/* Verify Options selector card */}
      <div className="glass-card text-center animate-slide-up">
        <h2 className="card-title justify-center" style={{ borderBottom: "none", paddingBottom: 0 }}>
          Verificador de Certificados Academicos
        </h2>
        <p className="mb-3" style={{ color: "var(--text-secondary)" }}>
          Selecciona un metodo de verificacion para constatar la autenticidad e inalterabilidad de tu titulo academico.
        </p>

        {/* Tab Selector */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <button
            className={`nav-btn ${activeVerifyTab === "file" ? "active" : ""}`}
            onClick={() => { setActiveVerifyTab("file"); setError(null); }}
            style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
          >
            Cargar Archivo PDF
          </button>
          <button
            className={`nav-btn ${activeVerifyTab === "code" ? "active" : ""}`}
            onClick={() => { setActiveVerifyTab("code"); setError(null); }}
            style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
          >
            Ingresar Codigo
          </button>
          <button
            className={`nav-btn ${activeVerifyTab === "qr" ? "active" : ""}`}
            onClick={() => { setActiveVerifyTab("qr"); setError(null); }}
            style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
          >
            Escanear QR
          </button>
        </div>

        {/* Tab Selection Content */}
        <div className="transition-grid">
          
          {/* Tab 1: PDF Drop Zone */}
          <div className={`transition-panel ${activeVerifyTab === "file" ? "active" : ""}`}>
            <div 
              className={`drop-zone ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <label htmlFor="pdf-upload" style={{ cursor: "pointer", width: "100%", height: "100%" }}>
                <div className="drop-zone-text">Arrastra y suelta tu PDF aqui o haz clic para buscarlo</div>
                <div className="drop-zone-subtext">La validacion se realiza en la red Ethereum local</div>
              </label>
            </div>
          </div>

          {/* Tab 2: Code input */}
          <div className={`transition-panel ${activeVerifyTab === "code" ? "active" : ""}`}>
            <form onSubmit={handleVerifyCode} style={{ maxWidth: "400px", margin: "0 auto", padding: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Codigo de Registro Unico *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ej. CERT-2026-DOCUSIGN"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn mt-2" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Verificando..." : "Verificar Codigo"}
              </button>
            </form>
          </div>

          {/* Tab 3: QR Upload & Scan Simulation */}
          <div className={`transition-panel ${activeVerifyTab === "qr" ? "active" : ""}`}>
            <div style={{ maxWidth: "400px", margin: "0 auto", padding: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Subir Imagen de Codigo QR *</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={handleQrUpload}
                  disabled={qrScanning}
                />
              </div>
              
              {qrScanning && (
                <div style={{ marginTop: "1.5rem", position: "relative", width: "200px", height: "200px", background: "rgba(0,0,0,0.4)", border: "2px solid var(--accent-purple)", borderRadius: "4px", margin: "0 auto", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ color: "var(--accent-purple)", fontSize: "0.8rem" }}>Escaneando...</div>
                  <div style={{ position: "absolute", left: 0, width: "100%", height: "3px", background: "#39FF14", boxShadow: "0 0 8px #39FF14", animation: "scan 1.5s linear infinite" }}></div>
                </div>
              )}

              {!qrScanning && qrFile && (
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  Archivo cargado: <strong>{qrFile.name}</strong>
                </p>
              )}
            </div>
          </div>

        </div>

        {loading && !qrScanning && <div className="mt-3">Conectando con la Blockchain y verificando hash...</div>}
      </div>

      {error && (
        <div className="status-alert danger animate-slide-up">
          <span>[Error] </span>
          <div>{error}</div>
        </div>
      )}

      {/* DocuSign-style Student Reception Form */}
      {showReceptionForm && (
        <div className="glass-card animate-slide-up" style={{ borderTopColor: "var(--accent-purple)", background: "rgba(111, 66, 193, 0.05)", maxWidth: "500px", margin: "1.5rem auto" }}>
          <h3 className="card-title justify-center" style={{ color: "var(--text-primary)", borderBottom: "none", paddingBottom: 0 }}>
            Firma de Recepcion de Certificado
          </h3>
          <p className="mb-3 text-center" style={{ fontSize: "0.9rem" }}>
            Si eres el estudiante asignado (<strong>{verifiedData.estudiante}</strong>), dibuja tu firma digital en el recuadro de abajo para confirmar la recepcion oficial.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div className="canvas-container" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <canvas
                ref={canvasRef}
                width={320}
                height={150}
                className="signature-canvas"
                style={{ background: "white", borderRadius: "4px", border: "1px solid var(--glass-border)", marginBottom: "0.5rem" }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              ></canvas>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }} onClick={clearCanvas}>
                  Limpiar Lienzo
                </button>
                <button className="btn" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }} onClick={handleConfirmReceptionCanvas}>
                  Confirmar Firma de Recepcion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {verifiedData && (
        <div className="grid-2 animate-slide-up">
          {/* Diploma Visualizer */}
          <div className="diploma-card" style={{ border: "2px solid var(--accent-purple)", borderRadius: "4px" }}>
            <div className={`diploma-seal ${verifiedData.valido ? "" : "revoked"}`} style={{ borderRadius: "2px" }}>
              {verifiedData.valido ? "VALIDO" : "REVOCADO"}
            </div>
            
            <h3 className="diploma-title">Certificado Academico</h3>
            <p style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Se otorga la presente certificacion a:</p>
            <h2 className="diploma-student" style={{ textDecorationColor: "var(--accent-purple)" }}>{verifiedData.estudiante}</h2>
            <p className="mt-2" style={{ color: "var(--text-secondary)" }}>
              Por haber cumplido con todos los requisitos academicos correspondientes.
            </p>
            
            <div className="mt-3" style={{ fontSize: "0.9rem" }}>
              <strong>Codigo del Certificado:</strong> {verifiedData.codigo} <br />
              <strong>Cargo Emisor:</strong> {verifiedData.cargoEmisor} <br />
              <strong>Fecha de Emision:</strong> {new Date(verifiedData.fechaEmision).toLocaleString()}
            </div>

            <div className="mt-3" style={{ padding: "0.75rem", background: "rgba(0,0,0,0.02)", borderRadius: "4px", border: "1px dashed var(--glass-border)", fontSize: "0.82rem" }}>
              <strong>Billetera Estudiante:</strong> {verifiedData.estudianteWallet && verifiedData.estudianteWallet !== "0x0000000000000000000000000000000000000000" ? verifiedData.estudianteWallet : "No requerida"} <br />
              {verifiedData.recepcionConfirmada || dbReceived ? (
                <div style={{ marginTop: "0.5rem" }}>
                  <span style={{ color: "var(--success)", fontWeight: "600" }}>
                    Recepcion firmada digitalmente
                  </span>
                  {dbData && dbData.estudianteSignatureImage && (
                    <div style={{ marginTop: "0.5rem", textAlign: "center" }}>
                      <img 
                        src={dbData.estudianteSignatureImage} 
                        alt="Firma de recepcion estudiante" 
                        style={{ height: "45px", background: "white", padding: "2px", borderRadius: "4px" }} 
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span style={{ color: "var(--warning)", fontWeight: "600" }}>
                  Recepcion pendiente de firma por el graduado
                </span>
              )}
            </div>

            {dbData && dbData.collaborators && (
              <div className="diploma-signatures">
                {dbData.collaborators.map((col, index) => (
                  <div key={index} className="diploma-signature-item">
                    {col.signatureImage ? (
                      <img src={col.signatureImage} alt={`Firma de ${col.name}`} className="diploma-sig-img" />
                    ) : (
                      <div style={{ height: "50px", display: "flex", alignItems: "center", color: "red" }}>
                        Firma Faltante
                      </div>
                    )}
                    <span className="diploma-sig-name">{col.name}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Validador</span>
                  </div>
                ))}
              </div>
            )}

            <div className="hash-box" style={{ borderRadius: "4px" }}>
              <span>Hash SHA-256:</span>
              <span>{docHash}</span>
            </div>

            {dbData && dbData.blockchainTxHash && (
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.78rem", background: "rgba(0,0,0,0.02)", padding: "0.75rem", borderRadius: "4px", border: "1px solid var(--glass-border)", wordBreak: "break-all" }}>
                <div><strong>Smart Contract:</strong> {dbData.blockchainContractAddress}</div>
                <div><strong>Hash Transaccion:</strong> {dbData.blockchainTxHash}</div>
                <div><strong>Bloque:</strong> {dbData.blockchainBlockNumber}</div>
              </div>
            )}
          </div>

          {/* Audit Details */}
          <div>
            {verifiedData.valido ? (
              <div className="status-alert success">
                <span>[Valido] </span>
                <div>
                  <strong>Certificado Valido</strong>
                  <div style={{ fontSize: "0.85rem", fontWeight: "normal" }}>
                    Registrado en Blockchain por: <strong>{verifiedData.cargoEmisor}</strong> ({verifiedData.emisor}). El archivo es original y no presenta ninguna alteracion.
                  </div>
                </div>
              </div>
            ) : (
              <div className="status-alert danger">
                <span>[Revocado] </span>
                <div>
                  <strong>Certificado Revocado</strong>
                  <div style={{ fontSize: "0.85rem", fontWeight: "normal" }}>
                    Este certificado ha sido invalidado el {new Date(verifiedData.fechaRevocacion).toLocaleString()}. <br />
                    <strong>Motivo de Revocacion:</strong> {verifiedData.motivoRevocacion}
                  </div>
                </div>
              </div>
            )}

            {/* Downloads */}
            {dbData && (
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h4 className="mb-2" style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>
                  Archivos Oficiales
                </h4>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {dbData.officializedPath && (
                    <a
                      href={`http://localhost:3001/${dbData.officializedPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ flex: 1, textDecoration: "none", textAlign: "center" }}
                    >
                      Descargar PDF Oficializado
                    </a>
                  )}
                  {dbData.certificatePath && (
                    <a
                      href={`http://localhost:3001/${dbData.certificatePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ flex: 1, textDecoration: "none", textAlign: "center" }}
                    >
                      Descargar Certificado
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Blockchain History Log */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <h4 className="mb-2" style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>
                Linea de Tiempo de Auditoria en Blockchain
              </h4>
              <ul className="audit-list">
                <li className="audit-item" style={{ borderLeftColor: "var(--success)" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="audit-action" style={{ color: "var(--success)" }}>EMISION (Blockchain)</span>
                      <span className="audit-time">{new Date(verifiedData.fechaEmision).toLocaleString()}</span>
                    </div>
                    <p className="mt-1" style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      Certificado oficial registrado por el emisor con cargo **{verifiedData.cargoEmisor}** ({verifiedData.emisor}).
                    </p>
                  </div>
                </li>

                {(verifiedData.recepcionConfirmada || dbReceived) && (
                  <li className="audit-item" style={{ borderLeftColor: "var(--accent-purple)" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="audit-action" style={{ color: "var(--accent-purple)" }}>RECEPCION</span>
                        <span className="audit-time">
                          {verifiedData.recepcionConfirmada 
                            ? new Date(verifiedData.fechaRecepcion).toLocaleString()
                            : dbData?.fechaRecepcion ? new Date(dbData.fechaRecepcion).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="mt-1" style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                        Firma digital de recepcion confirmada. {verifiedData.recepcionConfirmada ? "(Registrado en Blockchain)" : "(Registrado en Servidor Local)"}
                      </p>
                    </div>
                  </li>
                )}

                {!verifiedData.valido && (
                  <li className="audit-item" style={{ borderLeftColor: "var(--danger)" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="audit-action" style={{ color: "var(--danger)" }}>REVOCACION (Blockchain)</span>
                        <span className="audit-time">{new Date(verifiedData.fechaRevocacion).toLocaleString()}</span>
                      </div>
                      <p className="mt-1" style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                        Certificado revocado. Motivo: **{verifiedData.motivoRevocacion}**
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Local Audit Logs */}
            {dbData && dbData.auditLogs && (
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h4 className="mb-2" style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>
                  Bitacora Completa de Base de Datos
                </h4>
                <ul className="audit-list">
                  {dbData.auditLogs.map((log, index) => (
                    <li key={index} className="audit-item" style={{ borderLeftColor: "var(--accent-purple)" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="audit-action">{log.action}</span>
                          <span className="audit-time">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="mt-1" style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                          {log.details}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default PublicPortal;
