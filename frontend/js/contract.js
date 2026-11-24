/**
 * ============================================================================
 * DocuChain — Smart Contract Interaction Module (contract.js)
 * ============================================================================
 * 
 * Technology: Ethers.js v6
 * Strict adherence to Ethers v6 API specifications:
 * - ethers.BrowserProvider(window.ethereum)
 * - provider.getSigner() -> JsonRpcSigner
 * - new ethers.Contract(address, abi, providerOrSigner)
 * - tx.wait() for on-chain block confirmation
 * - contract.queryFilter for authentic event logs
 * 
 * ============================================================================
 */

import { CONTRACT_ADDRESS, CONTRACT_ABI, isContractConfigured } from '../config.js';
import { getEthereum } from './wallet.js';

/**
 * Returns the global Ethers object from CDN or throws.
 * @returns {any} ethers v6 root object.
 */
function getEthers() {
  if (typeof window !== 'undefined' && window.ethers) {
    return window.ethers;
  }
  throw new Error('Ethers.js v6 library is not loaded. Please verify your internet connection or script import.');
}

/**
 * Creates and returns an Ethers v6 BrowserProvider wrapping window.ethereum.
 * @returns {any} ethers.BrowserProvider instance.
 */
export function getBrowserProvider() {
  const eth = getEthereum();
  if (!eth) {
    throw new Error('MetaMask or Web3 provider not detected in browser.');
  }
  const ethers = getEthers();
  return new ethers.BrowserProvider(eth);
}

/**
 * Obtains an authenticated JsonRpcSigner from the BrowserProvider.
 * @returns {Promise<any>} JsonRpcSigner instance.
 */
export async function getSigner() {
  const provider = getBrowserProvider();
  return await provider.getSigner();
}

/**
 * Instantiates a read-only smart contract connected to the Provider.
 * Used for view/pure function calls.
 * @returns {any} ethers.Contract instance.
 */
export function getReadOnlyContract() {
  if (!isContractConfigured()) {
    throw new Error('Contract address has not been configured yet. Please update CONTRACT_ADDRESS in config.js.');
  }
  const ethers = getEthers();
  const provider = getBrowserProvider();
  return new ethers.Contract(CONTRACT_ADDRESS.trim(), CONTRACT_ABI, provider);
}

/**
 * Instantiates a read-write smart contract connected to the Signer.
 * Used for state-modifying transaction calls requiring MetaMask approval and gas.
 * @returns {Promise<any>} ethers.Contract instance connected to signer.
 */
export async function getWriteContract() {
  if (!isContractConfigured()) {
    throw new Error('Contract address has not been configured yet. Please update CONTRACT_ADDRESS in config.js.');
  }
  const ethers = getEthers();
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS.trim(), CONTRACT_ABI, signer);
}

/**
 * Calls Solidity function: registerDocument(bytes32 _documentHash, string calldata _documentName)
 * @param {string} documentHashHex - 32-byte hex string (e.g. 0x8f3c...).
 * @param {string} documentName - Human-readable document title.
 * @param {Function} onPending - Callback(txHash) when tx is broadcast.
 * @returns {Promise<any>} Transaction receipt.
 */
export async function registerDocumentOnChain(documentHashHex, documentName, onPending) {
  if (!isContractConfigured()) {
    throw new Error('Contract address is not configured in config.js. Deploy your contract and set CONTRACT_ADDRESS first.');
  }

  const contract = await getWriteContract();

  try {
    // Submit transaction via MetaMask approval prompt
    const tx = await contract.registerDocument(documentHashHex, documentName);

    if (typeof onPending === 'function') {
      onPending(tx.hash);
    }

    // Wait for real on-chain confirmation (1 confirmation block)
    const receipt = await tx.wait(1);
    return receipt;
  } catch (err) {
    throw mapEthersError(err);
  }
}

/**
 * Queries the smart contract to verify a document hash.
 * Calls view function: verifyDocument(bytes32 _documentHash)
 * 
 * Returns: { isRegistered, isRevoked, documentName, owner, registrationTimestamp }
 * @param {string} documentHashHex - 32-byte hex string.
 * @returns {Promise<{isRegistered: boolean, isRevoked: boolean, documentName: string, owner: string, timestamp: number}>}
 */
export async function verifyDocumentOnChain(documentHashHex) {
  if (!isContractConfigured()) {
    throw new Error('Contract address is not configured in config.js.');
  }

  const contract = getReadOnlyContract();

  try {
    // Call contract view function
    const result = await contract.verifyDocument(documentHashHex);

    // Ethers v6 maps struct/tuple return values to array-like objects with named properties
    const isRegistered = Boolean(result[0] ?? result.isRegistered);
    const isRevoked = Boolean(result[1] ?? result.isRevoked);
    const documentName = result[2] ?? result.documentName ?? '';
    const owner = result[3] ?? result.owner ?? '';
    const rawTimestamp = result[4] ?? result.registrationTimestamp ?? 0;
    const timestamp = Number(rawTimestamp);

    return {
      isRegistered,
      isRevoked,
      documentName,
      owner,
      timestamp,
    };
  } catch (err) {
    throw mapEthersError(err);
  }
}

/**
 * Calls Solidity function: revokeDocument(bytes32 _documentHash)
 * Only the registered owner can call this function.
 * @param {string} documentHashHex - 32-byte hex string.
 * @param {Function} onPending - Callback(txHash).
 * @returns {Promise<any>} Transaction receipt.
 */
export async function revokeDocumentOnChain(documentHashHex, onPending) {
  if (!isContractConfigured()) {
    throw new Error('Contract address is not configured in config.js.');
  }

  const contract = await getWriteContract();

  try {
    const tx = await contract.revokeDocument(documentHashHex);

    if (typeof onPending === 'function') {
      onPending(tx.hash);
    }

    const receipt = await tx.wait(1);
    return receipt;
  } catch (err) {
    throw mapEthersError(err);
  }
}

/**
 * Retrieves all registered documents for a given owner.
 * If the contract supports getUserDocuments, calls that; otherwise queries past DocumentRegistered events.
 * @param {string} ownerAddress - Ethereum address of the owner.
 * @returns {Promise<Array<{hash: string, name: string, owner: string, timestamp: number, isRevoked: boolean}>>}
 */
export async function fetchUserDocuments(ownerAddress) {
  if (!isContractConfigured()) return [];

  const contract = getReadOnlyContract();
  const records = [];

  try {
    // Attempt contract method getUserDocuments if available
    if (typeof contract.getUserDocuments === 'function') {
      const hashes = await contract.getUserDocuments(ownerAddress);
      for (const hash of hashes) {
        const details = await contract.verifyDocument(hash);
        records.push({
          hash,
          name: details[2] || details.documentName || 'Document',
          owner: details[3] || details.owner || ownerAddress,
          timestamp: Number(details[4] || details.registrationTimestamp || 0),
          isRevoked: Boolean(details[1] || details.isRevoked),
        });
      }
      return records;
    }
  } catch (err) {
    console.warn('getUserDocuments call skipped or unsupported, falling back to event logs:', err);
  }

  // Fallback: Query contract events emitted with indexed owner
  try {
    const filter = contract.filters.DocumentRegistered(null, null, ownerAddress);
    const provider = getBrowserProvider();
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000); // Last 50k blocks

    const events = await contract.queryFilter(filter, fromBlock, 'latest');

    for (const ev of events) {
      const docHash = ev.args.documentHash;
      const details = await contract.verifyDocument(docHash);
      records.push({
        hash: docHash,
        name: ev.args.documentName || details[2] || 'Document',
        owner: ev.args.owner || ownerAddress,
        timestamp: Number(ev.args.timestamp || details[4] || 0),
        isRevoked: Boolean(details[1] || details.isRevoked),
      });
    }
  } catch (eventErr) {
    console.error('Error fetching event logs for user documents:', eventErr);
  }

  return records;
}

/**
 * Reads public blockchain activity logs (emitted events).
 * @param {number} maxRecords - Maximum event logs to return.
 * @returns {Promise<Array<{type: string, docHash: string, name: string, owner: string, timestamp: number, blockNumber: number, txHash: string}>>}
 */
export async function fetchBlockchainActivityLogs(maxRecords = 15) {
  if (!isContractConfigured()) return [];

  const contract = getReadOnlyContract();
  const provider = getBrowserProvider();
  const results = [];

  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000);

    // Query DocumentRegistered events
    const regFilter = contract.filters.DocumentRegistered();
    const regEvents = await contract.queryFilter(regFilter, fromBlock, 'latest');

    for (const ev of regEvents) {
      results.push({
        type: 'REGISTER',
        docHash: ev.args.documentHash,
        name: ev.args.documentName || 'Document',
        owner: ev.args.owner,
        timestamp: Number(ev.args.timestamp || 0),
        blockNumber: ev.blockNumber,
        txHash: ev.transactionHash,
      });
    }

    // Query DocumentRevoked events if event exists
    if (contract.filters.DocumentRevoked) {
      try {
        const revFilter = contract.filters.DocumentRevoked();
        const revEvents = await contract.queryFilter(revFilter, fromBlock, 'latest');
        for (const ev of revEvents) {
          results.push({
            type: 'REVOKE',
            docHash: ev.args.documentHash,
            name: 'Document Revocation',
            owner: ev.args.owner,
            timestamp: Number(ev.args.timestamp || 0),
            blockNumber: ev.blockNumber,
            txHash: ev.transactionHash,
          });
        }
      } catch (revErr) {
        console.warn('Revoke event filter failed or not supported:', revErr);
      }
    }

    // Sort descending by block number
    results.sort((a, b) => b.blockNumber - a.blockNumber);
    return results.slice(0, maxRecords);
  } catch (err) {
    console.error('Failed to query blockchain activity logs:', err);
    return [];
  }
}

/**
 * Maps complex Ethers.js v6 / MetaMask error objects into clean, human-readable user messages.
 * @param {any} err - Caught error.
 * @returns {Error} Formatted friendly error.
 */
function mapEthersError(err) {
  console.error('Contract execution error:', err);

  // User rejected transaction in MetaMask
  if (err.code === 'ACTION_REJECTED' || err.code === 4001 || (err.message && err.message.includes('rejected'))) {
    const userErr = new Error('Transaction was rejected by the user in MetaMask.');
    userErr.code = 'USER_REJECTED';
    return userErr;
  }

  // Insufficient ETH for gas
  if (err.code === 'INSUFFICIENT_FUNDS' || (err.message && err.message.includes('insufficient funds'))) {
    const fundErr = new Error('Insufficient ETH in your wallet to cover the transaction gas fee.');
    fundErr.code = 'INSUFFICIENT_FUNDS';
    return fundErr;
  }

  // Contract execution reverted
  if (err.reason) {
    const revertErr = new Error(`Transaction reverted: ${err.reason}`);
    revertErr.code = 'CALL_EXCEPTION';
    return revertErr;
  }

  // Contract custom errors (e.g., DocumentAlreadyRegistered)
  if (err.data && typeof err.data === 'string') {
    if (err.data.includes('DocumentAlreadyRegistered')) {
      const dupErr = new Error('This document hash is already registered on the blockchain.');
      dupErr.code = 'DUPLICATE_REGISTRATION';
      return dupErr;
    }
  }

  return new Error(err.message || 'An unexpected error occurred during blockchain communication.');
}
