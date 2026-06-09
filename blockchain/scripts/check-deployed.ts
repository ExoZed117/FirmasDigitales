import { ethers } from "hardhat";

async function main() {
  const addresses = [
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "0xCf789885823235851520213721F5403C21c7d421",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  ];
  for (const address of addresses) {
    const code = await ethers.provider.getCode(address);
    console.log(`Address ${address} code length: ${code.length}`);
    if (code === "0x") {
      console.log(`❌ No contract is deployed at ${address}`);
    } else {
      console.log(`✅ Contract is deployed at ${address}!`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
