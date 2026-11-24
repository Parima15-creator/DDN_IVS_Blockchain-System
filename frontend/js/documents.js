/**
 * ============================================================================
 * DocuChain — Document Management & Hashing Engine (documents.js)
 * ============================================================================
 * 
 * Cryptography: Web Crypto API (crypto.subtle.digest)
 * Responsibilities:
 * - Local in-browser cryptographic SHA-256 fingerprint generation.
 * - Validation of file format, size, and bytes32 consistency.
 * - Zero raw file uploads (strictly preserves privacy).
 * - Registration workflow coordination with contract write calls.
 * - Verification workflow and classification into VERIFIED, NOT_VERIFIED, REVOKED.
 * - Revocation management with authorization verification.
 * 
 * ============================================================================
 */

import { registerDocumentOnChain, verifyDocumentOnChain, revokeDocumentOnChain } from './contract.js';
import { walletState } from './wallet.js';
import { isContractConfigured } from '../config.js';

// Max file size for browser in-memory hashing: 100MB
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * Calculates the cryptographic SHA-256 hash of a file or ArrayBuffer
 * using the native browser Web Crypto API.
 * 
 * @param {File|Blob|ArrayBuffer} fileOrBuffer - Input file or buffer.
 * @returns {Promise<string>} Standard 32-byte Ethereum hex format string: 0x...
 */
export async function calculateDocumentHash(fileOrBuffer) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this browser. Please use a modern browser.');
  }

  let arrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
    if (fileOrBuffer.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds maximum size limit of 100MB for client-side hashing.`);
    }
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error('Invalid input format provided to document hashing engine.');
  }

  // Generate SHA-256 digest buffer
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);

  // Convert buffer to 64-character lowercase hex string prefixed with 0x
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Validates a candidate hash to ensure it is a valid 32-byte Ethereum hex string.
 * @param {string} hash - Input hash string.
 * @returns {string} Sanitized 0x-prefixed 66-character lowercase hex string.
 */
export function sanitizeAndValidateHash(hash) {
  if (!hash || typeof hash !== 'string') {
    throw new Error('Document hash cannot be empty.');
  }

  let cleaned = hash.trim().toLowerCase();
  if (!cleaned.startsWith('0x')) {
    cleaned = '0x' + cleaned;
  }

  // Exact 32-byte regex (0x followed by 64 hex characters)
  const bytes32Regex = /^0x[0-9a-f]{64}$/;
  if (!bytes32Regex.test(cleaned)) {
    throw new Error('Invalid hash format. Document hash must be a valid 64-character hexadecimal SHA-256 digest.');
  }

  return cleaned;
}

/**
 * Formats byte size into human-readable string (KB, MB).
 * @param {number} bytes - Size in bytes.
 * @returns {string} Formatted size string.
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a Unix timestamp into a readable localized date/time string.
 * @param {number} unixTimestamp - Unix timestamp in seconds.
 * @returns {string} Formatted date string.
 */
export function formatTimestamp(unixTimestamp) {
  if (!unixTimestamp || unixTimestamp === 0) return 'N/A';
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Coordinates the full registration lifecycle:
 * 1. Checks wallet connection and target network.
 * 2. Checks contract configuration.
 * 3. Triggers contract write via MetaMask approval.
 * 4. Awaits transaction receipt.
 * 
 * @param {string} docHash - 0x-prefixed SHA-256 hash.
 * @param {string} docTitle - Document title.
 * @param {Object} callbacks - { onStateChange, onPending }
 * @returns {Promise<any>} Confirmed transaction receipt.
 */
export async function executeDocumentRegistration(docHash, docTitle, callbacks = {}) {
  const { onStateChange, onPending } = callbacks;

  const notifyState = (state, message) => {
    if (typeof onStateChange === 'function') onStateChange(state, message);
  };

  // Validate inputs
  const sanitizedHash = sanitizeAndValidateHash(docHash);
  const trimmedTitle = (docTitle || '').trim();

  if (!trimmedTitle) {
    throw new Error('Please enter a document title.');
  }

  // Check wallet connection
  if (!walletState.isConnected || !walletState.address) {
    throw new Error('Please connect your MetaMask wallet before registering a document.');
  }

  if (!walletState.isCorrectNetwork) {
    throw new Error('Your wallet is connected to the wrong network. Please switch to the expected network.');
  }

  if (!isContractConfigured()) {
    throw new Error('Smart contract is not yet configured. Please insert your deployed contract address in config.js.');
  }

  // 1. Waiting for user to approve signature in MetaMask
  notifyState('WAITING_APPROVAL', 'Please approve the transaction in your MetaMask wallet popup...');

  const receipt = await registerDocumentOnChain(sanitizedHash, trimmedTitle, (txHash) => {
    // 2. Broadcasted and mining
    notifyState('TRANSACTION_PENDING', `Transaction submitted to network. Mining block...`, txHash);
    if (typeof onPending === 'function') onPending(txHash);
  });

  // 3. Confirmed
  notifyState('TRANSACTION_CONFIRMED', 'Document successfully registered and sealed on-chain!', receipt.hash);
  return receipt;
}

/**
 * Executes blockchain verification for a document hash.
 * Classifies result into VERIFIED, NOT_VERIFIED, or REVOKED.
 * 
 * @param {string} docHash - 0x-prefixed SHA-256 hash.
 * @returns {Promise<{status: 'VERIFIED'|'NOT_VERIFIED'|'REVOKED', details: Object}>}
 */
export async function executeDocumentVerification(docHash) {
  const sanitizedHash = sanitizeAndValidateHash(docHash);

  if (!isContractConfigured()) {
    throw new Error('Contract address is not configured in config.js. Cannot query live blockchain ledger.');
  }

  // Call contract view function
  const onChainData = await verifyDocumentOnChain(sanitizedHash);

  // If not registered or record is completely empty
  if (!onChainData.isRegistered) {
    return {
      status: 'NOT_VERIFIED',
      details: {
        hash: sanitizedHash,
        message: 'No matching record exists on the blockchain ledger for this document fingerprint.',
      },
    };
  }

  // If registered but revoked
  if (onChainData.isRevoked) {
    return {
      status: 'REVOKED',
      details: {
        hash: sanitizedHash,
        name: onChainData.documentName,
        owner: onChainData.owner,
        timestamp: onChainData.timestamp,
        message: 'This document was registered, but has subsequently been REVOKED by the owner.',
      },
    };
  }

  // Registered and active
  return {
    status: 'VERIFIED',
    details: {
      hash: sanitizedHash,
      name: onChainData.documentName,
      owner: onChainData.owner,
      timestamp: onChainData.timestamp,
      message: 'Authentic document record verified on the Ethereum blockchain.',
    },
  };
}

/**
 * Executes document revocation on-chain.
 * @param {string} docHash - 32-byte hex hash.
 * @param {Object} callbacks - { onStateChange, onPending }
 * @returns {Promise<any>} Confirmed transaction receipt.
 */
export async function executeDocumentRevocation(docHash, callbacks = {}) {
  const { onStateChange, onPending } = callbacks;

  const notifyState = (state, message) => {
    if (typeof onStateChange === 'function') onStateChange(state, message);
  };

  const sanitizedHash = sanitizeAndValidateHash(docHash);

  if (!walletState.isConnected) {
    throw new Error('Please connect your MetaMask wallet to revoke this document.');
  }

  if (!isContractConfigured()) {
    throw new Error('Smart contract is not configured in config.js.');
  }

  notifyState('WAITING_APPROVAL', 'Please approve the revocation transaction in MetaMask...');

  const receipt = await revokeDocumentOnChain(sanitizedHash, (txHash) => {
    notifyState('TRANSACTION_PENDING', 'Revocation transaction submitted. Waiting for block confirmation...', txHash);
    if (typeof onPending === 'function') onPending(txHash);
  });

  notifyState('TRANSACTION_CONFIRMED', 'Document has been officially revoked on the blockchain.', receipt.hash);
  return receipt;
}
