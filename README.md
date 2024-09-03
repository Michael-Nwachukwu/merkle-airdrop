# Merkle Airdrop Project

This project implements a Merkle-based airdrop system using an ERC20 token. It includes a Hardhat setup for deploying the smart contract, a TypeScript script for generating the Merkle tree and proofs, and a Solidity contract for managing the airdrop.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Running the Merkle Script](#running-the-merkle-script)
- [Deploying the Smart Contract](#deploying-the-smart-contract)
- [Generating Merkle Proofs](#generating-merkle-proofs)
- [Interacting with the Contract](#interacting-with-the-contract)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js (v16+ recommended)
- npm or Yarn
- Git

## Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Michael-Nwachukwu/merkle-airdrop.git
   cd merkle-airdrop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. Create a `.env` file in the root directory and add the following:
   ```
   ETHERSCAN_API_KEY=your_etherscan_project_id
   PRIVATE_KEY=your_private_key
   ```
   Replace `your_etherscan_project_id` with your Etherscan project ID and `your_private_key` with the private key of the evm account you want to use for deployment.

4. Update the `hardhat.config.ts` file to include network configurations. Here's a basic setup for deploying to the Sepolia testnet:


```1:8:hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;
```


Add the following to the config:

```typescript
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY!]
    }
  }
};
```

## Running the Merkle Script

The `merkle.ts` script generates the Merkle tree and proofs based on a CSV file containing addresses and token amounts.

1. Prepare your CSV file:
   Create a file named `addresses.csv` in the `feed-files` directory with the following format:
   ```
   user_address,amount
   0x1234...,100
   0x5678...,200
   ```

2. Run the script:
   ```bash
   npx ts-node scripts/merkle.ts
   ```

This will generate two files:
- `tree.json`: Contains the Merkle tree data
- `feed-files/proofs.json`: Contains the Merkle proofs for each address

## Deploying the Smart Contract

1. Compile the contract:
   ```bash
   npx hardhat compile
   ```

2. Deploy the contract to the Sepolia testnet:
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

   Make sure to create a `deploy.ts` script in the `scripts` folder that deploys your `MerkleAirdrop` contract.

3. Note down the deployed contract address for future interactions.

## Generating Merkle Proofs

The Merkle proofs are generated automatically when you run the `merkle.ts` script. You can find them in the `feed-files/proofs.json` file.

To generate proofs for specific addresses:


```34:44:scripts/merkle.ts
      // Iterate over the entries in the loaded tree
      for (const [i, v] of loadedTree.entries()) {
        // Get the proof for each address
        const proof = loadedTree.getProof(i);
        proofs[v[0]] = proof; // Store the proof with the address as the key

        // Check for a specific address and get the proof if found
        if (v[0] === '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2') {
          const proof = loadedTree.getProof(i);
          console.log('Proof:', proof);
        }
```


Modify this section to generate proofs for the addresses you're interested in.

## Interacting with the Contract

You can interact with the deployed contract using Hardhat tasks or scripts. Here's an example of how to claim tokens:

1. Create a new script `claim.ts` in the `scripts` folder:

```typescript
import { ethers } from "hardhat";
import proofs from "../feed-files/proofs.json";

async function main() {
  const [signer] = await ethers.getSigners();
  const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  const contract = await ethers.getContractAt("MerkleAirdrop", contractAddress, signer);

  const address = signer.address;
  const proof = proofs[address];
  const amount = ethers.utils.parseEther("100"); // Adjust based on your airdrop amount

  const tx = await contract.claim(amount, proof);
  await tx.wait();
  console.log("Tokens claimed successfully");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

2. Run the claim script:
   ```bash
   npx hardhat run scripts/claim.ts --network sepolia
   ```

## Troubleshooting

- If you encounter issues with gas prices, try adjusting the gas settings in your Hardhat config or transaction options.
- Ensure your `.env` file is properly configured and not committed to version control.
- If you're having trouble with the Merkle proof verification, double-check that the proof generation in `merkle.ts` matches the verification logic in the smart contract.

For more detailed information on specific components, refer to the inline comments in the respective files.