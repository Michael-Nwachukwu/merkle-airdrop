import { expect } from "chai";
import keccak256 from "keccak256";
import { Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";


describe("MerkleAirdrop", function () {

    // Function that deploys the ERC20 token.
    async function deployToken() {
    
        const roseToken = await hre.ethers.getContractFactory("RoseToken");
        const token = await roseToken.deploy();
        
        // return token deployment properties
        return { token };
    }

    // Function to deploy the Airdrop contract
    async function deployContract() {

        // Get users to populate airdropList
        const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        const airdropList = [
            [ addr1.address, ethers.parseEther("100") ],
            [ addr2.address, ethers.parseEther("200") ],
            [ addr3.address, ethers.parseEther("300") ],
        ];

        // Compute merkle tree for airdrop list
        const merkleTree = StandardMerkleTree.of(airdropList, ["address", "uint256"]);
        // get the the root hash of our merkletree
        const root = merkleTree.root;

        // Grab token from earlier deployment function 
        const { token } = await loadFixture(deployToken);

        // Grab desired contract to be deployed
        const airdropContract = await hre.ethers.getContractFactory("MerkleAirdrop");

        // Deploy contract
        const deployedAirdropContract = await airdropContract.deploy(token, root);

        await token.transfer(deployedAirdropContract, ethers.parseEther("1000"));

        return { deployedAirdropContract, token, owner, addr1, addr2, addr3, merkleTree };

    }

    async function transfer() {
        const { token, deployedAirdropContract } = await loadFixture(deployContract);
        await token.transfer(deployedAirdropContract, ethers.parseEther("1000"));
    }

    describe("Deployment", function () {
        // This test checks that our airdrop contract was deployed with the correct address of our deployed token
        it("Should check if contract deploys with correct tokenAddress", async function () {
          const { token, deployedAirdropContract } = await loadFixture(deployContract);
          expect(await deployedAirdropContract.token()).to.equal(token);
        });
    });

    describe("Airdrop Claiming", function () {
        // This test lets an allowed user to claim their allowed amount
        it("Should allow eligible address to claim their airdrop", async function () {
            const { deployedAirdropContract, token, addr1, merkleTree } = await loadFixture(deployContract);

            // claim details - address and amount
            const claimingAddress = addr1.address;
            const claimAmount = ethers.parseEther("100");

            // Get proof of leaf
            const leaf = [claimingAddress, claimAmount];
            const proof = merkleTree.getProof(leaf);

            // Check that claim function emits the right event after claim
            await expect(deployedAirdropContract.connect(addr1).claim(claimAmount, proof))
                .to.emit(deployedAirdropContract, "AirdropClaimed")
                .withArgs(claimingAddress, claimAmount);
            
            // Check that claimer's balance equals claim amount
            expect(await token.balanceOf(claimingAddress)).to.equal(claimAmount);
        });

        // This test does not allow an allowed user to claim twice.
        it("Should not allow the same address to claim twice", async function () {
            const { deployedAirdropContract, addr1, merkleTree } = await loadFixture(deployContract);

            const claimingAddress = addr1.address;
            const claimAmount = ethers.parseEther("100");

            const leaf = [claimingAddress, claimAmount];
            const proof = merkleTree.getProof(leaf);

            // 1st claim here
            await deployedAirdropContract.connect(addr1).claim(claimAmount, proof);

            // second claim here
            await expect(deployedAirdropContract.connect(addr1).claim(claimAmount, proof)).to.be.revertedWith("Airdrop already claimed");
        });

        // This test does not ineligible addresses to claim airdrops
        it("Should not allow ineligible addresses to claim", async function () {
            const { deployedAirdropContract, addr1, addr2, merkleTree } = await loadFixture(deployContract);

            const ineligibleAddress = addr1.address;
            const claimAmount = ethers.parseEther("100");

            const leaf = [ineligibleAddress, claimAmount];
            const proof = merkleTree.getProof(leaf);

            // pass in wrong address to the wrong proof
            await expect(deployedAirdropContract.connect(addr2).claim(claimAmount, proof)).to.be.revertedWith("Invalid proof");
        });
    });

    describe("Owner Functions", function () {
        it("Should allow the owner to update the Merkle root", async function () {
            const { deployedAirdropContract, owner} = await loadFixture(deployContract);

            // create a new hex hash to pass to the contract 
            const newMerkleRoot = ethers.hexlify(keccak256("new root"));

            // call the update function 
            await deployedAirdropContract.connect(owner).updateMerkleRoot(newMerkleRoot);
            // check that the current contract merkle root equals the newmerkleRoot
            expect(await deployedAirdropContract.merkleRoot()).to.equal(newMerkleRoot);
        });

        // This test allows the contract owner to withdraw 
        it("Should allow the owner to withdraw remaining tokens", async function () {
            const { deployedAirdropContract, owner, token } = await loadFixture(deployContract);
        
            // check owners inital balance
            const ownerInitialBalance = await token.balanceOf(owner.address);

            // get address for deployed contract 
            const contractAddress = await deployedAirdropContract.getAddress();

            // Get contract's initial balance
            const contractInitialBalance = await token.balanceOf(contractAddress);

            const withdrawalAmount = ethers.parseUnits("100")
        
            // Perform the withdrawal
            await deployedAirdropContract.connect(owner).withdrawTokens(withdrawalAmount);
        
            // Check the balances after withdrawal
            const ownerFinalBalance = await token.balanceOf(owner.address);
            const contractFinalBalance = await token.balanceOf(contractAddress);
        
            // The owner's balance should increase by the amount that was in the contract
            expect(ownerFinalBalance).to.equal(ownerInitialBalance + withdrawalAmount);
        
            // The contract's balance should now be zero
            expect(contractFinalBalance).to.equal(contractInitialBalance - withdrawalAmount);
        });
    });
});
