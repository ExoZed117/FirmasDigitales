import React, { useState } from 'react';
import VerificacionPanel from './components/VerificacionPanel.jsx';
import EmisionPanel from './components/EmisionPanel.jsx';
import RecepcionPanel from './components/RecepcionPanel.jsx';

function App() {
  const [wallet, setWallet] = useState({ connected: false, address: '' });
  const [activeTab, setActiveTab] = useState('verificar');

  const triggerConnection = () => {
    if (wallet.connected) {
      setWallet({ connected: false, address: '' });
    } else {
      setWallet({ connected: true, address: '0x71C23a419f8231bbbc2310349fbcdef412837492' });
    }
  };

  return (
    <div style={styles.container}>
      {/* Barra de Navegación Profesional Estilo Web3 */}
      <header style={styles.navbar}>
        <div style={styles.brandContainer}>
          <div style={styles.neonCube}>⬢</div>
          <div>
            <h1 style={styles.brandName}>BoliviaAcadChain</h1>
            <span style={styles.networkStatus}>RED PRINCIPAL SIMULADA • CAPA 2 ETHEREUM [cite: 7]</span>
          </div>
        </div>

        <button 
          style={{ 
            ...styles.walletButton, 
            backgroundColor: wallet.connected ? 'rgba(34, 197, 94, 0.05)' : '#a855f7',
            borderColor: wallet.connected ? '#22c55e' : 'transparent',
            color: wallet.connected ? '#22c55e' : '#fff'
          }}
          onClick={triggerConnection}
        >
          {wallet.connected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.dotPulse}>●</span> {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
            </span>
          ) : (
            '🔑 Inicializar Firma / Wallet '
          )}
        </button>
      </header>

      {/* Navegación por Roles de los Sistemas Distribuidos */}
      <div style={styles.tabWrapper}>
        <div style={styles.tabNav}>
          <button style={{...styles.tabLink, ...(activeTab === 'verificar' ? styles.tabActive : {})}} onClick={() => setActiveTab('verificar')}>
            🔍 Verificador Externo 
          </button>
          <button style={{...styles.tabLink, ...(activeTab === 'emitir' ? styles.tabActive : {})}} onClick={() => setActiveTab('emitir')}>
            🏛️ Universidad Emisora 
          </button>
          <button style={{...styles.tabLink, ...(activeTab === 'recibir' ? styles.tabActive : {})}} onClick={() => setActiveTab('recibir')}>
            🎓 Alumno Receptor 
          </button>
        </div>
      </div>

      {/* Contenedor del Componente Activo */}
      <main style={styles.contentBody}>
        {activeTab === 'verificar' && <VerificacionPanel />}
        {activeTab === 'emitir' && <EmisionPanel />}
        {activeTab === 'recibir' && <RecepcionPanel />}
      </main>

      {/* Footer Tecnológico */}
      <footer style={styles.footer}>
        <p>Infraestructura Blockchain Tolerante a Fallos e Inmutable • Laboratorio de Sistemas Distribuidos [cite: 23, 25, 42]</p>
      </footer>
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#030305', color: '#f1f5f9', minHeight: '100vh', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', paddingBottom: '60px' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: '#060609', borderBottom: '1px solid #140f24', boxSizing: 'border-box' },
  brandContainer: { display: 'flex', alignItems: 'center', gap: '15px' },
  neonCube: { fontSize: '28px', color: '#a855f7', filter: 'drop-shadow(0 0 8px #a855f7)', animation: 'pulse 2s infinite' },
  brandName: { margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '0.5px', color: '#fff' },
  networkStatus: { fontSize: '11px', color: '#475569', fontWeight: '600', letterSpacing: '1px', display: 'block' },
  walletButton: { border: '1px solid transparent', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' },
  dotPulse: { color: '#22c55e', fontSize: '14px' },
  tabWrapper: { display: 'flex', justifyContent: 'center', marginTop: '40px', padding: '0 20px' },
  tabNav: { display: 'flex', backgroundColor: '#060609', padding: '6px', borderRadius: '12px', border: '1px solid #140f24', gap: '5px' },
  tabLink: { padding: '12px 24px', backgroundColor: 'transparent', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: '0.2s' },
  tabActive: { backgroundColor: '#120d1e', color: '#c084fc', border: '1px solid #321654', boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)' },
  contentBody: { maxWidth: '650px', margin: '40px auto 0 auto', padding: '0 20px' },
  footer: { textAlign: 'center', marginTop: '60px', color: '#334155', fontSize: '12px', letterSpacing: '0.5px' }
};

export default App;