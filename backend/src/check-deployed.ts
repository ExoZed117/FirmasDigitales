import { ethers } from "ethers";

const ABI = [
  "function owner() view returns (address)",
  "function consultarCertificado(string _codigo) view returns (bool existe, string estudiante, bytes32 hashDocumento, uint256 fechaEmision, bool valido, string motivoRevocacion, address emisor, address estudianteWallet, bool recepcionConfirmada, uint256 fechaRecepcion)",
  "function codigoToHash(string) view returns (bytes32)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const contract = new ethers.Contract(contractAddress, ABI, provider);

  console.log("Querying consultarCertificado for CERT-2026-2218...");
  try {
    const res = await contract.consultarCertificado("CERT-2026-2218");
    console.log("Result for CERT-2026-2218:", res);
  } catch (e: any) {
    console.error("Failed to query consultarCertificado:", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
