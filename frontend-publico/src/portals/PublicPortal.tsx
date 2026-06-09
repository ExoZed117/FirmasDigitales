import React, { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../context/contractConfig";
import { Html5Qrcode } from "html5-qrcode";

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

  // QR Camera Scanner States
  const [qrMode, setQrMode] = useState<"upload" | "camera">("upload");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Student Reception Canvas States (Removed signature canvas)

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
      const API_URL = localStorage.getItem("blockcert_api_url") || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/verify/${hashHex}`);
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

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    setLoading(true);
    setError(null);
    
    // We need a short delay to ensure the container div is rendered in the DOM before html5-qrcode tries to attach
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader-camera");
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          async (decodedText) => {
            // Success! QR Code scanned
            await stopCamera();
            await handleDecodedQr(decodedText);
          },
          () => {
            // verbose error, ignore
          }
        );
        setLoading(false);
      } catch (err: any) {
        console.error("Error starting camera scanner: ", err);
        setCameraError("No se pudo acceder a la cámara. Asegúrate de otorgar permisos de cámara o que no esté en uso por otra aplicación.");
        setCameraActive(false);
        setLoading(false);
      }
    }, 200);
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping camera: ", err);
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  const simulateCameraScan = async () => {
    await stopCamera();
    await handleDecodedQr("CERT-2026-DOCUSIGN");
  };

  const handleDecodedQr = async (decodedText: string) => {
    setLoading(true);
    setError(null);
    setVerifiedData(null);
    setDbData(null);
    setDocHash(null);

    try {
      let codeToVerify = decodedText.trim();
      
      // If it's a URL, parse the code query parameter
      try {
        const url = new URL(decodedText);
        const codeParam = url.searchParams.get("code");
        if (codeParam) {
          codeToVerify = codeParam;
        }
      } catch (e) {
        // Not a URL
      }

      const match = codeToVerify.match(/CERT-\d+-\w+/i) || codeToVerify.match(/CERT-\w+/i);
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
      setError(err.message || "Error al verificar el codigo QR.");
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
          const html5QrCode = new Html5Qrcode("qr-reader-file");
          const decodedText = await html5QrCode.scanFile(file, true);
          await handleDecodedQr(decodedText);
        } catch (err: any) {
          console.warn("Real QR image decoding failed, falling back to simulated file match:", err);
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
              throw new Error(`CODIGO QR SIMULADO NO VALIDO: Se obtuvo el codigo "${codeToVerify}" del nombre del archivo, pero no esta registrado en la Blockchain.`);
            }

            setDocHash(result.hashDocumento);
            await verifyHashOnChain(result.hashDocumento);
          } catch (err2: any) {
            setError(err2.message || "Error al decodificar la imagen QR.");
          }
        } finally {
          setQrScanning(false);
        }
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.error("Cleanup stop error:", err));
        }
      }
    };
  }, []);

  useEffect(() => {
    if (activeVerifyTab !== "qr" || qrMode !== "camera") {
      stopCamera();
    }
  }, [activeVerifyTab, qrMode]);

  const dbReceived = dbData && dbData.recepcionConfirmada;

  return (
    <div className="public-portal">
      {/* 1. Selector de metodos de verificacion (Solo visible si no se ha verificado aun) */}
      {!verifiedData && (
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

            {/* Tab 3: QR Upload & Live Camera Scan */}
            <div className={`transition-panel ${activeVerifyTab === "qr" ? "active" : ""}`}>
              <div style={{ maxWidth: "400px", margin: "0 auto", padding: "1rem" }}>
                
                {/* Hidden element for scanFile local decoding */}
                <div id="qr-reader-file" style={{ display: "none" }}></div>

                {/* Sub-tab selection for QR Mode */}
                <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  <button
                    type="button"
                    className={`nav-btn ${qrMode === "upload" ? "active" : ""}`}
                    onClick={() => { setQrMode("upload"); setCameraError(null); }}
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                  >
                    Subir Imagen QR
                  </button>
                  <button
                    type="button"
                    className={`nav-btn ${qrMode === "camera" ? "active" : ""}`}
                    onClick={() => { setQrMode("camera"); setCameraError(null); }}
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                  >
                    Escanear con Cámara
                  </button>
                </div>

                {qrMode === "upload" && (
                  <div>
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
                )}

                {qrMode === "camera" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    {!cameraActive ? (
                      <div style={{ textAlign: "center", padding: "1.5rem" }}>
                        <p className="mb-3" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                          Permite el acceso a tu cámara para poder escanear el código QR del título.
                        </p>
                        <button
                          type="button"
                          className="btn"
                          onClick={startCamera}
                          style={{ padding: "0.5rem 1.5rem" }}
                        >
                          Iniciar Cámara
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {/* Scanner Container */}
                        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "#000", borderRadius: "8px", overflow: "hidden", border: "2px solid var(--accent-purple)", boxShadow: "0 0 15px rgba(168, 85, 247, 0.4)" }}>
                          
                          {/* Live reader container for html5-qrcode */}
                          <div id="qr-reader-camera" style={{ width: "100%", height: "100%" }}></div>

                          {/* Scanner Laser Overlay */}
                          <div style={{
                            position: "absolute",
                            left: 0,
                            width: "100%",
                            height: "3px",
                            background: "#39FF14",
                            boxShadow: "0 0 8px #39FF14",
                            animation: "scan 2s linear infinite",
                            zIndex: 10,
                            pointerEvents: "none"
                          }}></div>

                          {/* Scanner Framing Guides */}
                          <div style={{
                            position: "absolute",
                            top: "12.5%",
                            left: "12.5%",
                            width: "75%",
                            height: "75%",
                            border: "2px dashed rgba(255, 255, 255, 0.5)",
                            borderRadius: "8px",
                            boxSizing: "border-box",
                            zIndex: 5,
                            pointerEvents: "none"
                          }}></div>
                        </div>

                        {/* Control Buttons */}
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", width: "100%" }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={stopCamera}
                            style={{ flex: 1, padding: "0.4rem" }}
                          >
                            Detener Cámara
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={simulateCameraScan}
                            style={{ flex: 1, padding: "0.4rem", background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)", fontSize: "0.8rem" }}
                            title="Simular escaneo de código QR para pruebas rápidas"
                          >
                            Simular Escaneo
                          </button>
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div style={{ color: "var(--danger)", fontSize: "0.85rem", textAlign: "center", marginTop: "0.5rem" }}>
                        {cameraError}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>

          {loading && !qrScanning && <div className="mt-3">Conectando con la Blockchain y verificando hash...</div>}
        </div>
      )}

      {/* 2. Alerta de error */}
      {error && (
        <div className="status-alert danger animate-slide-up">
          <span>[Error] </span>
          <div>{error}</div>
        </div>
      )}

      {/* 3. Panel de resultados simplificado (Solo visible si esta verificado) */}
      {verifiedData && (
        <div className="animate-slide-up" style={{ maxWidth: "600px", margin: "0 auto" }}>
          
          {/* Alerta de Validez */}
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

          {/* Tarjeta de Diploma */}
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
                <span style={{ color: "var(--success)", fontWeight: "600" }}>
                  Recepcion firmada digitalmente
                </span>
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

          {/* Boton para regresar */}
          <div style={{ textAlign: "center", marginTop: "2rem", marginBottom: "2rem" }}>
            <button
              onClick={() => {
                setVerifiedData(null);
                setDbData(null);
                setDocHash(null);
                setError(null);
                setInputCode("");
                setQrFile(null);
              }}
              className="btn btn-secondary"
              style={{ padding: "0.6rem 2.5rem", fontSize: "0.9rem" }}
            >
              Volver atrás
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
export default PublicPortal;
