import { sequelize, Document } from "./models";

async function main() {
  await sequelize.authenticate();
  console.log("Database connected.");
  const docs = await Document.findAll();
  console.log(`Found ${docs.length} documents:`);
  for (const doc of docs) {
    console.log(`ID: ${doc.id}`);
    console.log(`  Codigo: ${doc.codigo}`);
    console.log(`  Estudiante: ${doc.estudiante}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Hash: ${doc.hashDocumento}`);
    console.log(`  TxHash: ${doc.blockchainTxHash}`);
    console.log(`  ContractAddress: ${doc.blockchainContractAddress}`);
    console.log(`-----------------------------------`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
