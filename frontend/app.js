/**
 * ============================================================================
 * DocuChain — Main Application Orchestration Module (app.js)
 * ============================================================================
 * 
 * Coordinates:
 * - wallet.js: MetaMask connection, account listeners, network changes.
 * - contract.js: Ethers.js v6 contract queries, transactions, event streams.
 * - documents.js: SHA-256 client-side hashing, registration, verification.
 * - config.js: Target network parameters and contract address validation.
 * 
 * ============================================================================
 */

import {
  walletState,
  isMetaMaskInstalled,
  connectWallet,
  disconnectWallet,
  switchNetwork,
  shortenAddress,
  onAccountChange,
  onNetworkChange,
  onDisconnect,
  initWalletListeners,
} from './js/wallet.js';

import {
  calculateDocumentHash,
  sanitizeAndValidateHash,
  formatBytes,
  formatTimestamp,
  executeDocumentRegistration,
  executeDocumentVerification,
  executeDocumentRevocation,
} from './js/documents.js';

import {
  fetchUserDocuments,
  fetchBlockchainActivityLogs,
} from './js/contract.js';

import {
  NETWORK_CONFIG,
  isContractConfigured,
  getExplorerTxUrl,
  getExplorerAddressUrl,
} from './config.js';

/* --------------------------------------------------------------------------
   DOM Element Selectors
   -------------------------------------------------------------------------- */
const DOM = {
  // Navigation & Network
  networkBanner: document.getElementById('networkBanner'),
  networkBannerText: document.getElementById('networkBannerText'),
  switchNetworkBtn: document.getElementById('switchNetworkBtn'),
  networkPill: document.getElementById('networkPill'),
  networkNameText: document.getElementById('networkNameText'),
  walletBtn: document.getElementById('walletBtn'),
  walletBtnText: document.getElementById('walletBtnText'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  menuToggle: document.getElementById('menuToggle'),
  navLinks: document.getElementById('navLinks'),

  // Registration Section
  registerForm: document.getElementById('registerForm'),
  docTitleInput: document.getElementById('docTitleInput'),
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('fileInput'),
  fileInfoCard: document.getElementById('fileInfoCard'),
  fileInfoName: document.getElementById('fileInfoName'),
  fileInfoSize: document.getElementById('fileInfoSize'),
  fileInfoType: document.getElementById('fileInfoType'),
  removeFileBtn: document.getElementById('removeFileBtn'),
  copyHashBtn: document.getElementById('copyHashBtn'),
  generatedHashDisplay: document.getElementById('generatedHashDisplay'),
  contractConfigNotice: document.getElementById('contractConfigNotice'),
  txStatusCard: document.getElementById('txStatusCard'),
  txStatusIndicator: document.getElementById('txStatusIndicator'),
  txStatusTitle: document.getElementById('txStatusTitle'),
  txStatusMessage: document.getElementById('txStatusMessage'),
  txHashRow: document.getElementById('txHashRow'),
  txHashLink: document.getElementById('txHashLink'),
  registerBtn: document.getElementById('registerBtn'),
  registerBtnText: document.getElementById('registerBtnText'),
  registerSpinner: document.getElementById('registerSpinner'),

  // Verification Section
  verifyTabFile: document.getElementById('verifyTabFile'),
  verifyTabHash: document.getElementById('verifyTabHash'),
  verifyFilePane: document.getElementById('verifyFilePane'),
  verifyHashPane: document.getElementById('verifyHashPane'),
  verifyDropZone: document.getElementById('verifyDropZone'),
  verifyFileInput: document.getElementById('verifyFileInput'),
  verifyFileInfo: document.getElementById('verifyFileInfo'),
  verifyFileName: document.getElementById('verifyFileName'),
  verifyFileSize: document.getElementById('verifyFileSize'),
  verifyComputedHash: document.getElementById('verifyComputedHash'),
  manualHashInput: document.getElementById('manualHashInput'),
  verifySubmitBtn: document.getElementById('verifySubmitBtn'),
  verifySubmitBtnText: document.getElementById('verifySubmitBtnText'),
  verifySpinner: document.getElementById('verifySpinner'),
  verifyResultCard: document.getElementById('verifyResultCard'),
  resultStatusHeader: document.getElementById('resultStatusHeader'),
  resultStatusIcon: document.getElementById('resultStatusIcon'),
  resultStatusTitle: document.getElementById('resultStatusTitle'),
  resultStatusSubtitle: document.getElementById('resultStatusSubtitle'),
  resultDocName: document.getElementById('resultDocName'),
  resultDocHash: document.getElementById('resultDocHash'),
  resultOwnerAddress: document.getElementById('resultOwnerAddress'),
  resultTimestamp: document.getElementById('resultTimestamp'),
  resultBlockchainStatus: document.getElementById('resultBlockchainStatus'),

  // My Documents Section
  refreshMyDocsBtn: document.getElementById('refreshMyDocsBtn'),
  myDocsDisconnected: document.getElementById('myDocsDisconnected'),
  myDocsConnectBtn: document.getElementById('myDocsConnectBtn'),
  myDocsLoading: document.getElementById('myDocsLoading'),
  myDocsEmpty: document.getElementById('myDocsEmpty'),
  myDocsTableWrapper: document.getElementById('myDocsTableWrapper'),
  myDocsTableBody: document.getElementById('myDocsTableBody'),

  // Blockchain Activity Section
  refreshEventsBtn: document.getElementById('refreshEventsBtn'),
  historyLoading: document.getElementById('historyLoading'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyEmptyText: document.getElementById('historyEmptyText'),
  historyListWrapper: document.getElementById('historyListWrapper'),

  // Revocation Modal
  revokeModal: document.getElementById('revokeModal'),
  modalDocTitle: document.getElementById('modalDocTitle'),
  modalDocHash: document.getElementById('modalDocHash'),
  cancelRevokeBtn: document.getElementById('cancelRevokeBtn'),
  confirmRevokeBtn: document.getElementById('confirmRevokeBtn'),
  confirmRevokeBtnText: document.getElementById('confirmRevokeBtnText'),
  revokeSpinner: document.getElementById('revokeSpinner'),

  // Toasts
  toastContainer: document.getElementById('toastContainer'),
};

/* --------------------------------------------------------------------------
   Local State Variables
   -------------------------------------------------------------------------- */
let registrationState = {
  selectedFile: null,
  calculatedHash: null,
};

let verificationState = {
  mode: 'FILE', // 'FILE' or 'HASH'
  selectedFile: null,
  calculatedHash: null,
};

let pendingRevocationHash = null;

/* --------------------------------------------------------------------------
   1. Initialization & Event Hookup
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initWalletListeners();
  setupEventListeners();
  checkContractConfigStatus();
});

/**
 * Initializes UI default state.
 */
function initUI() {
  if (!isMetaMaskInstalled()) {
    DOM.walletBtnText.textContent = 'Install MetaMask';
    DOM.networkNameText.textContent = 'MetaMask Required';
  }

  // Smooth scroll links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetElem = document.querySelector(targetId);
        if (targetElem) {
          e.preventDefault();
          targetElem.scrollIntoView({ behavior: 'smooth' });
          // Close mobile menu if open
          DOM.navLinks.classList.remove('mobile-open');
        }
      }
    });
  });
}

/**
 * Validates whether the contract address is configured and reveals a helpful banner if not.
 */
function checkContractConfigStatus() {
  if (!isContractConfigured()) {
    DOM.contractConfigNotice.classList.remove('hidden');
    DOM.historyEmptyText.textContent =
      'Contract address is not configured yet. Please insert your deployed contract address in config.js to fetch on-chain logs.';
  } else {
    DOM.contractConfigNotice.classList.add('hidden');
  }
}

/**
 * Binds all interactive DOM events.
 */
function setupEventListeners() {
  // Mobile nav toggle
  DOM.menuToggle.addEventListener('click', () => {
    DOM.navLinks.classList.toggle('mobile-open');
  });

  // Wallet Connection Button
  DOM.walletBtn.addEventListener('click', handleWalletButtonClick);
  DOM.myDocsConnectBtn.addEventListener('click', handleWalletButtonClick);
  DOM.disconnectBtn.addEventListener('click', handleDisconnectClick);
  DOM.switchNetworkBtn.addEventListener('click', handleSwitchNetworkClick);

  // Wallet Event Subscriptions
  onAccountChange(handleAccountChanged);
  onNetworkChange(handleNetworkChanged);
  onDisconnect(handleDisconnectedState);

  // Registration: File Upload & Drag-and-Drop
  setupDropZone(DOM.dropZone, DOM.fileInput, handleRegisterFileSelected);
  DOM.removeFileBtn.addEventListener('click', resetRegistrationFile);
  DOM.copyHashBtn.addEventListener('click', copyRegisteredHash);
  DOM.docTitleInput.addEventListener('input', updateRegisterButtonState);
  DOM.registerForm.addEventListener('submit', handleRegisterFormSubmit);

  // Verification: Tab Switching
  DOM.verifyTabFile.addEventListener('click', () => setVerificationMode('FILE'));
  DOM.verifyTabHash.addEventListener('click', () => setVerificationMode('HASH'));

  // Verification: File Upload & Manual Input
  setupDropZone(DOM.verifyDropZone, DOM.verifyFileInput, handleVerifyFileSelected);
  DOM.manualHashInput.addEventListener('input', handleManualHashInput);
  DOM.verifySubmitBtn.addEventListener('click', handleVerifySubmit);

  // My Documents & History Refreshes
  DOM.refreshMyDocsBtn.addEventListener('click', loadUserDocuments);
  DOM.refreshEventsBtn.addEventListener('click', loadBlockchainHistory);

  // Revocation Modal Buttons
  DOM.cancelRevokeBtn.addEventListener('click', closeRevocationModal);
  DOM.confirmRevokeBtn.addEventListener('click', handleConfirmRevocation);
}

/* --------------------------------------------------------------------------
   2. Wallet & Network Handlers
   -------------------------------------------------------------------------- */
async function handleWalletButtonClick() {
  if (!isMetaMaskInstalled()) {
    window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
    showToast('Please install MetaMask browser extension to continue.', 'warning');
    return;
  }

  try {
    DOM.walletBtn.disabled = true;
    DOM.walletBtnText.textContent = 'Connecting...';

    const accountData = await connectWallet();
    showToast(`Connected: ${shortenAddress(accountData.address)}`, 'success');
  } catch (err) {
    if (err.code === 'USER_REJECTED') {
      showToast('Connection request cancelled in MetaMask.', 'warning');
    } else {
      showToast(err.message || 'Failed to connect MetaMask.', 'error');
    }
  } finally {
    DOM.walletBtn.disabled = false;
  }
}

function handleDisconnectClick() {
  disconnectWallet();
  showToast('Frontend wallet session disconnected.', 'info');
}

async function handleSwitchNetworkClick() {
  try {
    DOM.switchNetworkBtn.disabled = true;
    DOM.switchNetworkBtn.textContent = 'Switching...';
    await switchNetwork();
    showToast(`Switched network to ${NETWORK_CONFIG.networkName}`, 'success');
  } catch (err) {
    showToast(err.message || 'Could not switch network.', 'error');
  } finally {
    DOM.switchNetworkBtn.disabled = false;
    DOM.switchNetworkBtn.textContent = 'Switch Network';
  }
}

function handleAccountChanged(address) {
  if (address) {
    DOM.walletBtn.classList.add('connected');
    DOM.walletBtnText.textContent = shortenAddress(address);
    DOM.disconnectBtn.classList.remove('hidden');

    DOM.myDocsDisconnected.classList.add('hidden');
    loadUserDocuments();
    loadBlockchainHistory();
  } else {
    handleDisconnectedState();
  }
}

function handleNetworkChanged(chainId, isCorrectNetwork) {
  DOM.networkPill.classList.remove('disconnected', 'connected', 'wrong-network');

  if (!walletState.isConnected) {
    DOM.networkPill.classList.add('disconnected');
    DOM.networkNameText.textContent = 'Not Connected';
    DOM.networkBanner.classList.add('hidden');
    return;
  }

  if (isCorrectNetwork) {
    DOM.networkPill.classList.add('connected');
    DOM.networkNameText.textContent = NETWORK_CONFIG.networkName;
    DOM.networkBanner.classList.add('hidden');
  } else {
    DOM.networkPill.classList.add('wrong-network');
    DOM.networkNameText.textContent = `Chain ID: ${chainId} (Unsupported)`;
    DOM.networkBanner.classList.remove('hidden');
    DOM.networkBannerText.textContent = `Unsupported Network (Chain ID ${chainId}). Please switch to ${NETWORK_CONFIG.networkName} (${NETWORK_CONFIG.chainId}).`;
  }
}

function handleDisconnectedState() {
  DOM.walletBtn.classList.remove('connected');
  DOM.walletBtnText.textContent = 'Connect Wallet';
  DOM.disconnectBtn.classList.add('hidden');

  DOM.networkPill.classList.remove('connected', 'wrong-network');
  DOM.networkPill.classList.add('disconnected');
  DOM.networkNameText.textContent = 'Not Connected';
  DOM.networkBanner.classList.add('hidden');

  // Reset My Documents
  DOM.myDocsDisconnected.classList.remove('hidden');
  DOM.myDocsLoading.classList.add('hidden');
  DOM.myDocsEmpty.classList.add('hidden');
  DOM.myDocsTableWrapper.classList.add('hidden');
}

/* --------------------------------------------------------------------------
   3. Document Registration Flow
   -------------------------------------------------------------------------- */
function setupDropZone(dropZoneElem, inputElem, onFileCallback) {
  // Click to trigger file selection
  dropZoneElem.addEventListener('click', (e) => {
    if (e.target !== inputElem) {
      inputElem.click();
    }
  });

  inputElem.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileCallback(e.target.files[0]);
    }
  });

  // Drag-and-drop visual states
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZoneElem.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZoneElem.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZoneElem.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZoneElem.classList.remove('dragover');
    });
  });

  dropZoneElem.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      onFileCallback(dt.files[0]);
    }
  });
}

async function handleRegisterFileSelected(file) {
  try {
    registrationState.selectedFile = file;

    // Show metadata preview
    DOM.fileInfoName.textContent = file.name;
    DOM.fileInfoSize.textContent = formatBytes(file.size);
    DOM.fileInfoType.textContent = file.type || 'Binary / Document';
    DOM.generatedHashDisplay.textContent = 'Generating cryptographic SHA-256 fingerprint in browser memory...';
    DOM.fileInfoCard.classList.remove('hidden');

    // Auto-populate document title if empty
    if (!DOM.docTitleInput.value.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      DOM.docTitleInput.value = cleanName;
    }

    // Cryptographic calculation using native Web Crypto API
    const hash = await calculateDocumentHash(file);
    registrationState.calculatedHash = hash;

    DOM.generatedHashDisplay.textContent = hash;
    updateRegisterButtonState();
    showToast('SHA-256 fingerprint generated locally.', 'success');
  } catch (err) {
    showToast(err.message || 'Error processing document.', 'error');
    resetRegistrationFile();
  }
}

function resetRegistrationFile() {
  registrationState.selectedFile = null;
  registrationState.calculatedHash = null;
  DOM.fileInput.value = '';
  DOM.fileInfoCard.classList.add('hidden');
  DOM.generatedHashDisplay.textContent = '—';
  updateRegisterButtonState();
}

function copyRegisteredHash() {
  if (!registrationState.calculatedHash) return;
  navigator.clipboard.writeText(registrationState.calculatedHash).then(() => {
    showToast('SHA-256 Hash copied to clipboard.', 'info');
  }).catch(() => {
    showToast('Failed to copy hash to clipboard.', 'error');
  });
}

function updateRegisterButtonState() {
  const hasFileAndHash = Boolean(registrationState.selectedFile && registrationState.calculatedHash);
  const hasTitle = Boolean(DOM.docTitleInput.value.trim());

  DOM.registerBtn.disabled = !(hasFileAndHash && hasTitle);
}

async function handleRegisterFormSubmit(e) {
  e.preventDefault();

  const title = DOM.docTitleInput.value.trim();
  const hash = registrationState.calculatedHash;

  if (!title || !hash) {
    showToast('Please select a file and enter a document title.', 'warning');
    return;
  }

  // Check if wallet is connected
  if (!walletState.isConnected) {
    showToast('Please connect your MetaMask wallet before registering.', 'warning');
    await handleWalletButtonClick();
    return;
  }

  // Check network
  if (!walletState.isCorrectNetwork) {
    showToast(`Please switch MetaMask to ${NETWORK_CONFIG.networkName} to submit transactions.`, 'warning');
    return;
  }

  // Check contract address configuration
  if (!isContractConfigured()) {
    showToast('Contract address is not set in config.js. Please provide a deployed address.', 'error');
    DOM.contractConfigNotice.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Prepare UI for transaction lifecycle
  setRegisterLoading(true, 'Initiating Transaction...');
  updateTxStatusCard('state-pending', 'Preparing Transaction', 'Waiting for wallet approval in MetaMask...');

  try {
    const receipt = await executeDocumentRegistration(hash, title, {
      onStateChange: (state, message, txHash) => {
        if (state === 'WAITING_APPROVAL') {
          updateTxStatusCard('state-pending', 'Awaiting Signature', message);
        } else if (state === 'TRANSACTION_PENDING') {
          updateTxStatusCard('state-pending', 'Mining Transaction', message, txHash);
        } else if (state === 'TRANSACTION_CONFIRMED') {
          updateTxStatusCard('state-confirmed', 'Transaction Confirmed', message, txHash);
        }
      },
    });

    showToast('Document successfully registered on blockchain!', 'success');

    // Refresh history and user documents
    loadUserDocuments();
    loadBlockchainHistory();
  } catch (err) {
    updateTxStatusCard('state-failed', 'Transaction Failed', err.message);
    showToast(err.message || 'Registration failed.', 'error');
  } finally {
    setRegisterLoading(false);
  }
}

function setRegisterLoading(isLoading, buttonText = 'Register Document on Blockchain') {
  DOM.registerBtn.disabled = isLoading;
  if (isLoading) {
    DOM.registerSpinner.classList.remove('hidden');
    DOM.registerBtnText.textContent = buttonText;
  } else {
    DOM.registerSpinner.classList.add('hidden');
    DOM.registerBtnText.textContent = 'Register Document on Blockchain';
    updateRegisterButtonState();
  }
}

function updateTxStatusCard(stateClass, title, message, txHash = null) {
  DOM.txStatusCard.classList.remove('hidden', 'state-ready', 'state-pending', 'state-confirmed', 'state-failed');
  DOM.txStatusCard.classList.add(stateClass);
  DOM.txStatusTitle.textContent = title;
  DOM.txStatusMessage.textContent = message;

  if (txHash) {
    DOM.txHashRow.classList.remove('hidden');
    DOM.txHashLink.textContent = `${txHash.substring(0, 14)}...${txHash.substring(txHash.length - 8)}`;
    DOM.txHashLink.href = getExplorerTxUrl(txHash);
  } else {
    DOM.txHashRow.classList.add('hidden');
  }
}

/* --------------------------------------------------------------------------
   4. Document Verification Flow
   -------------------------------------------------------------------------- */
function setVerificationMode(mode) {
  verificationState.mode = mode;
  if (mode === 'FILE') {
    DOM.verifyTabFile.classList.add('active');
    DOM.verifyTabFile.setAttribute('aria-selected', 'true');
    DOM.verifyTabHash.classList.remove('active');
    DOM.verifyTabHash.setAttribute('aria-selected', 'false');

    DOM.verifyFilePane.classList.remove('hidden');
    DOM.verifyHashPane.classList.add('hidden');

    DOM.verifySubmitBtn.disabled = !verificationState.calculatedHash;
  } else {
    DOM.verifyTabHash.classList.add('active');
    DOM.verifyTabHash.setAttribute('aria-selected', 'true');
    DOM.verifyTabFile.classList.remove('active');
    DOM.verifyTabFile.setAttribute('aria-selected', 'false');

    DOM.verifyHashPane.classList.remove('hidden');
    DOM.verifyFilePane.classList.add('hidden');

    handleManualHashInput();
  }
}

async function handleVerifyFileSelected(file) {
  try {
    verificationState.selectedFile = file;

    DOM.verifyFileName.textContent = file.name;
    DOM.verifyFileSize.textContent = formatBytes(file.size);
    DOM.verifyComputedHash.textContent = 'Calculating SHA-256 fingerprint...';
    DOM.verifyFileInfo.classList.remove('hidden');

    const hash = await calculateDocumentHash(file);
    verificationState.calculatedHash = hash;
    DOM.verifyComputedHash.textContent = hash;

    DOM.verifySubmitBtn.disabled = false;
    showToast('File hashed. Ready to query blockchain ledger.', 'info');
  } catch (err) {
    showToast(err.message || 'Error hashing verification file.', 'error');
  }
}

function handleManualHashInput() {
  const val = DOM.manualHashInput.value.trim();
  try {
    if (val.length >= 64) {
      sanitizeAndValidateHash(val);
      DOM.verifySubmitBtn.disabled = false;
    } else {
      DOM.verifySubmitBtn.disabled = true;
    }
  } catch {
    DOM.verifySubmitBtn.disabled = true;
  }
}

async function handleVerifySubmit() {
  let targetHash;

  if (verificationState.mode === 'FILE') {
    targetHash = verificationState.calculatedHash;
  } else {
    try {
      targetHash = sanitizeAndValidateHash(DOM.manualHashInput.value);
    } catch (err) {
      showToast(err.message, 'warning');
      return;
    }
  }

  if (!targetHash) {
    showToast('Please provide a document file or SHA-256 hash.', 'warning');
    return;
  }

  if (!isContractConfigured()) {
    showToast('Smart contract is not configured in config.js. Cannot verify.', 'error');
    DOM.contractConfigNotice.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  try {
    DOM.verifySubmitBtn.disabled = true;
    DOM.verifySpinner.classList.remove('hidden');
    DOM.verifySubmitBtnText.textContent = 'Querying Smart Contract...';

    const result = await executeDocumentVerification(targetHash);
    renderVerificationResult(result);
    showToast(`Verification complete: ${result.status}`, 'info');
  } catch (err) {
    showToast(err.message || 'Verification failed.', 'error');
  } finally {
    DOM.verifySubmitBtn.disabled = false;
    DOM.verifySpinner.classList.add('hidden');
    DOM.verifySubmitBtnText.textContent = 'Query Blockchain Ledger';
  }
}

function renderVerificationResult(result) {
  DOM.verifyResultCard.classList.remove('hidden');
  DOM.resultStatusHeader.classList.remove('state-verified', 'state-not-verified', 'state-revoked');

  if (result.status === 'VERIFIED') {
    DOM.resultStatusHeader.classList.add('state-verified');
    DOM.resultStatusIcon.textContent = '✓';
    DOM.resultStatusTitle.textContent = 'DOCUMENT AUTHENTIC & VERIFIED';
    DOM.resultStatusSubtitle.textContent = 'Valid cryptographically sealed record discovered on the Ethereum blockchain.';

    DOM.resultDocName.textContent = result.details.name || 'Registered Document';
    DOM.resultDocHash.textContent = result.details.hash;
    DOM.resultOwnerAddress.innerHTML = `<a href="${getExplorerAddressUrl(result.details.owner)}" target="_blank" class="tx-hash-link">${result.details.owner}</a>`;
    DOM.resultTimestamp.textContent = formatTimestamp(result.details.timestamp);

    DOM.resultBlockchainStatus.className = 'status-tag tag-active';
    DOM.resultBlockchainStatus.textContent = 'Active & Tamper-Proof';
  } else if (result.status === 'NOT_VERIFIED') {
    DOM.resultStatusHeader.classList.add('state-not-verified');
    DOM.resultStatusIcon.textContent = '?';
    DOM.resultStatusTitle.textContent = 'NO BLOCKCHAIN RECORD FOUND';
    DOM.resultStatusSubtitle.textContent = 'This document hash has not been registered on this contract or the file has been modified.';

    DOM.resultDocName.textContent = 'Not Registered';
    DOM.resultDocHash.textContent = result.details.hash;
    DOM.resultOwnerAddress.textContent = 'N/A';
    DOM.resultTimestamp.textContent = 'N/A';

    DOM.resultBlockchainStatus.className = 'status-tag';
    DOM.resultBlockchainStatus.style.backgroundColor = '#FEF3C7';
    DOM.resultBlockchainStatus.style.color = '#B45309';
    DOM.resultBlockchainStatus.textContent = 'Unregistered';
  } else if (result.status === 'REVOKED') {
    DOM.resultStatusHeader.classList.add('state-revoked');
    DOM.resultStatusIcon.textContent = '✕';
    DOM.resultStatusTitle.textContent = 'DOCUMENT REVOKED';
    DOM.resultStatusSubtitle.textContent = 'A matching record exists, but was officially REVOKED by the owner.';

    DOM.resultDocName.textContent = result.details.name || 'Document';
    DOM.resultDocHash.textContent = result.details.hash;
    DOM.resultOwnerAddress.innerHTML = `<a href="${getExplorerAddressUrl(result.details.owner)}" target="_blank" class="tx-hash-link">${result.details.owner}</a>`;
    DOM.resultTimestamp.textContent = formatTimestamp(result.details.timestamp);

    DOM.resultBlockchainStatus.className = 'status-tag tag-revoked';
    DOM.resultBlockchainStatus.textContent = 'Revoked by Owner';
  }

  DOM.verifyResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* --------------------------------------------------------------------------
   5. My Documents Section
   -------------------------------------------------------------------------- */
async function loadUserDocuments() {
  if (!walletState.isConnected || !walletState.address) {
    DOM.myDocsDisconnected.classList.remove('hidden');
    DOM.myDocsLoading.classList.add('hidden');
    DOM.myDocsEmpty.classList.add('hidden');
    DOM.myDocsTableWrapper.classList.add('hidden');
    return;
  }

  DOM.myDocsDisconnected.classList.add('hidden');
  DOM.myDocsLoading.classList.remove('hidden');
  DOM.myDocsEmpty.classList.add('hidden');
  DOM.myDocsTableWrapper.classList.add('hidden');

  try {
    const docs = await fetchUserDocuments(walletState.address);

    DOM.myDocsLoading.classList.add('hidden');

    if (!docs || docs.length === 0) {
      DOM.myDocsEmpty.classList.remove('hidden');
    } else {
      DOM.myDocsTableWrapper.classList.remove('hidden');
      renderUserDocumentsTable(docs);
    }
  } catch (err) {
    DOM.myDocsLoading.classList.add('hidden');
    showToast(err.message || 'Failed to fetch user documents.', 'error');
  }
}

function renderUserDocumentsTable(docs) {
  DOM.myDocsTableBody.innerHTML = '';

  docs.forEach((doc) => {
    const row = document.createElement('tr');

    const statusBadge = doc.isRevoked
      ? `<span class="status-tag tag-revoked">Revoked</span>`
      : `<span class="status-tag tag-active">Active</span>`;

    const revokeAction = (!doc.isRevoked && doc.owner.toLowerCase() === walletState.address.toLowerCase())
      ? `<button class="btn-action-icon btn-action-danger" data-action="revoke" data-hash="${doc.hash}" data-name="${encodeURIComponent(doc.name)}" type="button">Revoke</button>`
      : '';

    row.innerHTML = `
      <td>
        <span class="table-doc-title">${escapeHtml(doc.name)}</span>
      </td>
      <td>
        <span class="table-hash-cell">${shortenAddress(doc.hash)}</span>
        <button class="btn-copy" data-action="copy" data-hash="${doc.hash}" type="button" title="Copy full hash">📋</button>
      </td>
      <td>${formatTimestamp(doc.timestamp)}</td>
      <td>${statusBadge}</td>
      <td class="text-right">
        <div class="table-actions">
          <button class="btn-action-icon" data-action="verify" data-hash="${doc.hash}" type="button">Verify</button>
          ${revokeAction}
        </div>
      </td>
    `;

    DOM.myDocsTableBody.appendChild(row);
  });

  // Attach action button events on the table
  DOM.myDocsTableBody.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const hash = btn.dataset.hash;
      const name = decodeURIComponent(btn.dataset.name || '');

      if (action === 'copy') {
        navigator.clipboard.writeText(hash).then(() => showToast('Hash copied to clipboard.', 'info'));
      } else if (action === 'verify') {
        setVerificationMode('HASH');
        DOM.manualHashInput.value = hash;
        DOM.verifySubmitBtn.disabled = false;
        document.getElementById('verify-section').scrollIntoView({ behavior: 'smooth' });
        handleVerifySubmit();
      } else if (action === 'revoke') {
        openRevocationModal(hash, name);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   6. Revocation Flow & Modal
   -------------------------------------------------------------------------- */
function openRevocationModal(hash, docName) {
  pendingRevocationHash = hash;
  DOM.modalDocTitle.textContent = docName || 'Untitled Document';
  DOM.modalDocHash.textContent = hash;
  DOM.revokeModal.classList.remove('hidden');
}

function closeRevocationModal() {
  pendingRevocationHash = null;
  DOM.revokeModal.classList.add('hidden');
}

async function handleConfirmRevocation() {
  if (!pendingRevocationHash) return;

  try {
    DOM.confirmRevokeBtn.disabled = true;
    DOM.revokeSpinner.classList.remove('hidden');
    DOM.confirmRevokeBtnText.textContent = 'Awaiting Approval...';

    await executeDocumentRevocation(pendingRevocationHash, {
      onStateChange: (state, message) => {
        if (state === 'TRANSACTION_PENDING') {
          DOM.confirmRevokeBtnText.textContent = 'Mining Block...';
        }
      },
    });

    showToast('Document revoked successfully.', 'success');
    closeRevocationModal();

    // Reload documents table and feed
    loadUserDocuments();
    loadBlockchainHistory();
  } catch (err) {
    showToast(err.message || 'Revocation failed.', 'error');
  } finally {
    DOM.confirmRevokeBtn.disabled = false;
    DOM.revokeSpinner.classList.add('hidden');
    DOM.confirmRevokeBtnText.textContent = 'Confirm Revocation';
  }
}

/* --------------------------------------------------------------------------
   7. Blockchain History Feed
   -------------------------------------------------------------------------- */
async function loadBlockchainHistory() {
  if (!isContractConfigured()) {
    DOM.historyLoading.classList.add('hidden');
    DOM.historyEmpty.classList.remove('hidden');
    DOM.historyListWrapper.classList.add('hidden');
    return;
  }

  DOM.historyLoading.classList.remove('hidden');
  DOM.historyEmpty.classList.add('hidden');
  DOM.historyListWrapper.classList.add('hidden');

  try {
    const logs = await fetchBlockchainActivityLogs(15);
    DOM.historyLoading.classList.add('hidden');

    if (!logs || logs.length === 0) {
      DOM.historyEmpty.classList.remove('hidden');
      DOM.historyEmptyText.textContent = 'No event logs found on the smart contract yet. Register a document to create an event!';
    } else {
      DOM.historyListWrapper.classList.remove('hidden');
      renderBlockchainHistory(logs);
    }
  } catch (err) {
    DOM.historyLoading.classList.add('hidden');
    DOM.historyEmpty.classList.remove('hidden');
    DOM.historyEmptyText.textContent = `Error querying logs: ${err.message}`;
  }
}

function renderBlockchainHistory(logs) {
  DOM.historyListWrapper.innerHTML = '';

  logs.forEach((log) => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const isReg = log.type === 'REGISTER';
    const iconBadgeClass = isReg ? 'event-register' : 'event-revoke';
    const iconSymbol = isReg ? '📝' : '🚫';
    const eventLabel = isReg ? 'Document Registered' : 'Document Revoked';

    card.innerHTML = `
      <div class="history-main">
        <div class="history-icon-badge ${iconBadgeClass}">${iconSymbol}</div>
        <div class="history-info">
          <div class="history-event-name">${eventLabel}: <strong>${escapeHtml(log.name)}</strong></div>
          <div class="history-hash" title="${log.docHash}">Hash: ${log.docHash}</div>
          <div class="history-hash" style="font-size: 0.775rem;">By: ${log.owner}</div>
        </div>
      </div>
      <div class="history-meta">
        <div class="history-block">Block #${log.blockNumber}</div>
        <div class="history-time">${formatTimestamp(log.timestamp)}</div>
        <a href="${getExplorerTxUrl(log.txHash)}" target="_blank" rel="noopener noreferrer" class="history-explorer-link">
          View on Explorer ↗
        </a>
      </div>
    `;

    DOM.historyListWrapper.appendChild(card);
  });
}

/* --------------------------------------------------------------------------
   8. Utility Functions
   -------------------------------------------------------------------------- */
/**
 * Displays an ephemeral toast message in the bottom-right corner.
 * @param {string} message - Message text.
 * @param {'info'|'success'|'warning'|'error'} type - Toast variant.
 * @param {number} duration - Milliseconds before auto-dismissal.
 */
function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  toast.innerHTML = `
    <span>${iconMap[type] || 'ℹ️'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
