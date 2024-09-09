// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/** 
 * @title MerkleAirdrop
 * @dev This contract is used for claiming airdrops using merkle proofs. It supports ERC20 tokens and uses the OpenZeppelin library for MerkleProof verification.
*/
contract MerkleAirdrop {

    bytes32 public merkleRoot;
    address public token;
    address owner;
    
    constructor(address _tokenAddress, bytes32 _merkleRoot) {
        token = _tokenAddress;
        merkleRoot = _merkleRoot;
        owner = msg.sender;
    }
    
    mapping(address => bool) public hasClaimed;
    event AirdropClaimed(address indexed claimer, uint256 amount);

    modifier onlyOwner {
        require(owner == msg.sender);
        _;
    }

    /**
        @notice This function allows an account to claim airdrop tokens.
        @dev The claiming process involves verifying the user's eligibility using Merkle proofs, 
            and then transferring the specified amount of tokens to the user if they are validated.
        @param _amount The amount of tokens to be claimed by the caller.
        @param proof An array of bytes32 values that represent a merkle proof proving the claimer's eligibility.
    */
    function claim(uint256 _amount, bytes32[] calldata proof) public {

        require(!hasClaimed[msg.sender], "Airdrop already claimed");

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, _amount))));

        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");

        hasClaimed[msg.sender] = true; // Mark address as having claimed

        IERC20(token).transfer(msg.sender, _amount);
        emit AirdropClaimed(msg.sender, _amount);

    }

    // This function is userd to update the merkleRoot of the contract, callable only by the owner
    function updateMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
    }

    // Function to withdraw remaining airdrop tokens. callable only by owner.
    function withdrawTokens(uint256 _amount) external onlyOwner {
        // uint256 balance = IERC20(token).balanceOf(address(this));
        require(IERC20(token).transfer(msg.sender, _amount), "Withdraw failed.");
    }

    function getContractBalance() external view onlyOwner returns(uint256) {
        return IERC20(token).balanceOf(address(this));
    }

}