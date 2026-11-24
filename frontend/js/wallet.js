/**
 * ============================================================================
 * DocuChain — MetaMask Wallet Integration Module (wallet.js)
 * ============================================================================
 * 
 * Standards Compliance: EIP-1193 Ethereum Provider JavaScript API
 * Responsibilities:
 * - Detects MetaMask browser extension presence.
 * - Handles user-initiated connection via eth_requestAccounts.
 * - Tracks connected wallet address, chain ID, and network validity.
 * - Listens for accountsChanged and chainChanged events.
 * - Provides programmatic network switching / addition.
 * - Never prompts for wallet access on initial page load (EIP standard).
 * 
 * ============================================================================
 */

import { NETWORK_CONFIG } from '../config.js';

// Internal module state
export const walletState = {
  isInstalled: false,
  isConnected: false,
  address: null,
  chainId: null,
  isCorrectNetwork: false,
};

// Event callback registries
const accountChangeCallbacks = [];
const networkChangeCallbacks = [];
const disconnectCallbacks = [];

/**
 * Returns the active EIP-1193 Ethereum provider (handles multiple wallet extensions).
 * @returns {any|null} The Ethereum provider object or null.
 */
export function getEthereum() {
  if (typeof window === 'undefined') return null;

  if (window.ethereum) {
    // If multiple providers are injected (e.g., Coinbase Wallet + MetaMask)
    if (window.ethereum.providers?.length) {
      const metamaskProvider = window.ethereum.providers.find((p) => p.isMetaMask);
      return metamaskProvider || window.ethereum;
    }
    return window.ethereum;
  }
  return null;
}

/**
 * Checks whether MetaMask or an EIP-1193 compatible wallet is available.
 * @returns {boolean} True if installed.
 */
export function isMetaMaskInstalled() {
  const eth = getEthereum();
  const installed = Boolean(eth && eth.isMetaMask);
  walletState.isInstalled = installed;
  return installed;
}

/**
 * Connects to MetaMask by requesting accounts (eth_requestAccounts).
 * Does not store private keys. Interacts securely via browser provider.
 * @returns {Promise<{address: string, chainId: number, isCorrectNetwork: boolean}>}
 */
export async function connectWallet() {
  const eth = getEthereum();

  if (!eth) {
    const error = new Error('MetaMask is not installed. Please install the MetaMask browser extension to use DocuChain.');
    error.code = 'METAMASK_NOT_INSTALLED';
    throw error;
  }

  try {
    // Request account access from the user
    const accounts = await eth.request({ method: 'eth_requestAccounts' });

    if (!accounts || accounts.length === 0) {
      const error = new Error('No accounts authorized. Please select an account in MetaMask.');
      error.code = 'NO_ACCOUNTS';
      throw error;
    }

    const address = accounts[0];

    // Fetch current chain ID
    const chainIdHex = await eth.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    const isCorrectNetwork = (chainId === NETWORK_CONFIG.chainId);

    // Update state
    walletState.isConnected = true;
    walletState.address = address;
    walletState.chainId = chainId;
    walletState.isCorrectNetwork = isCorrectNetwork;

    // Trigger registered account change listeners
    notifyAccountChange(address);
    notifyNetworkChange(chainId, isCorrectNetwork);

    return {
      address,
      chainId,
      isCorrectNetwork,
    };
  } catch (err) {
    if (err.code === 4001) {
      const userRejectedErr = new Error('Connection request was rejected in MetaMask.');
      userRejectedErr.code = 'USER_REJECTED';
      throw userRejectedErr;
    }
    throw err;
  }
}

/**
 * Soft disconnects the frontend session.
 */
export function disconnectWallet() {
  walletState.isConnected = false;
  walletState.address = null;
  walletState.chainId = null;
  walletState.isCorrectNetwork = false;

  disconnectCallbacks.forEach((cb) => {
    try { cb(); } catch (e) { console.error('Error in disconnect callback:', e); }
  });
}

/**
 * Prompts MetaMask to switch to the required network.
 * If the network has not been added to MetaMask, prompts to add it.
 */
export async function switchNetwork() {
  const eth = getEthereum();
  if (!eth) throw new Error('MetaMask is not installed');

  try {
    // Attempt standard chain switch
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError) {
    // Error code 4902 indicates that the chain has not been added to MetaMask yet
    if (switchError.code === 4902) {
      try {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: NETWORK_CONFIG.chainIdHex,
              chainName: NETWORK_CONFIG.networkName,
              nativeCurrency: {
                name: NETWORK_CONFIG.currencyName,
                symbol: NETWORK_CONFIG.currencySymbol,
                decimals: NETWORK_CONFIG.currencyDecimals,
              },
              rpcUrls: NETWORK_CONFIG.rpcUrls,
              blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrl ? [NETWORK_CONFIG.blockExplorerUrl] : [],
            },
          ],
        });
        return true;
      } catch (addError) {
        if (addError.code === 4001) {
          throw new Error('Network addition rejected by user.');
        }
        throw addError;
      }
    } else if (switchError.code === 4001) {
      throw new Error('Network switch was rejected in MetaMask.');
    }
    throw switchError;
  }
}

/**
 * Formats a 42-character Ethereum address to shortened display format: 0x71C...92AB
 * @param {string} address - Full Ethereum address.
 * @returns {string} Shortened string.
 */
export function shortenAddress(address) {
  if (!address || typeof address !== 'string') return '';
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Registers a listener for account change events.
 * @param {Function} callback - Callback function(address).
 */
export function onAccountChange(callback) {
  if (typeof callback === 'function') accountChangeCallbacks.push(callback);
}

/**
 * Registers a listener for network / chain change events.
 * @param {Function} callback - Callback function(chainId, isCorrectNetwork).
 */
export function onNetworkChange(callback) {
  if (typeof callback === 'function') networkChangeCallbacks.push(callback);
}

/**
 * Registers a listener for session disconnect events.
 * @param {Function} callback - Callback function().
 */
export function onDisconnect(callback) {
  if (typeof callback === 'function') disconnectCallbacks.push(callback);
}

function notifyAccountChange(address) {
  accountChangeCallbacks.forEach((cb) => {
    try { cb(address); } catch (e) { console.error('Account change handler error:', e); }
  });
}

function notifyNetworkChange(chainId, isCorrect) {
  networkChangeCallbacks.forEach((cb) => {
    try { cb(chainId, isCorrect); } catch (e) { console.error('Network change handler error:', e); }
  });
}

/**
 * Initializes MetaMask event listeners (accountsChanged & chainChanged).
 * Called once during application boot.
 */
export function initWalletListeners() {
  const eth = getEthereum();
  if (!eth || !eth.on) return;

  // Account change listener
  eth.on('accountsChanged', (accounts) => {
    if (!accounts || accounts.length === 0) {
      // User locked MetaMask or removed all permissions
      disconnectWallet();
    } else {
      walletState.isConnected = true;
      walletState.address = accounts[0];
      notifyAccountChange(accounts[0]);
    }
  });

  // Chain change listener
  eth.on('chainChanged', (chainIdHex) => {
    const chainId = parseInt(chainIdHex, 16);
    const isCorrect = (chainId === NETWORK_CONFIG.chainId);

    walletState.chainId = chainId;
    walletState.isCorrectNetwork = isCorrect;
    notifyNetworkChange(chainId, isCorrect);
  });
}
