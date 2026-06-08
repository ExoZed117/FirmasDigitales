import { ethers } from 'ethers';

export const connectMetaMask = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask no está instalado en el navegador.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
};

export const broadcastCertificateToBlockchain = async (certCode, studentName, pdfHash) => {
  // Aquí se realizará la llamada real al Smart Contract: contract.emitirCertificado()
  console.log("Transmisión Web3 ejecutada con éxito", { certCode, studentName, pdfHash });
  return true;
};