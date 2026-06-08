import React, { useState, useEffect } from "react";
import { useWeb3 } from "../context/Web3Context";

interface CollaboratorInput {
  name: string;
  email: string;
  phone: string;
  posX: number; // Simulated posX (0 - 370)
  posY: number; // Simulated posY (0 - 645)
  page: number;
}

interface DocumentData {
  id: string;
  codigo: string;
  estudiante: string;
  status: "pending" | "ready_for_blockchain" | "registered" | "revoked";
  originalPath: string | null;
  officializedPath: string | null;
  certificatePath: string | null;
  hashDocumento: string | null;
  fechaSubida: string;
  fechaEnvioSolicitud: string | null;
  fechaRegistroBlockchain: string | null;
  motivoRevocacion: string | null;
  estudianteWallet: string | null;
  recepcionConfirmada: boolean;
  fechaRecepcion: string | null;
  collaborators: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    token: string;
    signed: boolean;
    signedAt: string | null;
    posX: number;
    posY: number;
    page: number;
  }>;
  auditLogs: Array<{
    action: string;
    details: string;
    timestamp: string;
  }>;
}

interface EmisorRecord {
  address: string;
  cargo: string;
}

export const AdminPortal: React.FC = () => {
  const { contract, isConnected, isOwner, connectWallet } = useWeb3();
  
  // Navigation State
  const [activeSidebarTab, setActiveSidebarTab] = useState<"crear" | "historial" | "blockchain">("crear");

  // Wizard Step for creation: Step 1 (setup) or Step 2 (review & position)
  const [creationStep, setCreationStep] = useState<1 | 2>(1);

  // Document State
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [codigo, setCodigo] = useState("");
  const [estudiante, setEstudiante] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  
  // Verification Options
  const [optVerification, setOptVerification] = useState(false);
  const [facialVerification, setFacialVerification] = useState(false);
  const [signatureVerification, setSignatureVerification] = useState(true);

  // Initial positions for collaborators
  const [collaborators, setCollaborators] = useState<CollaboratorInput[]>([
    { name: "", email: "", phone: "", posX: 50, posY: 580, page: 1 },
  ]);

  // Dragging State for interactive signature canvas
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boxStart, setBoxStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Emisor Role Manager States
  const [emisorAddress, setEmisorAddress] = useState("");
  const [emisorCargo, setEmisorCargo] = useState("Rector");
  const [activeEmisores, setActiveEmisores] = useState<EmisorRecord[]>([]);

  // Selected document for audit logs modal
  const [selectedDocLogs, setSelectedDocLogs] = useState<DocumentData | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (contract) {
      fetchEmisores();
    }
  }, [contract]);

  // Global mouse listeners for dragging signature boxes
  useEffect(() => {
    if (draggingIndex === null) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      let newX = boxStart.x + dx;
      let newY = boxStart.y + dy;
      
      // Page bounds: Width = 500, BoxWidth = 130 -> MaxX = 370
      if (newX < 0) newX = 0;
      if (newX > 370) newX = 370;
      
      // Page bounds: Height = 700, BoxHeight = 55 -> MaxY = 645
      if (newY < 0) newY = 0;
      if (newY > 645) newY = 645;

      const updated = [...collaborators];
      updated[draggingIndex] = {
        ...updated[draggingIndex],
        posX: newX,
        posY: newY,
      };
      setCollaborators(updated);
    };

    const handleGlobalMouseUp = () => {
      setDraggingIndex(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggingIndex, dragStart, boxStart, collaborators]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/documents/admin");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err: any) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmisores = async () => {
    if (!contract) return;
    try {
      const filter = contract.filters.EmisorAgregado();
      const events = await contract.queryFilter(filter);

      const list: EmisorRecord[] = [];
      const checkedAddrs = new Set<string>();

      for (let i = events.length - 1; i >= 0; i--) {
        const addr = (events[i] as any).args.emisor;
        if (checkedAddrs.has(addr)) continue;
        checkedAddrs.add(addr);

        const activeCargo = await contract.emisoresAutorizados(addr);
        if (activeCargo && activeCargo.length > 0) {
          list.push({ address: addr, cargo: activeCargo });
        }
      }
      setActiveEmisores(list);
    } catch (err) {
      console.error("Error fetching authorized emisores:", err);
    }
  };

  const handleAddCollaborator = () => {
    const count = collaborators.length;
    const defaultX = 50 + (count % 3) * 135;
    const defaultY = 580 - Math.floor(count / 3) * 60;
    
    setCollaborators([
      ...collaborators,
      { 
        name: "", 
        email: "", 
        phone: "", 
        posX: Math.max(0, Math.min(370, defaultX)), 
        posY: Math.max(0, Math.min(645, defaultY)), 
        page: 1 
      },
    ]);
  };

  const handleRemoveCollaborator = (index: number) => {
    const updated = [...collaborators];
    updated.splice(index, 1);
    setCollaborators(updated);
  };

  const handleCollaboratorChange = (index: number, field: keyof CollaboratorInput, value: any) => {
    const updated = [...collaborators];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCollaborators(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileWarning(null);
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      
      // Automatic data extraction from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      
      // Clean filename to extract student name (spaces instead of dashes/underscores, capitalize)
      const cleanStudent = nameWithoutExt
        .replace(/[_-]/g, " ")
        .replace(/certificado|academic[o|a]/gi, "")
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

      setEstudiante(cleanStudent || "Graduado Asignado");
      setCodigo(`CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
        setFileWarning(
          "Has seleccionado un documento Word (.docx/.doc). " +
          "Para registrar firmas y asegurar la inmutabilidad, el sistema convertirá automáticamente " +
          "este documento a formato PDF al guardarlo."
        );
      }
    }
  };

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pdfFile) {
      setError("Por favor seleccione un archivo de certificado.");
      return;
    }

    if (collaborators.length === 0) {
      setError("Debe agregar al menos un validador.");
      return;
    }

    for (let i = 0; i < collaborators.length; i++) {
      const col = collaborators[i];
      if (!col.name.trim() || !col.email.trim()) {
        setError(`Por favor complete el nombre y correo del validador #${i + 1}.`);
        return;
      }
    }

    setCreationStep(2);
  };

  const startDrag = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
    setDragStart({ x: e.clientX, y: e.clientY });
    setBoxStart({ x: collaborators[index].posX, y: collaborators[index].posY });
  };

  const handleCreateDocument = async () => {
    if (!pdfFile || !codigo || !estudiante) {
      setError("Faltan datos del certificado.");
      return;
    }

    setSubmitLoading(true);
    setError(null);

    // Convert simulated coordinates (500x700 screen) to standard PDF coordinates (612x792)
    const convertedCollaborators = collaborators.map((col) => {
      const posX_pdf = Math.round((col.posX / 500) * 612);
      const posY_pdf = Math.round(((700 - col.posY - 55) / 700) * 792);
      return {
        ...col,
        posX: posX_pdf,
        posY: posY_pdf,
      };
    });

    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("codigo", codigo);
    formData.append("estudiante", estudiante);
    formData.append("estudianteWallet", "0x0000000000000000000000000000000000000000");
    formData.append("collaboratorsJson", JSON.stringify(convertedCollaborators));

    try {
      const res = await fetch("http://localhost:3001/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Error al crear el documento");
      }

      setCodigo("");
      setEstudiante("");
      setPdfFile(null);
      setFileWarning(null);
      setOptVerification(false);
      setFacialVerification(false);
      setSignatureVerification(true);
      setCollaborators([{ name: "", email: "", phone: "", posX: 50, posY: 580, page: 1 }]);
      setCreationStep(1);

      await fetchDocuments();
      setActiveSidebarTab("historial");
      alert("Documento subido e invitaciones de firmas creadas correctamente.");
    } catch (err: any) {
      setError(err.message || "Error al enviar el formulario.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Add Authorized Emisor in blockchain
  const handleAddEmisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    if (!emisorAddress || !emisorCargo) {
      alert("Direccion y cargo son requeridos.");
      return;
    }

    try {
      setSubmitLoading(true);
      setError(null);
      const tx = await contract.agregarEmisor(emisorAddress, emisorCargo);
      await tx.wait();
      setEmisorAddress("");
      await fetchEmisores();
      alert("Emisor autorizado en Blockchain exitosamente.");
    } catch (err: any) {
      setError(err.reason || err.message || "Error al registrar emisor.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRemoveEmisor = async (addr: string) => {
    if (!contract) return;
    try {
      setSubmitLoading(true);
      setError(null);
      const tx = await contract.removerEmisor(addr);
      await tx.wait();
      await fetchEmisores();
      alert("Autorizacion de emisor revocada exitosamente.");
    } catch (err: any) {
      setError(err.reason || err.message || "Error al revocar emisor.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Register finalized document in Blockchain (Backend-triggered)
  const handleRegisterBlockchain = async (doc: DocumentData) => {
    if (!doc.hashDocumento) {
      alert("Falta el hash del documento.");
      return;
    }

    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/api/documents/register/${doc.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "No se pudo registrar en la Blockchain.");
      }

      await fetchDocuments();
      alert("Certificado registrado en Blockchain de forma exitosa");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al registrar en Blockchain");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Revoke certificate (Backend-triggered)
  const handleRevokeCertificate = async (doc: DocumentData) => {
    if (!doc.hashDocumento) return;

    const motivo = prompt("Por favor, ingrese el motivo de la revocacion:");
    if (!motivo) return;

    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/api/documents/revoke/${doc.hashDocumento}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "No se pudo revocar el certificado.");
      }

      await fetchDocuments();
      alert("Certificado revocado exitosamente.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al revocar el certificado");
    } finally {
      setSubmitLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Enlace copiado al portapapeles");
  };

  return (
    <div className="admin-portal">
      {/* Title Card (AdminLTE style, no emojis) */}
      <div className="glass-card animate-slide-up" style={{ padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
        <h2 className="header-logo" style={{ display: "inline-block", fontSize: "1.85rem" }}>
          Panel de Administracion Universitaria
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginTop: "0.25rem" }}>
          Carga de documentos, asignacion de firmas y emision inalterable en Blockchain.
        </p>
      </div>

      {error && (
        <div className="status-alert danger animate-slide-up">
          <span>[Error] </span>
          <div>{error}</div>
        </div>
      )}

      {/* Main Sidebar Layout */}
      <div className="sidebar-layout">
        {/* Sidebar */}
        <aside className="sidebar animate-slide-up">
          <button
            className={`sidebar-tab ${activeSidebarTab === "crear" ? "active" : ""}`}
            onClick={() => { setActiveSidebarTab("crear"); setError(null); }}
          >
            Crear Certificados
          </button>
          
          <button
            className={`sidebar-tab ${activeSidebarTab === "historial" ? "active" : ""}`}
            onClick={() => { setActiveSidebarTab("historial"); setError(null); }}
          >
            Ver Historial
          </button>
          
          <button
            className={`sidebar-tab ${activeSidebarTab === "blockchain" ? "active" : ""}`}
            onClick={() => { setActiveSidebarTab("blockchain"); setError(null); }}
          >
            Configuracion Blockchain
          </button>

          {/* Simple status stats */}
          <div style={{ marginTop: "auto", padding: "1rem", fontSize: "0.8rem", color: "var(--sidebar-text)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span>Total Documentos:</span>
              <strong style={{ color: "#ffffff" }}>{documents.length}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Emitidos Blockchain:</span>
              <strong style={{ color: "var(--success)" }}>
                {documents.filter((d) => d.status === "registered").length}
              </strong>
            </div>
          </div>
        </aside>

        {/* Sidebar Content Area */}
        <main className="sidebar-content transition-grid">
          
          {/* TAB 1: CREAR CERTIFICADOS */}
          <div className={`transition-panel ${activeSidebarTab === "crear" ? "active" : ""}`}>
            <div className="transition-grid">
              
              {/* STEP 1: SETUP FORM */}
              <form 
                onSubmit={handleGoToStep2}
                className={`transition-panel ${creationStep === 1 ? "active" : ""}`}
              >
                  <div className="grid-2" style={{ alignItems: "start" }}>
                    
                    {/* File Upload and Verification Options */}
                    <div className="glass-card">
                      <h3 className="card-title">Cargar Certificado</h3>
                      
                      <div className="form-group">
                        <label className="form-label">Archivo de Certificado (PDF o Word) *</label>
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc"
                          className="form-input"
                          onChange={handleFileChange}
                          required
                        />
                        {fileWarning && (
                          <div className="status-alert warning mt-1" style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", margin: "0.5rem 0 0 0" }}>
                            <span>[Aviso] </span>
                            <div>{fileWarning}</div>
                          </div>
                        )}
                        {pdfFile && (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            Estudiante detectado: <strong style={{ color: "var(--text-primary)" }}>{estudiante}</strong> <br />
                            Codigo generado: <strong style={{ color: "var(--text-primary)" }}>{codigo}</strong>
                          </div>
                        )}
                      </div>

                      {/* Verification Options Section */}
                      <div style={{
                        padding: "1rem",
                        background: "rgba(0,0,0,0.02)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "4px",
                        marginTop: "1.5rem"
                      }}>
                        <label className="form-label" style={{ marginBottom: "0.5rem" }}>Opciones de tipo de verificacion</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={optVerification}
                              onChange={(e) => setOptVerification(e.target.checked)}
                            />
                            Codigo OTP (SMS o Email)
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={facialVerification}
                              onChange={(e) => setFacialVerification(e.target.checked)}
                            />
                            Reconocimiento Facial
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={signatureVerification}
                              onChange={(e) => setSignatureVerification(e.target.checked)}
                            />
                            Firmar Certificado
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Collaborators Form */}
                    <div className="glass-card">
                      <h3 className="card-title">Anadir Validadores</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                        Configure las personas autorizadas que deberan revisar y firmar el documento.
                      </p>

                      {collaborators.map((col, index) => (
                        <div key={index} className="collab-item-card" style={{ borderRadius: "4px" }}>
                          <div className="collab-flex-header">
                            <strong>Validador #{index + 1}</strong>
                            {collaborators.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
                                onClick={() => handleRemoveCollaborator(index)}
                              >
                                Remover
                              </button>
                            )}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Nombre *</label>
                              <input
                                type="text"
                                className="form-input"
                                value={col.name}
                                onChange={(e) => handleCollaboratorChange(index, "name", e.target.value)}
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label">Email *</label>
                              <input
                                type="email"
                                className="form-input"
                                value={col.email}
                                onChange={(e) => handleCollaboratorChange(index, "email", e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                            <label className="form-label">Telefono (Opcional)</label>
                            <input
                              type="text"
                              className="form-input"
                              value={col.phone}
                              onChange={(e) => handleCollaboratorChange(index, "phone", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-secondary mb-3"
                        onClick={handleAddCollaborator}
                        style={{ width: "100%", padding: "0.6rem" }}
                      >
                        + Agregar Otro Validador
                      </button>

                      <button type="submit" className="btn" style={{ width: "100%", padding: "0.75rem" }}>
                        Siguiente
                      </button>
                    </div>

                  </div>
                </form>
                
                {/* STEP 2: REVIEW & POSITION SIGNATURES */}
                <div className={`transition-panel ${creationStep === 2 ? "active" : ""}`}>
                  <div className="grid-2" style={{ alignItems: "start" }}>
                  
                  {/* Left Side: Summary Review Card and Action Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div className="glass-card">
                      <h3 className="card-title">Revision Rapida</h3>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.9rem" }}>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8rem" }}>Archivo cargado:</span>
                          <strong style={{ color: "var(--text-primary)" }}>{pdfFile?.name}</strong>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8rem" }}>Estudiante:</span>
                            <strong style={{ color: "var(--text-primary)" }}>{estudiante}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8rem" }}>Codigo:</span>
                            <strong style={{ color: "var(--text-primary)" }}>{codigo}</strong>
                          </div>
                        </div>

                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8rem" }}>Tipos de verificacion:</span>
                          <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
                            {[
                              optVerification && "OTP",
                              facialVerification && "Facial",
                              signatureVerification && "Firma"
                            ].filter(Boolean).join(", ") || "Ninguna"}
                          </span>
                        </div>

                        <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "0.85rem" }}>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8rem" }}>Validadores asignados:</span>
                          <ol style={{ paddingLeft: "1.2rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
                            {collaborators.map((c, i) => (
                              <li key={i}>
                                {c.name} ({c.email})
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => setCreationStep(1)}
                        >
                          Atras
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ flex: 2 }}
                          onClick={handleCreateDocument}
                          disabled={submitLoading}
                        >
                          {submitLoading ? "Subiendo..." : "Subir y Enviar Invitaciones"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Draggable Coordinates Canvas Mockup */}
                  <div className="glass-card text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <h3 className="card-title" style={{ width: "100%", justifyContent: "center" }}>
                      Posicionador de Firmas
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                      Arrastre los cuadros morados a la posicion exacta donde cada validador estampara su firma.
                    </p>

                    <div className="canvas-interactive-container">
                      <div className="pdf-mockup-page">
                        <div className="pdf-mockup-watermark" style={{ color: "rgba(0,0,0,0.03)" }}>Vista Previa</div>
                        
                        {/* Draggable boxes representing collaborators signatures */}
                        {collaborators.map((col, index) => (
                          <div
                            key={index}
                            className={`sig-drag-box ${draggingIndex === index ? "active" : ""}`}
                            style={{
                              left: `${col.posX}px`,
                              top: `${col.posY}px`,
                            }}
                            onMouseDown={(e) => startDrag(index, e)}
                          >
                            <div className="sig-drag-title">{col.name || `Validador #${index + 1}`}</div>
                            <div className="sig-drag-subtitle">{col.email || "Sin correo"}</div>
                            <div className="sig-drag-badge">Firma</div>
                          </div>
                        ))}

                        {/* Faux Certificate Visuals */}
                        <div className="pdf-mockup-content">
                          <div className="pdf-mockup-header">
                            <div className="pdf-mockup-logo" style={{ color: "var(--accent-purple)" }}>CERTIFICADO ACADEMICO</div>
                            <div className="pdf-mockup-subtitle">SISTEMA DISTRIBUIDO BLOCKCHAIN</div>
                          </div>

                          <div className="pdf-mockup-body">
                            <div style={{ fontSize: "0.65rem", color: "#888", letterSpacing: "1px" }}>SE CERTIFICA QUE EL ESTUDIANTE</div>
                            <div className="pdf-mockup-title" style={{ fontSize: "1.25rem", margin: "0.2rem 0" }}>
                              {estudiante || "[Nombre del Estudiante]"}
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
                              Codigo: {codigo || "CERT-XXXX-XXXX"} <br />
                              Red: Ethereum Local
                            </div>
                          </div>

                          <div className="pdf-mockup-footer">
                            <div className="pdf-mockup-meta">
                              <span>Fecha: {new Date().toLocaleDateString()}</span>
                            </div>
                            <div style={{ fontSize: "0.6rem", color: "#aaa" }}>
                              Zona de firmas
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Los cuadros muestran la posicion en la pagina correspondientes a la configuracion.
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* TAB 2: HISTORIAL Y SEGUIMIENTO */}
          <div className={`transition-panel ${activeSidebarTab === "historial" ? "active" : ""}`}>
            <div className="glass-card">
              <h3 className="card-title">Historial y Seguimiento de Certificados</h3>
              
              {loading ? (
                <p>Cargando documentos registrados...</p>
              ) : documents.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No hay documentos registrados actualmente.</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Codigo / Estado</th>
                        <th>Estado de Firmas Colaboradores</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => {
                        const signedCount = doc.collaborators.filter((c) => c.signed).length;
                        const totalCount = doc.collaborators.length;

                        return (
                          <tr key={doc.id}>
                            <td>
                              <strong style={{ color: "var(--text-primary)" }}>{doc.estudiante}</strong>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                                Wallet: {doc.estudianteWallet && doc.estudianteWallet !== "0x0000000000000000000000000000000000000000" ? doc.estudianteWallet : "No asignada"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                                Carga: {new Date(doc.fechaSubida).toLocaleString()}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>{doc.codigo}</span>
                              <div className="mt-1">
                                <span
                                  className={`badge badge-${
                                    doc.status === "pending"
                                      ? "pending"
                                      : doc.status === "ready_for_blockchain"
                                      ? "ready"
                                      : doc.status === "registered"
                                      ? "registered"
                                      : "revoked"
                                  }`}
                                >
                                  {doc.status === "pending"
                                    ? "Pendiente de Firmas"
                                    : doc.status === "ready_for_blockchain"
                                    ? "Listo para Blockchain"
                                    : doc.status === "registered"
                                    ? "Registrado en Blockchain"
                                    : "Revocado"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                                  {signedCount} de {totalCount} colaboradores firmaron
                                </span>
                                {doc.collaborators.map((c) => (
                                  <div key={c.id} style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.75rem" }}>
                                    <span>{c.signed ? "[Firmado]" : "[Pendiente]"}</span>
                                    <span style={{ color: c.signed ? "var(--success)" : "var(--text-muted)" }}>
                                      {c.name} {c.signed && c.signedAt ? `(${new Date(c.signedAt).toLocaleDateString()})` : ""}
                                    </span>
                                    {!c.signed && (
                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: "0.1rem 0.4rem", fontSize: "0.62rem", borderRadius: "4px" }}
                                        onClick={() => copyToClipboard(`http://localhost:5173/?token=${c.token}`)}
                                        title="Copiar link de firma para enviar a este colaborador"
                                      >
                                        Enlace de Firma
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.4rem", flexDirection: "column" }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
                                  onClick={() => setSelectedDocLogs(doc)}
                                >
                                  Auditoria / Logs
                                </button>

                                {doc.status === "ready_for_blockchain" && (
                                  <button
                                    className="btn"
                                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
                                    onClick={() => handleRegisterBlockchain(doc)}
                                  >
                                    Emitir Blockchain
                                  </button>
                                )}

                                {doc.status === "registered" && (
                                  <>
                                    <a
                                      href={`http://localhost:3001/${doc.officializedPath}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-secondary"
                                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem", textAlign: "center" }}
                                    >
                                      PDF Oficial
                                    </a>
                                    <a
                                      href={`http://localhost:3001/${doc.certificatePath}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-secondary"
                                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem", textAlign: "center" }}
                                    >
                                      Certificado PDF
                                    </a>
                                    <button
                                      className="btn btn-danger"
                                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
                                      onClick={() => handleRevokeCertificate(doc)}
                                    >
                                      Revocar
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* TAB 3: CONFIGURACION SMART CONTRACT */}
          <div className={`transition-panel ${activeSidebarTab === "blockchain" ? "active" : ""}`}>
            <div className="glass-card">
              <h3 className="card-title">Configuracion de Smart Contract y Roles</h3>
              <p className="mb-3" style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                Esta seccion esta reservada exclusivamente para el Propietario (Rector/Universidad) del Smart Contract de Ethereum.
                Requiere conectar una billetera MetaMask para enviar transacciones directamente a la Blockchain que configuren que cuentas estan autorizadas como Emisores Academicos.
              </p>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                {!isConnected ? (
                  <div className="status-alert warning justify-center" style={{ display: "inline-flex" }}>
                    <span>Conecta MetaMask para administrar emisores</span>
                    <button className="connect-btn ml-1" onClick={connectWallet}>
                      Conectar Wallet
                    </button>
                  </div>
                ) : isOwner ? (
                  <div className="status-alert success justify-center" style={{ display: "inline-flex" }}>
                    <span>Autorizado como Propietario (Owner) del Smart Contract</span>
                  </div>
                ) : (
                  <div className="status-alert success justify-center" style={{ display: "inline-flex", background: "rgba(111, 66, 193, 0.1)", color: "var(--accent-purple)", border: "1px solid var(--accent-purple)" }}>
                    <span>Conectado con Cuenta de Emisor Autorizado</span>
                  </div>
                )}
              </div>

              {isConnected && isOwner ? (
                <div className="grid-2" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem" }}>
                  <form onSubmit={handleAddEmisor}>
                    <h4 className="mb-2" style={{ color: "var(--accent-purple)", fontSize: "1.05rem" }}>Autorizar Nuevo Emisor:</h4>
                    <div className="form-group">
                      <label className="form-label">Direccion Ethereum del Emisor (Billetera) *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="0x..."
                        value={emisorAddress}
                        onChange={(e) => setEmisorAddress(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cargo Academico *</label>
                      <select
                        className="form-input"
                        value={emisorCargo}
                        onChange={(e) => setEmisorCargo(e.target.value)}
                        required
                      >
                        <option value="Rector">Rector</option>
                        <option value="Secretario Académico">Secretario Académico</option>
                        <option value="Director de Carrera">Director de Carrera</option>
                        <option value="Decano de Facultad">Decano de Facultad</option>
                      </select>
                    </div>

                    <button type="submit" className="btn" style={{ width: "100%" }} disabled={submitLoading}>
                      {submitLoading ? "Transaccionando..." : "Autorizar Cargo en Blockchain"}
                    </button>
                  </form>

                  <div>
                    <h4 className="mb-2" style={{ color: "var(--accent-purple)", fontSize: "1.05rem" }}>
                      Emisores Autorizados en Blockchain:
                    </h4>
                    {activeEmisores.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        No hay emisores adicionales registrados en el Smart Contract.
                      </p>
                    ) : (
                      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {activeEmisores.map((em, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.6rem 1rem",
                              background: "rgba(0,0,0,0.02)",
                              border: "1px solid var(--glass-border)",
                              borderRadius: "4px",
                              fontSize: "0.85rem",
                            }}
                          >
                            <div>
                              <strong>{em.cargo}</strong> <br />
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{em.address}</span>
                            </div>
                            <button
                              className="btn btn-danger"
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}
                              onClick={() => handleRemoveEmisor(em.address)}
                            >
                              Revocar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center" style={{ padding: "1.5rem", background: "rgba(0,0,0,0.01)", borderRadius: "4px", border: "1px dashed var(--glass-border)" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {!isConnected 
                      ? "Por favor, conecta tu wallet MetaMask para ver y configurar los emisores autorizados." 
                      : "La billetera conectada no es la propietaria del Smart Contract. Solo el Rector/Propietario original puede modificar los emisores autorizados."
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>

      {/* Audit Logs Modal */}
      {selectedDocLogs && (
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
          onClick={() => setSelectedDocLogs(null)}
        >
          <div
            className="glass-card animate-slide-up"
            style={{ maxWidth: "600px", width: "90%", maxHeight: "80%", overflowY: "auto", borderRadius: "4px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="card-title justify-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Historial de Auditoria: {selectedDocLogs.codigo}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                onClick={() => setSelectedDocLogs(null)}
              >
                Cerrar
              </button>
            </h3>

            <div style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
              <p className="mb-1"><strong>Estudiante:</strong> {selectedDocLogs.estudiante}</p>
              <p className="mb-1">
                <strong>Billetera Estudiante:</strong> {selectedDocLogs.estudianteWallet && selectedDocLogs.estudianteWallet !== "0x0000000000000000000000000000000000000000" ? selectedDocLogs.estudianteWallet : "No asignada"}
              </p>
              <p className="mb-1"><strong>Estado Actual:</strong> <span style={{ color: "var(--accent-purple)", fontWeight: "bold" }}>{selectedDocLogs.status.toUpperCase()}</span></p>
              {selectedDocLogs.hashDocumento && (
                <p className="mb-1" style={{ fontSize: "0.82rem", wordBreak: "break-all" }}>
                  <strong>Hash Documento (SHA-256):</strong> <code>{selectedDocLogs.hashDocumento}</code>
                </p>
              )}
            </div>

            <h4 className="mb-2" style={{ color: "var(--accent-purple)" }}>Linea de Tiempo de Cambios:</h4>
            <ul className="audit-list">
              {selectedDocLogs.auditLogs && selectedDocLogs.auditLogs.length > 0 ? (
                selectedDocLogs.auditLogs.map((log, index) => (
                  <li key={index} className="audit-item" style={{ borderLeftColor: "var(--accent-purple)" }}>
                    <div style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="audit-action" style={{ color: "var(--text-primary)" }}>{log.action}</span>
                        <span className="audit-time">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="mt-1" style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {log.details}
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No hay registros de auditoria disponibles.</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
