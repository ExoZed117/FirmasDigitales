import React, { useState } from 'react';

export default function EmisionPanel() {
  const [formData, setFormData] = useState({ code: '', student: '', degree: 'Sistemas' });
  const [fileAttached, setFileAttached] = useState(false);
  const [txState, setTxState] = useState('idle'); // 'idle' | 'signing' | 'success'

  const handlePublish = (e) => {
    e.preventDefault();
    if (!fileAttached) return alert("Adjunte el documento PDF oficial de respaldo[cite: 101].");
    
    setTxState('signing');
    setTimeout(() => {
      setTxState('success');
    }, 3000);
  };

  return (
    <div style={styles.card}>
      <div style={styles.badgeNode}>NODO INSTITUCIONAL AUTORIZADO [cite: 130]</div>
      <h3 style={styles.title}>🏛️ Registro e Inmutabilidad Académica</h3>
      <p style={styles.desc}>
        Interfaz de acuñación distribuida. Al enviar el formulario, se generará la firma privada de la universidad y se propagará el hash al bloque en desarrollo[cite: 67, 90, 103].
      </p>

      {txState !== 'success' ? (
        <form onSubmit={handlePublish} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>CÓDIGO ÚNICO DE CERTIFICADO [cite: 106]</label>
            <input 
              style={styles.input} 
              type="text" 
              placeholder="Ej: UMRPSFXCH-DIPLOMA-5421" 
              value={formData.code} 
              onChange={e => setFormData({...formData, code: e.target.value})}
              required 
              disabled={txState === 'signing'}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>ESTUDIANTE POSTULANTE [cite: 107]</label>
            <input 
              style={styles.input} 
              type="text" 
              placeholder="Nombre completo del egresado" 
              value={formData.student} 
              onChange={e => setFormData({...formData, student: e.target.value})}
              required 
              disabled={txState === 'signing'}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>DOCUMENTO ACADÉMICO FUENTE (PDF) [cite: 101]</label>
            <div style={{...styles.fileDrop, borderColor: fileAttached ? '#22c55e' : '#3b2263'}}>
              <input type="file" accept=".pdf" onChange={() => setFileAttached(true)} style={styles.fileInput} disabled={txState === 'signing'} />
              <span style={{ fontSize: '20px' }}>{fileAttached ? '✅ Documento Vinculado Correctamente' : '📂 Cargar PDF Oficial'}</span>
            </div>
          </div>

          <div style={styles.gasEstimationBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
              <span>Costo Estimado de Gas Red (Ethereum PoS):</span>
              <span style={{ color: '#a855f7', fontFamily: 'monospace' }}>0.0042 ETH (~$11.50) [cite: 36, 140]</span>
            </div>
          </div>

          <button type="submit" style={styles.btnPublish} disabled={txState === 'signing'}>
            {txState === 'signing' ? 'Esperando firma en MetaMask... 🦊' : 'Firmar y Transmitir Transacción [cite: 67, 103]'}
          </button>
        </form>
      ) : (
        <div style={styles.successScreen}>
          <div style={styles.successIcon}>🚀</div>
          <h4 style={{ margin: '10px 0', color: '#c084fc', fontSize: '18px' }}>¡Transmisión Exitosa a Ethereum! [cite: 90]</h4>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px 0', textAlign: 'center' }}>
            El hash del certificado ha sido registrado y replicado en todos los nodos validadores de la red[cite: 31, 33].
          </p>
          <div style={styles.receiptBox}>
            <p style={{margin: '0 0 6px 0', fontSize: '12px'}}><strong>Tx Hash:</strong> <span style={{color: '#38bdf8', fontFamily: 'monospace'}}>0x7d94...e321</span></p>
            <p style={{margin: 0, fontSize: '12px'}}><strong>Estado:</strong> <span style={{color: '#22c55e'}}>Bloque Confirmado (12 Validaciones) [cite: 35]</span></p>
          </div>
          <button style={styles.btnNew} onClick={() => { setTxState('idle'); setFileAttached(false); setFormData({code:'', student:'', degree:'Sistemas'}); }}>
            Registrar nueva emisión
          </button>
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
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', color: '#a855f7', fontWeight: '600', letterSpacing: '0.5px' },
  input: { padding: '12px 14px', backgroundColor: '#040406', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none', transition: '0.3s' },
  fileDrop: { border: '1px dashed #3b2263', padding: '16px', borderRadius: '8px', textAlign: 'center', backgroundColor: '#040406', position: 'relative', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' },
  fileInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  gasEstimationBox: { backgroundColor: '#050507', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' },
  btnPublish: { padding: '14px', backgroundColor: '#a855f7', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)' },
  successScreen: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' },
  successIcon: { fontSize: '48px', filter: 'drop-shadow(0 0 15px #a855f7)' },
  receiptBox: { width: '100%', backgroundColor: '#040406', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b', boxSizing: 'border-box' },
  btnNew: { width: '100%', marginTop: '20px', padding: '12px', backgroundColor: '#1e1b4b', border: '1px solid #3b2263', color: '#c084fc', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }
};