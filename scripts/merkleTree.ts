// Import necessary modules
import * as fs from 'fs';  // File system module for reading/writing files
import csv from 'csv-parser';  // CSV parser to read CSV files
import { MerkleTree } from 'merkletreejs';  // Merkle tree implementation
import keccak256 from 'keccak256';  // Keccak256 hashing function
const utils = require("ethers").utils;

// Interface to define the structure of each CSV row
interface AirdropEntry {
    user_address: string;  // Ethereum address
    amount: number;  // Token amount eligible for airdrop
}

// Define the structure of the data to be written to the distributionList. ie leafHash of a user and proof
interface UserDistribution {
    leaf: string;  // The leaf hash
    proof: string[];  // Array of proofs (hashes)
}

interface UserClaim {
    address: string;  // User's Ethereum address
    amount: string;  // Amount of tokens eligible for airdrop
}

function main() {

    // An expression of the expected root hash
    let root: string;

    // This file holds the list of eligible addresses and their claims. It will be pared for hashing
    const feedFile = "feed-files/addresses.csv";

    // This file holds the merkleProof of each user leaf
    const outputFile = "feed-files/merkle-proof.json";

    // This file stores the claimer's details(address and amount) and the merkle root of the tree generated it is essential for verifying the authenticity of claims
    const userclaimFile = "feed-files/claim-deets.json";

    // used to store the leaf for each distribution in the file
    const leafDistro: Buffer[] = [];

    // used for tracking user_id of each leaf so we can write to proofs file accordingly
    const distroList: [string, string][] = [];

    fs.createReadStream(feedFile)
        .pipe(csv())
        .on('data', (row: AirdropEntry) => {
            // This variable tracks the id of leaves
            const userDistro: [string, string] = [row.user_address, row.amount.toString()];
            // This variable tracks the keccak hashed records of leaves
            // const userLeafHash = utils.solidityKeccak256(row.user_address + row.amount.toString());
            const userLeafHash = keccak256(Buffer.concat([Buffer.from(row.user_address.slice(2), 'hex'), Buffer.from(row.amount.toString())]));

            
            // push records to designated arrays
            distroList.push(userDistro);
            leafDistro.push(userLeafHash);
        })
        .on('end', () => {
            // Generate merkleTre from hashed records pushed to the leafDistro
            const merkleTree = new MerkleTree(leafDistro, keccak256, { sortPairs: true });
            // grabbing the root in hex format and saving to the rrot variable
            root = merkleTree.getRoot().toString('hex');

            // Calling function that pushes records to designated files
            write_leaves(merkleTree, distroList, leafDistro, root);
            console.log('Merkle Root:', root);
        })
        .on('error', (error: Error) => {
            console.error('Error reading CSV file:', error);
        });

    // Function to write data to JSON files
    function writeToFile(filePath: string, data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            // Convert the data object to a JSON string with 4 spaces of indentation
            fs.writeFile(filePath, JSON.stringify(data, null, 4), (err) => {
                if (err) {
                    // If an error occurs during file writing, reject the promise with the error
                    reject(err);
                } else {
                    // If the file is written successfully, resolve the promise
                    resolve();
                }
            });
        });
    }

    /**
     * Function to generate and write Merkle tree leaves and proofs to JSON files.
     * @param merkleTree - The Merkle tree generated from the hashed data.
     * @param distroList - An array containing user addresses and the corresponding token amounts.
     * @param leafDistro - An array of hashed leaf nodes corresponding to each user.
     * @param root - The root hash of the Merkle tree.
    */

    async function write_leaves (
        merkleTree: MerkleTree, 
        distroList: [string, string][], 
        leafDistro: Buffer[],
        root: string
    ) {
        console.log("Begin writing leaves to file...");

        // Object to store the full distribution of users with their respective Merkle proofs
        const fullDist: Record<string, UserDistribution> = {};

        // Object to store user claim data (address and amount) for the airdrop
        const fullUserClaim: Record<string, UserClaim> = {};

        // Iterate over each entry in the user distribution list
        for (let i = 0; i < distroList.length; i++) {

            // Get the corresponding leaf hash from the leafDistro array
            const leaf = leafDistro[i];

            // Generate the Merkle proof for this leaf hash
            const userDist: UserDistribution = {
                leaf: leaf.toString('hex'),  // Convert the leaf hash to a hex string
                proof: merkleTree.getHexProof(leaf),  // Get the proof as an array of hex strings
            };

            // Map the user's address to their distribution object in the fullDist object
            fullDist[distroList[i][0]] = userDist;

        }

        try {
            // Write the full distribution data (including Merkle proofs) to the output file
            await writeToFile(outputFile, fullDist);

            // Object containing the Merkle root for reference in the airdrop
            const dropObjs = {
                dropDetails: {
                    merkleroot: root,  // The Merkle root of the tree
                },
            };

            // Iterate over the user distribution list again to create user claim data
            for (let i = 0; i < distroList.length; i++) {
                const userClaim: UserClaim = {
                    address: distroList[i][0],  // User's Ethereum address
                    amount: distroList[i][1],  // Amount of tokens they can claim
                };

                // Map the user's address to their claim data in the fullUserClaim object
                fullUserClaim[distroList[i][0]] = userClaim;
            }

            // Merge the user claim data with the drop details (which includes the Merkle root)
            const newObj = { ...fullUserClaim, ...dropObjs };

            // Write the combined data (user claims and Merkle root) to the user claim file
            await writeToFile(userclaimFile, newObj);

            // Log a message indicating successful writing of the file, including the Merkle root
            console.log(`${outputFile} has been written with a root hash of:\n${root}`);
        } catch (error) {
            // Log an error message if something goes wrong during the file writing process
            console.error("Error writing to file:", error);
        }
    }

}

main();
