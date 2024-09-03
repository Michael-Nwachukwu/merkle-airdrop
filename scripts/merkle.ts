import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";
import csv from "csv-parser";

interface AirdropEntry {
    user_address: string;  // Ethereum address
    amount: number;  // Token amount eligible for airdrop
}

const values: [string, number][] = [];  // Array to store values from CSV

const feedFile = "feed-files/addresses.csv";

// Read the CSV file and populate the values array
fs.createReadStream(feedFile)
  .pipe(csv())
  .on("data", (row: AirdropEntry) => {
    values.push([row.user_address, row.amount]);
  })
  .on("end", () => {
    // Create a Merkle tree from the values
    const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
    console.log("Merkle Root:", tree.root);

    // Write the tree to a JSON file
    fs.writeFileSync("tree.json", JSON.stringify(tree.dump(), null, 2));

    // Load the tree from the JSON file
    try {
        
      const loadedTree = StandardMerkleTree.load(JSON.parse(fs.readFileSync("tree.json", "utf8")));
      const proofs: any = {};
      
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

        // Write all proofs to a JSON file
        fs.writeFileSync("feed-files/proofs.json", JSON.stringify(proofs, null, 2));
        console.log("All proofs have been saved to 'proofs.json'.");

      }
    } catch (err) {
      console.error("Error reading or processing 'tree.json':", err);
    }
  })
  .on("error", (err: Error) => {
    console.error(`Error reading ${feedFile}:`, err);
  });









  
