import React, { useState } from 'react';

export default function VerificacionPanel() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'scanning' | 'verified'

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('scanning');
      
      // Simulamos el proceso de análisis del árbol de Merkle y consulta al ledger distribuido
      setTimeout(() => {
        setStatus('verified');
      }, 2500);
    }
  };

  const resetPanel = () => {
    setFile(null);
    setStatus('idle');
  };

  return (
    <div style={styles.card}>
      <div style={styles.badgeNode}>ENTIDAD VERIFICADORA (NODO EXTERNO)</div>
      <h3 style={styles.title}>🔍 Verificación Pública de Autenticidad</h3>
      <p style={styles.desc}>
        Carga cualquier certificado emitido en formato PDF. El sistema extraerá su huella criptográfica localmente y auditará el estado de consenso en Ethereum de forma descentralizada[cite: 7, 110, 111, 112].
      </p>

      {status === 'idle' && (
        <div style={styles.dropZone}>
          <input type="file" accept=".pdf" onChange={handleFileChange} style={styles.fileInput} />
          <div style={styles.neonIcon}>📥</div>
          <p style={styles.dropText}>Arrastra el certificado PDF o <span style={{color: '#c084fc', textDecoration: 'underline'}}>explora archivos</span></p>
          <small style={styles.dropSubtext}>El documento no se subirá a ningún servidor centralizado (Privacidad Absoluta)[cite: 6].</small>
        </div>
      )}

      {status === 'scanning' && (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Calculando Hash SHA-256 e interrogando nodos de la red... [cite: 12, 31]</p>
          <code style={styles.pulseCode}>Leyendo bytes del documento...</code>
        </div>
      )}

      {status === 'verified' && (
        <div style={styles.animatedFadeIn}>
          <div style={styles.successCard}>
            <div style={styles.successHeader}>
              <span style={styles.checkCircle}>✓</span>
              <div>
                <h4 style={{ margin: 0, color: '#22c55e', fontSize: '16px' }}>CERTIFICADO AUTÉNTICO VERIFICADO [cite: 116]</h4>
                <small style={{ color: '#86efac' }}>Documento íntegro sin alteraciones detectadas[cite: 63, 64].</small>
              </div>
            </div>
            
            <div style={styles.divider}></div>

            <div style={styles.metadataGrid}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Código de Registro:</span>
                <span style={styles.metaValue}>BO-UMRPSFXCH-2026-9482 [cite: 106]</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Estudiante Titular:</span>
                <span style={styles.metaValue}>Juan Pérez Zambrana [cite: 55, 107]</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Fecha de Estampado:</span>
                <span style={styles.metaValue}>07 de Junio, 2026 - 19:42 (Hora local) [cite: 108]</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Estado en Ledger:</span>
                <span style={{...styles.metaValue, color: '#22c55e', fontWeight: 'bold'}}>INMUTABLE (Consenso PoS) [cite: 36, 37]</span>
              </div>
              <div style={styles.metaBlock}>
                <span style={styles.metaLabel}>Hash Criptográfico SHA-256 registrado[cite: 109]:</span>
                <code style={styles.blockchainCode}>4fa2c34a9f8231bbbc2310349fbcdef412837492baee102394c85112faee1c24</code>
              </div>
            </div>

            <button style={styles.btnReset} onClick={resetPanel}>Verificar otro documento</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#09090d', padding: '30px', borderRadius: '20px', border: '1px solid #1f1235', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' },
  badgeNode: { position: 'absolute', top: '15px', right: '15px', backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#c084fc', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' },
  title: { margin: '10px 0 8px 0', color: '#fff', fontSize: '22px', fontWeight: '700' },
  desc: { color: '#64748b', fontSize: '14px', marginBottom: '30px', lineHeight: '1.6' },
  dropZone: { border: '2px dashed #3b2263', padding: '40px 20px', borderRadius: '14px', textAlign: 'center', position: 'relative', backgroundColor: '#040406', cursor: 'pointer', transition: 'all 0.3s ease' },
  fileInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  neonIcon: { fontSize: '36px', marginBottom: '15px', filter: 'drop-shadow(0 0 10px #a855f7)' },
  dropText: { margin: '0 0 8px 0', color: '#cbd5e1', fontSize: '15px', fontWeight: '500' },
  dropSubtext: { color: '#475569', fontSize: '12px' },
  loaderContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' },
  spinner: { width: '40px', height: '40px', border: '4px solid #1e1b4b', borderTop: '4px solid #a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { color: '#cbd5e1', marginTop: '20px', fontSize: '14px', textAlign: 'center' },
  pulseCode: { color: '#a855f7', fontSize: '12px', fontFamily: 'monospace', opacity: 0.7 },
  animatedFadeIn: { animation: 'fadeIn 0.5s ease-out' },
  successCard: { backgroundColor: '#050507', border: '1px solid #14532d', borderRadius: '14px', padding: '20px' },
  successHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' },
  checkCircle: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  divider: { height: '1px', backgroundColor: '#14532d', margin: '15px 0' },
  metadataGrid: { display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' },
  metaRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #111827', paddingBottom: '8px' },
  metaLabel: { color: '#64748b' },
  metaValue: { color: '#e2e8f0', fontWeight: '500' },
  metaBlock: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' },
  blockchainCode: { backgroundColor: '#020204', color: '#38bdf8', padding: '10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #1e293b', display: 'block' },
  btnReset: { width: '100%', marginTop: '20px', padding: '12px', backgroundColor: '#1e1b4b', border: '1px solid #3b2263', color: '#c084fc', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: '0.2s' }
};