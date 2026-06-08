import React, { useState } from 'react';

export default function RecepcionPanel() {
  const [signed, setSigned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSignReceipt = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSigned(true);
    }, 2500);
  };

  return (
    <div style={styles.card}>
      <div style={styles.badgeNode}>NODO ESTUDIANTE (RECEPTOR) [cite: 68, 96]</div>
      <h3 style={styles.title}>🎓 Bandeja de Certificaciones Recibidas</h3>
      <p style={styles.desc}>
        Cada vez que la universidad emite un certificado a tu nombre, debes estampar tu firma digital privada de conformidad para consolidar el proceso legal distribuido[cite: 68, 69, 70].
      </p>

      <div style={{...styles.documentTicket, borderColor: signed ? '#22c55e' : '#b45309'}}>
        <div style={styles.ticketHeader}>
          <span style={styles.docType}>DIPLOMA ACADÉMICO</span>
          <span style={{...styles.badgeStatus, backgroundColor: signed ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: signed ? '#22c55e' : '#f59e0b'}}>
            {signed ? 'CONCLUIDO' : 'PENDIENTE DE TU FIRMA [cite: 69]'}
          </span>
        </div>
        
        <h4 style={styles.docTitle}>Ingeniería en Sistemas Informáticos</h4>
        <small style={{ color: '#475569' }}>Expedido por: Universidad San Francisco Xavier [cite: 3]</small>
        
        <div style={styles.ticketDivider}></div>
        
        <p style={styles.docLabel}><strong>Vínculo Criptográfico:</strong></p>
        <code style={styles.ticketCode}>SHA256: 4fa2c34a9f8231bbbc2310349fbcdef412837492b... [cite: 56]</code>
      </div>

      {!signed ? (
        <button 
          style={{...styles.btnSign, opacity: processing ? 0.7 : 1}} 
          onClick={handleSignReceipt}
          disabled={processing}
        >
          {processing ? 'Generando Firma Asimétrica... 🔐' : 'Estampar Firma Digital de Aceptación [cite: 13, 69]'}
        </button>
      ) : (
        <div style={styles.successSignBox}>
          <span style={{ fontSize: '18px' }}>🔒 No Repudio Garantizado</span>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#86efac' }}>
            Tu firma digital ha sido incrustada en la Blockchain de manera irreversible[cite: 38, 65].
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#09090d', padding: '30px', borderRadius: '20px', border: '1px solid #1f1235', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative' },
  badgeNode: { position: 'absolute', top: '15px', right: '15px', backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#c084fc', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' },
  title: { margin: '10px 0 8px 0', color: '#fff', fontSize: '22px', fontWeight: '700' },
  desc: { color: '#64748b', fontSize: '14px', marginBottom: '25px', lineHeight: '1.6' },
  documentTicket: { backgroundColor: '#040406', padding: '20px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '25px' },
  ticketHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  docType: { fontSize: '11px', color: '#a855f7', fontWeight: 'bold', letterSpacing: '1px' },
  badgeStatus: { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
  docTitle: { margin: '8px 0 2px 0', color: '#e2e8f0', fontSize: '16px', fontWeight: '600' },
  ticketDivider: { height: '1px', backgroundColor: '#1e293b', margin: '10px 0' },
  docLabel: { margin: 0, fontSize: '12px', color: '#64748b' },
  ticketCode: { fontFamily: 'monospace', color: '#38bdf8', fontSize: '12px', display: 'block', backgroundColor: '#020203', padding: '6px 10px', borderRadius: '4px', wordBreak: 'break-all' },
  btnSign: { width: '100%', padding: '14px', backgroundColor: '#22c55e', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.2)' },
  successSignBox: { backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid #22c55e', color: '#22c55e', padding: '15px', borderRadius: '8px', textAlign: 'center', fontWeight: '500' }
};