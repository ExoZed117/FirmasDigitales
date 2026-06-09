import dotenv from "dotenv";
import { ethers } from "ethers";
import { sequelize, Document } from "./models";

dotenv.config({ override: true });

const providerUrl = process.env.PROVIDER_URL || "http://127.0.0.1:8545";
const privateKey = process.env.INSTITUTIONAL_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const contractAddress = process.env.CONTRACT_ADDRESS!;

if (!contractAddress) {
  console.error("CONTRACT_ADDRESS is not set in environment variables.");
  process.exit(1);
}

async function sync() {
  try {
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contractAbi = [
      "function emitirCertificado(string _codigo, string _estudiante, address _estudianteWallet, bytes32 _hashDocumento) external",
      "function verificarCertificado(bytes32 _hashDocumento) view returns (bool existe, string codigo, string estudiante, uint256 fechaEmision, bool valido, string motivoRevocacion, address emisor, address estudianteWallet, bool recepcionConfirmada, uint256 fechaRecepcion)",
      "function owner() view returns (address)"
    ];
    const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

    console.log("Checking contract owner to verify contract accessibility...");
    const owner = await contract.owner();
    console.log(`Contract owner: ${owner}. Contract is active at: ${contractAddress}`);

    // Fetch all documents from Database
    console.log("Fetching documents from SQL Server...");
    await sequelize.authenticate();
    const docs = await Document.findAll();
    console.log(`Found ${docs.length} documents in database.`);

    for (const doc of docs) {
      if (doc.status === "registered" || doc.status === "ready_for_blockchain") {
        if (!doc.hashDocumento) {
          console.log(`[-] Document ${doc.codigo} is missing hashDocumento. Skipping.`);
          continue;
        }

        console.log(`[i] Checking status of ${doc.codigo} (${doc.estudiante}) on-chain...`);
        const onChain = await contract.verificarCertificado(doc.hashDocumento);

        if (!onChain.existe) {
          console.log(`[!] Document ${doc.codigo} is NOT on-chain. Emitting to blockchain...`);
          const studentWallet = (doc.estudianteWallet && ethers.isAddress(doc.estudianteWallet))
            ? doc.estudianteWallet
            : ethers.ZeroAddress;

          try {
            const tx = await contract.emitirCertificado(
              doc.codigo,
              doc.estudiante,
              studentWallet,
              doc.hashDocumento
            );
            console.log(`    Transaction sent: ${tx.hash}. Waiting for confirmation...`);
            const receipt = await tx.wait(1);
            
            if (receipt) {
              console.log(`    [+] Confirmed in block ${receipt.blockNumber}!`);
              
              // Update details in DB if needed
              doc.blockchainTxHash = receipt.hash;
              doc.blockchainBlockNumber = receipt.blockNumber;
              doc.blockchainContractAddress = contractAddress;
              doc.status = "registered";
              await doc.save();
            } else {
              console.error(`    [-] Transaction failed for ${doc.codigo}`);
            }
          } catch (txErr: any) {
            console.error(`    [-] Error sending transaction for ${doc.codigo}:`, txErr.message);
          }
        } else {
          console.log(`    [+] Already exists on-chain. Status: ${onChain.valido ? "VALID" : "REVOKED"}.`);
        }
      }
    }
    
    console.log("[+] Sync completed successfully.");
    process.exit(0);
  } catch (err: any) {
    console.error("[-] Sync error:", err);
    process.exit(1);
  }
}

sync();
