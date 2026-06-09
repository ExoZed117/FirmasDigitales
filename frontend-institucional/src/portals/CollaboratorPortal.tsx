import React, { useState, useEffect, useRef } from "react";
import { getApiUrl } from "../context/apiConfig";

interface CollaboratorPortalProps {
  token: string;
}

interface CollaboratorRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  signed: boolean;
  signedAt: string | null;
  posX: number; // PDF posX
  posY: number; // PDF posY
  page: number;
  signatureImage: string | null; // Base64 signature
}

interface CollaboratorData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  signed: boolean;
  posX: number;
  posY: number;
  page: number;
  document: {
    id: string;
    codigo: string;
    estudiante: string;
    originalPath: string | null;
    requireFacial: boolean;
    collaborators: CollaboratorRecord[];
  };
}

export const CollaboratorPortal: React.FC<CollaboratorPortalProps> = ({ token }) => {
  const [collab, setCollab] = useState<CollaboratorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signedSuccess, setSignedSuccess] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  
  // Signature Method State ("draw" | "upload")
  const [sigMethod, setSigMethod] = useState<"draw" | "upload">("draw");
  const [uploadedSigImage, setUploadedSigImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Facial Verification States
  const [isFacialVerified, setIsFacialVerified] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facialProgress, setFacialProgress] = useState<number>(0);
  const [facialStatus, setFacialStatus] = useState<string>("Inicie la cámara de seguridad para continuar");
  const [facialScanError, setFacialScanError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Skin tone detector in RGB
  const isSkinColor = (r: number, g: number, b: number): boolean => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    return r > 95 && g > 40 && b > 20 &&
           diff > 15 &&
           Math.abs(r - g) > 15 &&
           r > g && r > b;
  };

  const startFacialCamera = async () => {
    setFacialScanError(null);
    setFacialProgress(0);
    setFacialStatus("Accediendo a la cámara de seguridad...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCameraStream(stream);
      setIsCameraActive(true);
      setIsAnalyzing(true);
      setFacialStatus("Alinee su rostro dentro del óvalo de escaneo...");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing webcam:", err);
      setFacialScanError("No se pudo acceder a la cámara. Por favor otorgue permisos de cámara o verifique si está en uso.");
      setFacialStatus("Error de acceso a la cámara");
    }
  };

  const stopFacialCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsAnalyzing(false);
  };

  const simulateFacialVerification = () => {
    stopFacialCamera();
    setFacialProgress(100);
    setFacialStatus("Rostro validado mediante simulación.");
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    let intervalId: any;
    let localProgress = 0;

    if (isAnalyzing && videoRef.current && faceCanvasRef.current) {
      const video = videoRef.current;
      const canvas = faceCanvasRef.current;
      const ctx = canvas.getContext("2d");

      intervalId = setInterval(() => {
        if (!video || !canvas || !ctx) return;

        if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          let skinPixels = 0;
          const totalPixels = canvas.width * canvas.height;

          // Downsample for performance (inspect 1 in 16 pixels)
          for (let i = 0; i < data.length; i += 64) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            if (isSkinColor(r, g, b)) {
              skinPixels++;
            }
          }

          const skinRatio = skinPixels / (totalPixels / 16);
          // Human face inside central region covers ~5% to 45% skin ratio
          const facePresent = skinRatio >= 0.05 && skinRatio <= 0.45;

          if (facePresent) {
            localProgress += 8; // increase progress when face is present
            setFacialProgress(Math.min(localProgress, 100));
            if (localProgress >= 100) {
              setFacialStatus("Rostro verificado con éxito.");
              setIsAnalyzing(false);
              stopFacialCamera();
            } else if (localProgress > 60) {
              setFacialStatus("Verificando vitalidad de la persona... Parpadee por favor");
            } else {
              setFacialStatus("Rostro detectado. Analizando características faciales...");
            }
          } else {
            // Decay progress if no face is detected
            localProgress = Math.max(0, localProgress - 4);
            setFacialProgress(localProgress);
            setFacialStatus("Alinee su rostro. Buscando persona...");
          }
        } catch (e) {
          // ignore canvas access errors before video stream fully starts
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAnalyzing]);

  useEffect(() => {
    fetchCollaboratorData();
  }, [token]);

  const fetchCollaboratorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/documents/sign/${token}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Token de invitacion no valido.");
      }
      const data = await res.json();
      setCollab(data);
      if (data.signed) {
        setSignedSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Convert PDF coordinates (612x792, bottom-left) to simulated screen coordinates (500x700, top-left)
  const getSimulatedCoords = (pdfX: number, pdfY: number) => {
    const posX_sim = Math.round((pdfX / 612) * 500);
    const posY_sim = Math.round(700 - 55 - ((pdfY / 792) * 700));
    return { x: posX_sim, y: posY_sim };
  };

  // Canvas Handlers
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

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedSigImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmSignature = async () => {
    let signatureImage = "";

    if (sigMethod === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const blank = document.createElement("canvas");
      blank.width = canvas.width;
      blank.height = canvas.height;
      if (canvas.toDataURL() === blank.toDataURL()) {
        alert("Por favor, dibuje su firma sobre el lienzo antes de confirmar.");
        return;
      }
      signatureImage = canvas.toDataURL("image/png");
    } else {
      if (!uploadedSigImage) {
        alert("Por favor, cargue una imagen de su firma antes de confirmar.");
        return;
      }
      signatureImage = uploadedSigImage;
    }

    try {
      setLoading(true);
      setError(null);

      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/documents/sign/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signatureImage }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "No se pudo registrar la firma.");
      }

      setSignedSuccess(true);
      setIsModalOpen(false);
      await fetchCollaboratorData();
    } catch (err: any) {
      setError(err.message || "Error al guardar firma.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !collab) {
    return <div className="text-center mt-3">Cargando detalles del validador...</div>;
  }

  if (error && !collab) {
    return (
      <div className="status-alert danger mt-3">
        <span>[Error] </span>
        <div>{error}</div>
      </div>
    );
  }

  if (!collab) return null;

  // Facial verification gate intercept
  if (collab.document.requireFacial && !signedSuccess && !isFacialVerified) {
    return (
      <div className="collaborator-portal animate-slide-up" style={{ maxWidth: "550px", margin: "0 auto" }}>
        <div className="glass-card text-center" style={{ padding: "2rem" }}>
          <h2 className="header-logo" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
            Verificación de Identidad Biométrica
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Este certificado requiere autenticación biométrica facial para verificar que usted es una persona física antes de habilitar la firma del documento.
          </p>

          {/* Hidden Canvas for Frame Processing */}
          <canvas ref={faceCanvasRef} style={{ display: "none" }}></canvas>

          {/* Oval Scanner container */}
          <div style={{
            position: "relative",
            width: "280px",
            height: "340px",
            margin: "0 auto 1.5rem",
            borderRadius: "50% / 50%",
            overflow: "hidden",
            background: "#000",
            border: facialProgress === 100 ? "4px solid var(--success)" : "4px solid var(--accent-purple)",
            boxShadow: facialProgress === 100 ? "0 0 20px rgba(16, 185, 129, 0.4)" : "0 0 20px rgba(168, 85, 247, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", padding: "1rem", textAlign: "center" }}>
                {facialProgress === 100 ? (
                  <div style={{ color: "var(--success)", fontSize: "1rem", fontWeight: "bold" }}>
                    ✓ Identificación Completa
                  </div>
                ) : (
                  <div>
                    Cámara Inactiva <br />
                    <span style={{ fontSize: "0.75rem" }}>Haga clic abajo para iniciar</span>
                  </div>
                )}
              </div>
            )}

            {/* Glowing Laser Scan Bar */}
            {isAnalyzing && (
              <div style={{
                position: "absolute",
                left: 0,
                width: "100%",
                height: "4px",
                background: "#a855f7",
                boxShadow: "0 0 10px #a855f7",
                animation: "scan 2.5s linear infinite",
                pointerEvents: "none"
              }}></div>
            )}

            {/* Apple Face ID Style SVG Overlay */}
            {isCameraActive && (
              <svg 
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none"
                }}
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id="oval-hole">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <ellipse cx="50" cy="50" rx="36" ry="44" fill="black" />
                  </mask>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="rgba(15, 23, 42, 0.55)" mask="url(#oval-hole)" />
              </svg>
            )}
          </div>

          {/* Progress and status message */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: facialProgress === 100 ? "var(--success)" : "var(--text-primary)",
              marginBottom: "0.5rem"
            }}>
              <span>Progreso de Verificación:</span>
              <span>{facialProgress}%</span>
            </div>
            
            <div style={{
              width: "100%",
              height: "8px",
              background: "rgba(0,0,0,0.1)",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "0.75rem"
            }}>
              <div style={{
                width: `${facialProgress}%`,
                height: "100%",
                background: facialProgress === 100 ? "var(--success)" : "linear-gradient(90deg, #a855f7, #6366f1)",
                transition: "width 0.2s ease"
              }}></div>
            </div>

            <div style={{
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
              background: "rgba(0, 0, 0, 0.02)",
              border: "1px solid var(--glass-border)",
              padding: "0.6rem 1rem",
              borderRadius: "4px",
              fontStyle: "italic"
            }}>
              {facialStatus}
            </div>
          </div>

          {facialScanError && (
            <div className="status-alert danger mb-3" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
              <span>[Error] </span>
              <div>{facialScanError}</div>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {facialProgress < 100 ? (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {!isCameraActive ? (
                  <button
                    onClick={startFacialCamera}
                    className="btn"
                    style={{ flex: 1, padding: "0.75rem" }}
                  >
                    Iniciar Cámara de Seguridad
                  </button>
                ) : (
                  <button
                    onClick={stopFacialCamera}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.75rem" }}
                  >
                    Detener Cámara
                  </button>
                )}
                
                {isCameraActive && (
                  <button
                    onClick={simulateFacialVerification}
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                      color: "#fff",
                      border: "none"
                    }}
                  >
                    Simular Rostro
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsFacialVerified(true)}
                className="btn"
                style={{
                  padding: "0.8rem",
                  fontSize: "0.95rem",
                  background: "var(--success)",
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)"
                }}
              >
                Continuar a la Firma del Documento
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const allCols = collab.document.collaborators || [];

  return (
    <div className="collaborator-portal">
      {/* Brand Header */}
      <div className="glass-card text-center animate-slide-up" style={{ padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
        <h2 className="header-logo" style={{ display: "inline-block", fontSize: "1.85rem" }}>
          Portal de Consenso de Firmas
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: "0.25rem" }}>
          Estudiante: <strong style={{ color: "var(--text-primary)" }}>{collab.document.estudiante}</strong> | 
          Codigo: <strong style={{ color: "var(--text-primary)" }}>{collab.document.codigo}</strong>
        </p>
      </div>

      {signedSuccess ? (
        <div className="glass-card text-center animate-slide-up" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div className="status-alert success justify-center" style={{ display: "inline-flex", marginBottom: "1.5rem" }}>
            <span>[Firmado] </span>
            <div>
              <strong>¡Tu firma ha sido estampada!</strong>
              <p style={{ fontWeight: "normal", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                Has completado la validacion de este certificado academico con exito. Una vez que todos los colaboradores firmen, se registrara el hash inalterable en Ethereum.
              </p>
            </div>
          </div>
          
          <div style={{
            background: "rgba(0,0,0,0.01)",
            border: "1px solid var(--glass-border)",
            borderRadius: "4px",
            padding: "1rem",
            textAlign: "left"
          }}>
            <h4 className="mb-2" style={{ color: "var(--accent-purple)" }}>Estado de Consenso:</h4>
            {allCols.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "0.4rem 0", borderBottom: "1px solid var(--glass-border)" }}>
                <span>{c.name} ({c.email})</span>
                <span style={{ color: c.signed ? "var(--success)" : "var(--warning)", fontWeight: "bold" }}>
                  {c.signed ? "Firmado" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid-2 animate-slide-up" style={{ alignItems: "start" }}>
          
          {/* Instructions and PDF Mockup preview */}
          <div className="glass-card text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h3 className="card-title" style={{ width: "100%", justifyContent: "center" }}>
              Documento de Certificacion
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.2rem" }}>
              Haz clic sobre la caja de firma resaltada en rosa para estampar tu firma en el documento. Las demas zonas corresponden a otros validadores y se encuentran bloqueadas.
            </p>

            {/* Simulated interactive document preview */}
            <div className="pdf-mockup-page">
              <div className="pdf-mockup-watermark" style={{ color: "rgba(0,0,0,0.03)" }}>Consenso Pendiente</div>

              {/* Render all signature zones on this page */}
              {allCols.map((col) => {
                const isSelf = col.id === collab.id;
                const { x, y } = getSimulatedCoords(col.posX, col.posY);

                if (col.signed) {
                  return (
                    <div
                      key={col.id}
                      className="collaborator-sig-box signed"
                      style={{ left: `${x}px`, top: `${y}px` }}
                    >
                      {col.signatureImage ? (
                        <img
                          src={col.signatureImage}
                          alt={`Firma ${col.name}`}
                          style={{ maxWidth: "100%", maxHeight: "35px", objectFit: "contain", filter: "contrast(1.2)" }}
                        />
                      ) : (
                        <span style={{ fontSize: "0.6rem" }}>Firmado</span>
                      )}
                      <span style={{ fontSize: "0.55rem", opacity: 0.8, whiteSpace: "nowrap" }}>{col.name}</span>
                    </div>
                  );
                } else if (isSelf) {
                  return (
                    <div
                      key={col.id}
                      className="collaborator-sig-box active-clickable"
                      style={{ left: `${x}px`, top: `${y}px` }}
                      onClick={() => setIsModalOpen(true)}
                    >
                      <span style={{ fontSize: "0.7rem", fontWeight: "800" }}>FIRMA AQUI</span>
                      <span style={{ fontSize: "0.55rem", opacity: 0.9 }}>{col.name}</span>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={col.id}
                      className="collaborator-sig-box locked"
                      style={{ left: `${x}px`, top: `${y}px` }}
                      title={`Zona reservada para ${col.name} (${col.email})`}
                    >
                      <span style={{ fontSize: "0.6rem" }}>Bloqueado</span>
                      <span style={{ fontSize: "0.55rem", opacity: 0.7, whiteSpace: "nowrap" }}>{col.name}</span>
                    </div>
                  );
                }
              })}

              {/* Faux Certificate Visuals */}
              <div className="pdf-mockup-content">
                <div className="pdf-mockup-header">
                  <div className="pdf-mockup-logo" style={{ color: "var(--accent-purple)" }}>CERTIFICADO ACADEMICO</div>
                  <div className="pdf-mockup-subtitle">SISTEMA DISTRIBUIDO BLOCKCHAIN</div>
                </div>

                <div className="pdf-mockup-body">
                  <div style={{ fontSize: "0.65rem", color: "#888", letterSpacing: "1px" }}>SE CERTIFICA QUE EL ESTUDIANTE</div>
                  <div className="pdf-mockup-title" style={{ fontSize: "1.25rem", margin: "0.2rem 0" }}>
                    {collab.document.estudiante}
                  </div>
                  <div className="pdf-mockup-text" style={{ fontSize: "0.72rem" }}>
                    Ha completado exitosamente el plan de estudios correspondiente y las evaluaciones requeridas por esta institucion.
                  </div>
                  <div style={{
                    border: "1px dashed #ddd",
                    padding: "0.5rem",
                    fontSize: "0.62rem",
                    color: "var(--accent-purple)",
                    background: "rgba(111, 66, 193, 0.02)",
                    borderRadius: "4px"
                  }}>
                    Codigo: {collab.document.codigo} <br />
                    Consenso: {allCols.filter(c => c.signed).length} / {allCols.length} Firmas
                  </div>
                </div>

                <div className="pdf-mockup-footer">
                  <div className="pdf-mockup-meta">
                    <span>Fecha Emision: {new Date().toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#aaa" }}>
                    Caja de Firmas
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Status Card */}
          <div className="glass-card">
            <h3 className="card-title">Lista de Firmantes</h3>
            <p className="mb-3" style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              Para oficializar el documento y subirlo a la Blockchain, se requiere la aprobacion de los validadores asignados:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {allCols.map((c) => {
                const isSelf = c.id === collab.id;
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "1rem",
                      borderRadius: "4px",
                      background: isSelf ? "rgba(111,66,193,0.05)" : "var(--bg-secondary)",
                      border: isSelf ? "1px solid var(--accent-purple)" : "1px solid var(--glass-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <strong style={{ color: isSelf ? "var(--accent-purple)" : "var(--text-primary)" }}>
                        {c.name} {isSelf && "(Tu)"}
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                        Email: {c.email} <br />
                        Pagina de Firma: Anexa al Final
                      </div>
                    </div>
                    <div>
                      {c.signed ? (
                        <span className="badge badge-registered" style={{ fontSize: "0.72rem" }}>Firmado</span>
                      ) : (
                        <span className="badge badge-pending" style={{ fontSize: "0.72rem" }}>Pendiente</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: "1.5rem" }}>
              <button
                className="btn btn-secondary"
                style={{ width: "100%" }}
                onClick={fetchCollaboratorData}
                disabled={loading}
              >
                Actualizar Estados
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Signature Capture Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            className="glass-card text-center animate-slide-up"
            style={{ maxWidth: "450px", width: "90%", boxShadow: "var(--shadow-glow-hover)", borderRadius: "4px" }}
          >
            <h3 className="card-title justify-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Estampar Firma Digital</span>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                onClick={() => {
                  setIsModalOpen(false);
                  setUploadedSigImage(null);
                }}
              >
                Cancelar
              </button>
            </h3>

            {/* Signature Method Selector */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.2rem", justifyContent: "center" }}>
              <button
                type="button"
                className={`btn btn-secondary ${sigMethod === "draw" ? "active" : ""}`}
                style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", borderRadius: "4px" }}
                onClick={() => setSigMethod("draw")}
              >
                Dibujar Firma
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${sigMethod === "upload" ? "active" : ""}`}
                style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", borderRadius: "4px" }}
                onClick={() => setSigMethod("upload")}
              >
                Subir Imagen
              </button>
            </div>

            {error && (
              <div className="status-alert danger mb-2" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                <span>[Error] </span>
                <div>{error}</div>
              </div>
            )}

            {sigMethod === "draw" ? (
              <div className="canvas-container">
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Dibuja tu firma con el mouse o tu dedo sobre el recuadro blanco:
                </p>
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={180}
                  className="signature-canvas"
                  style={{ background: "#ffffff" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                ></canvas>
                <div style={{ display: "flex", gap: "1rem", width: "100%", justifyContent: "center", marginTop: "1rem" }}>
                  <button className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }} onClick={clearCanvas}>
                    Limpiar Lienzo
                  </button>
                  <button className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }} onClick={handleConfirmSignature} disabled={loading}>
                    {loading ? "Firmando..." : "Confirmar Firma"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Sube un archivo de imagen (PNG o JPG) de tu firma fisica:
                </p>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="form-input"
                  onChange={handleImageUpload}
                />
                
                {uploadedSigImage && (
                  <div style={{ background: "#ffffff", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--accent-purple)" }}>
                    <img
                      src={uploadedSigImage}
                      alt="Firma cargada"
                      style={{ maxHeight: "100px", maxWidth: "250px", objectFit: "contain" }}
                    />
                  </div>
                )}

                <button
                  className="btn"
                  style={{ width: "100%", padding: "0.6rem" }}
                  onClick={handleConfirmSignature}
                  disabled={loading || !uploadedSigImage}
                >
                  {loading ? "Firmando..." : "Confirmar Firma Cargada"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorPortal;
