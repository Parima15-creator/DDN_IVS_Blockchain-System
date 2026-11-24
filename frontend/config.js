/**
 * ============================================================================
 * DocuChain — Blockchain Configuration File (config.js)
 * ============================================================================
 * 
 * INSTRUCTIONS FOR ACADEMIC PROJECT DEMONSTRATION & DEPLOYMENT:
 * 
 * 1. Deploy your Solidity contract using Remix IDE, Hardhat, or Foundry.
 * 2. Copy the deployed contract address and paste it below into CONTRACT_ADDRESS.
 * 3. Verify that your contract functions match the CONTRACT_ABI below. If you
 *    customized your Solidity functions, update the ABI array accordingly.
 * 4. Choose your target network below (Default: Ethereum Sepolia Testnet).
 * 
 * ============================================================================
 */

// 1. SMART CONTRACT DEPLOYED ADDRESS
// Paste your deployed contract address here (e.g., "0x71C...92AB").
// Leave empty ("") if you have not deployed the contract yet.
export const CONTRACT_ADDRESS = "";

// 2. TARGET BLOCKCHAIN NETWORK CONFIGURATION
// Default configured for Ethereum Sepolia Testnet (Chain ID 11155111 / Hex: 0xaa36a7)
// For local Hardhat node, switch chainId to 31337 (0x7a69)
export const NETWORK_CONFIG = {
  chainId: 11155111,
  chainIdHex: "0xaa36a7",
  networkName: "Sepolia Testnet",
  currencyName: "Sepolia Ether",
  currencySymbol: "ETH",
  currencyDecimals: 18,
  rpcUrls: ["https://rpc.sepolia.org", "https://ethereum-sepolia-rpc.publicnode.com"],
  blockExplorerUrl: "https://sepolia.etherscan.io",
};

// Alternative Preset: Localhost / Hardhat / Anvil
export const LOCALHOST_NETWORK_CONFIG = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  networkName: "Localhost (31337)",
  currencyName: "Ethereum",
  currencySymbol: "GO",
  currencyDecimals: 18,
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrl: "",
};

// 3. SMART CONTRACT APPLICATION BINARY INTERFACE (ABI)
// Standard full ABI for DocuChain document registration and verification system.
// Matches functions:
// - registerDocument(bytes32 _documentHash, string _documentName)
// - verifyDocument(bytes32 _documentHash) view returns (bool isRegistered, bool isRevoked, string documentName, address owner, uint256 timestamp)
// - revokeDocument(bytes32 _documentHash)
// - getDocument(bytes32 _documentHash) view returns (string documentName, address owner, uint256 timestamp, bool isRevoked)
// - isRegistered(bytes32 _documentHash) view returns (bool)
// - isRevoked(bytes32 _documentHash) view returns (bool)
// And Events:
// - DocumentRegistered(bytes32 indexed documentHash, string documentName, address indexed owner, uint256 timestamp)
// - DocumentRevoked(bytes32 indexed documentHash, address indexed owner, uint256 timestamp)

export const CONTRACT_ABI = [
  // Event: DocumentRegistered
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "documentHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string", "name": "documentName", "type": "string" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DocumentRegistered",
    "type": "event"
  },
  // Event: DocumentRevoked
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "documentHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DocumentRevoked",
    "type": "event"
  },
  // Function: registerDocument
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_documentHash", "type": "bytes32" },
      { "internalType": "string", "name": "_documentName", "type": "string" }
    ],
    "name": "registerDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function: verifyDocument
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_documentHash", "type": "bytes32" }
    ],
    "name": "verifyDocument",
    "outputs": [
      { "internalType": "bool", "name": "isRegistered", "type": "bool" },
      { "internalType": "bool", "name": "isRevoked", "type": "bool" },
      { "internalType": "string", "name": "documentName", "type": "string" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "registrationTimestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Function: getDocument
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_documentHash", "type": "bytes32" }
    ],
    "name": "getDocument",
    "outputs": [
      { "internalType": "string", "name": "documentName", "type": "string" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "uint256", "name": "registrationTimestamp", "type": "uint256" },
      { "internalType": "bool", "name": "isRevoked", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Function: revokeDocument
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_documentHash", "type": "bytes32" }
    ],
    "name": "revokeDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Function: isDocumentRegistered
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_documentHash", "type": "bytes32" }
    ],
    "name": "isDocumentRegistered",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Validates whether the contract address is configured and syntactically valid.
 * @returns {boolean} True if contract address is a valid non-zero Ethereum address.
 */
export function isContractConfigured() {
  if (!CONTRACT_ADDRESS || typeof CONTRACT_ADDRESS !== "string") return false;
  const trimmed = CONTRACT_ADDRESS.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) && trimmed !== "0x0000000000000000000000000000000000000000";
}

/**
 * Builds a block explorer link for a transaction hash.
 * @param {string} txHash - Transaction hash.
 * @returns {string} Clickable explorer URL.
 */
export function getExplorerTxUrl(txHash) {
  if (!NETWORK_CONFIG.blockExplorerUrl || !txHash) return "#";
  return `${NETWORK_CONFIG.blockExplorerUrl}/tx/${txHash}`;
}

/**
 * Builds a block explorer link for an address.
 * @param {string} address - Ethereum address.
 * @returns {string} Clickable explorer URL.
 */
export function getExplorerAddressUrl(address) {
  if (!NETWORK_CONFIG.blockExplorerUrl || !address) return "#";
  return `${NETWORK_CONFIG.blockExplorerUrl}/address/${address}`;
}
