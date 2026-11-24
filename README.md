# DocuChain — Blockchain-Based Document Registration & Verification System

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat&logo=solidity)](https://soliditylang.org/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-v6.13-2535a0?style=flat&logo=ethereum)](https://docs.ethers.org/v6/)
[![MetaMask](https://img.shields.io/badge/MetaMask-EIP--1193-E2761B?style=flat&logo=metamask)](https://metamask.io/)
[![Web Crypto](https://img.shields.io/badge/Web_Crypto_API-SHA--256-2e8b6e?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

> **Academic Capstone Project**  
> **Course:** Computer Engineering — 3rd Year Capstone Project  
> **Project Title:** Blockchain-Based Document Registration and Verification System  
> **Application Name:** **DocuChain**  
> **Design Language:** Commercial Minimalist SaaS (Inspired by KeyNest)

---

## 1. Project Overview & Architectural Summary

In traditional document verification, organizations rely on centralized authorities, physical stamps, or proprietary databases that represent single points of failure, vulnerable to tampering, unauthorized modification, or service outages.

**DocuChain** provides a decentralized, tamper-proof, cryptographic proof-of-existence system for digital documents using the Ethereum blockchain.

### Core Security Principle: Zero Raw File Storage
> [!IMPORTANT]
> **The original document is NEVER uploaded, transmitted, or stored on the blockchain or any central server.**
>
> 1. The document is processed **entirely client-side** in browser memory using the native **Web Crypto API**.
> 2. A unique **256-bit SHA-256 cryptographic digest** is computed.
> 3. Only this 32-byte hash (`bytes32`), along with user-specified metadata (title, owner address, block timestamp), is anchored into the Ethereum smart contract.
> 4. Anyone holding a candidate document can verify its integrity by recalculating the hash. If even a single punctuation mark or pixel in the file was altered, the resulting hash completely changes (avalanche effect), causing verification to fail.

---

## 2. Visual Design Reference & Aesthetic Direction

The user interface follows the clean, spacious, commercial SaaS design language inspired by **KeyNest**:

| Visual Element | Specification / Hex Value | Usage in DocuChain |
| :--- | :--- | :--- |
| **Page Background** | `#EFF4F0` (Pale Sage-Green) | Full-page soothing, premium canvas |
| **Card Surfaces** | `#FFFFFF` (Crisp Off-White) | Elevated interactive cards, modal windows |
| **Typography** | `#1A221E` (Dark Charcoal) | Headings, primary text, high readability |
| **Accent Primary** | `#288165` (Muted Teal-Green) | Rounded primary action buttons (`btn-primary`), status pills |
| **Accent Secondary**| `#FFFFFF` + `#D2DDD6` border | Pill buttons (`btn-secondary`), subtle contrast |
| **Highlight Box** | `#FEF3C7` (Pale Warm Yellow) | Highlight behind `"Blockchain."` in hero heading |
| **Status Verified** | `#E8F8F1` bg, `#1F7A59` text | Verified document banner & badge |
| **Status Warning** | `#FEF3C7` bg, `#B45309` text | Unregistered hash indicator & network warnings |
| **Status Revoked** | `#FEE2E2` bg, `#B91C1C` text | Revoked certificate warning badge |

---

## 3. System Architecture & Component Interactions

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|                                                                                   |
|   +--------------------------+                  +-----------------------------+   |
|   |   Document File (PDF,    |                  |      Web Crypto API         |   |
|   |   DOCX, PNG, etc.)       |  ------------->  |   crypto.subtle.digest()    |   |
|   +--------------------------+                  |     (Local SHA-256)         |   |
|                                                 +--------------+--------------+   |
|                                                                |                  |
|                                                                v                  |
|                                                 +-----------------------------+   |
|                                                 |   32-Byte Hash (bytes32)    |   |
|                                                 | 0x8f3c7e4a...92b50d1e67a4c9 |   |
|                                                 +--------------+--------------+   |
+----------------------------------------------------------------|------------------+
                                                                 |
                                                                 v
+-----------------------------------------------------------------------------------+
|                             METAMASK WALLET (EIP-1193)                            |
|                                                                                   |
|   - window.ethereum provider                                                      |
|   - eth_requestAccounts (Account Authorization)                                   |
|   - eth_chainId & wallet_switchEthereumChain (Network Validation)                 |
|   - Cryptographic transaction signing & gas approval                              |
+----------------------------------------------------------------|------------------+
                                                                 |
                                                                 v
+-----------------------------------------------------------------------------------+
|                               ETHERS.JS (v6.13.4)                                 |
|                                                                                   |
|   - BrowserProvider(window.ethereum)                                              |
|   - provider.getSigner() -> JsonRpcSigner                                         |
|   - new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, runner)                          |
|   - contract.registerDocument(hash, title) / contract.verifyDocument(hash)        |
+----------------------------------------------------------------|------------------+
                                                                 |
                                                                 v
+-----------------------------------------------------------------------------------+
|                       ETHEREUM BLOCKCHAIN (Sepolia / Localhost)                   |
|                                                                                   |
|   - Solidity Smart Contract (DocuChain.sol)                                       |
|   - Storage: mapping(bytes32 => Document)                                         |
|   - Immutable Block Sealing & Timestamping                                        |
|   - Emits events: DocumentRegistered, DocumentRevoked                             |
+-----------------------------------------------------------------------------------+
```

---

## 4. Directory Structure & File Responsibilities

```
blockchain/
│
├── contracts/
│   └── DocuChain.sol              # Complete, gas-optimized Solidity smart contract
│
├── frontend/
│   ├── index.html                 # Landing page
│   ├── how-it-works.html          # Architecture and workflow page
│   ├── register.html              # Document registration page
│   ├── verify.html                # Document verification page
│   ├── documents.html             # Connected wallet document portfolio
│   ├── history.html               # Public blockchain activity feed
│   ├── style.css                  # KeyNest-inspired CSS stylesheet & responsive breakpoints
│   ├── app.js                     # Shared application behavior across pages
│   ├── config.js                  # Contract address, ABI array, and network presets
│   │
│   ├── assets/
│   │   ├── logo.svg               # Bespoke DocuChain brand logo
│   │   └── illustrations/
│   │       └── hero-graphic.svg   # Custom SVG security & certificate visual
│   │
│   └── js/
│       ├── wallet.js              # MetaMask EIP-1193 connection, events, network checks
│       ├── contract.js            # Ethers.js v6 provider, signer, read/write contract calls
│       └── documents.js           # Web Crypto SHA-256 calculation, registration & verification
│
├── run.bat                        # One-click Windows server launcher
├── run.py                         # Cross-platform Python 3 HTTP development server
├── serve.ps1                      # PowerShell local HTTP server script
└── README.md                      # Complete academic project documentation & viva guide
```

### Detailed File Responsibilities

1. **Frontend pages**:
   - `index.html` is the product landing page; each application feature has a dedicated page linked from the shared navigation.
   - `how-it-works.html` explains the three-step workflow.
   - `register.html` provides drag-and-drop document registration.
   - `verify.html` supports verification by file or manual hash; document shortcuts can open it with a prefilled hash.
   - `documents.html` shows documents registered by the connected wallet and supports revocation.
   - `history.html` displays public blockchain activity.
   - Each page shares the wallet/network controls and loads `app.js`, which initializes only controls available on that page.

2. **`frontend/style.css`**:
   - Implements KeyNest design tokens: pale sage-green `#EFF4F0`, soft off-white cards, dark charcoal typography, rounded pill buttons, soft yellow highlight tag.
   - Custom drag-and-drop zone with animated hover transitions.
   - Responsive breakpoints for mobile (320px+), tablet (768px), and desktop (1024px+).

3. **`frontend/config.js`**:
   - Houses `CONTRACT_ADDRESS`, `CONTRACT_ABI`, and `NETWORK_CONFIG`.
   - Pre-configured for **Ethereum Sepolia Testnet** (Chain ID `11155111`).
   - Includes helper functions: `isContractConfigured()`, `getExplorerTxUrl()`.

4. **`frontend/js/wallet.js`**:
   - Strict EIP-1193 compliance (`window.ethereum`).
   - Handles `eth_requestAccounts`, `accountsChanged`, `chainChanged`.
   - Programmatically switches or prompts adding the Sepolia testnet (`wallet_switchEthereumChain`).
   - Never requests wallet permissions automatically on page load.

5. **`frontend/js/contract.js`**:
   - Uses strict **Ethers.js v6** syntax (`ethers.BrowserProvider`, `provider.getSigner()`, `new ethers.Contract`).
   - Separates read-only provider calls (`verifyDocument`, `getUserDocuments`) from signer write transactions (`registerDocument`, `revokeDocument`).
   - Queries historical contract event logs (`contract.queryFilter`) for real-time auditability.
   - Maps technical RPC and contract errors into user-friendly messages.

6. **`frontend/js/documents.js`**:
   - Local cryptographic hashing via `crypto.subtle.digest('SHA-256', arrayBuffer)`.
   - Formats digests to standard 66-character lowercase Ethereum `bytes32` strings (`0x...`).
   - Manages state transitions: Ready, Generating Hash, Awaiting Approval, Mining, Confirmed, Failed.
   - Categorizes verification responses into: `VERIFIED`, `NOT_VERIFIED`, and `REVOKED`.

---

## 5. Smart Contract Deployment Guide (Remix IDE)

To connect the frontend to a real live blockchain, follow these simple steps using the Ethereum Sepolia testnet:

### Step 1: Open Remix IDE
Open [https://remix.ethereum.org](https://remix.ethereum.org) in your browser.

### Step 2: Create Contract File
1. In the Remix File Explorer, create a new file named `DocuChain.sol`.
2. Copy the entire contents of [`contracts/DocuChain.sol`](contracts/DocuChain.sol) into the file.

### Step 3: Compile Contract
1. Navigate to the **Solidity Compiler** tab (left sidebar).
2. Set Compiler Version to `0.8.20` or higher.
3. Click **Compile DocuChain.sol**.

### Step 4: Deploy via MetaMask to Sepolia
1. Ensure your MetaMask browser extension is set to the **Sepolia Testnet**.  
   *(If you need free Sepolia ETH, get some from Google Cloud Web3 Faucet or sepoliafaucet.com).*
2. Go to the **Deploy & Run Transactions** tab in Remix.
3. In the **Environment** dropdown, select **Injected Provider - MetaMask**.
4. Confirm that MetaMask connects to Remix and shows your Sepolia account.
5. Click **Deploy**.
6. MetaMask will pop up; click **Confirm**.

### Step 5: Configure the Frontend
1. Under **Deployed Contracts** in Remix, copy the contract address (e.g., `0x71C...92AB`).
2. Open [`frontend/config.js`](frontend/config.js).
3. Paste the address into `CONTRACT_ADDRESS`:
   ```javascript
   export const CONTRACT_ADDRESS = "0xYourDeployedContractAddressHere";
   ```
4. Save the file, then serve the `frontend` folder over HTTP (see the next section) and reload the page.
5. Keep MetaMask on Sepolia and connect it in the app. The configured chain in `config.js` must match the network where you deployed the contract.

Remix deploys the Solidity contract; it does not host or directly attach the website. The frontend talks to the deployed address through MetaMask and Ethers.js.

---

## 6. How to Run the Frontend Locally

Because DocuChain uses standard JavaScript ES Modules (`import`/`export`), browsers require files to be served via HTTP/HTTPS (not `file://`).

### Option A: Using the Included Launcher (Recommended)
Double-click `run.bat` in the project root, or execute:
```powershell
python run.py
```
This automatically starts a local server at `http://localhost:3000/` and launches your default browser.

### Option B: Using VS Code Live Server
1. Open this `blockchain` directory in Visual Studio Code.
2. If you have the "Live Server" extension installed, right-click `frontend/index.html` and select **"Open with Live Server"**.

### Option C: Using Node.js npx serve
```bash
npx serve frontend
```

---

## 7. Comprehensive Testing & Demonstration Checklist

| Test ID | Test Case | Expected Behavior | Verification Status |
| :--- | :--- | :--- | :--- |
| **TEST 01** | Website initial load | Modern KeyNest-style UI loads with pale sage background, typography, and assets | Verified |
| **TEST 02** | Navigation & Smooth Scrolling | Clicking nav links smoothly scrolls to respective sections; mobile drawer toggles | Verified |
| **TEST 03** | Responsive Design | Layout adapts cleanly across 375px mobile, 768px tablet, and 1440px desktop displays | Verified |
| **TEST 04** | MetaMask Detection | Detects whether MetaMask is installed; prompts install link if missing | Verified |
| **TEST 05** | Wallet Connection | Clicking "Connect Wallet" triggers `eth_requestAccounts` popup; displays address | Verified |
| **TEST 06** | Shortened Address Display | Shows `0x71C...92AB` with status dot and disconnect session option | Verified |
| **TEST 07** | Network Validation | Detects Sepolia (Chain ID `11155111`); shows warning banner and switch button if wrong | Verified |
| **TEST 08** | Document File Selection | Drag-and-drop or file selector loads PDF/image/text file and displays metadata | Verified |
| **TEST 09** | SHA-256 Hashing | Web Crypto API computes in-memory hash instantly; displays 66-character bytes32 hex | Verified |
| **TEST 10** | On-Chain Registration | Calls contract `registerDocument()`; opens MetaMask transaction prompt | Live on deployment |
| **TEST 11** | Transaction Confirmation | Detects `tx.wait(1)` block receipt; displays Etherscan link and success toast | Live on deployment |
| **TEST 12** | Document Verification | Queries `verifyDocument()`; displays VERIFIED, NOT VERIFIED, or REVOKED card | Live on deployment |
| **TEST 13** | My Documents List | Reads contract records/events for connected account; displays table | Live on deployment |
| **TEST 14** | Document Revocation | Opens confirmation modal; owner approves gas tx; marks document revoked | Live on deployment |
| **TEST 15** | Error Handling | Gracefully handles rejected transactions, insufficient gas, or empty inputs | Verified |

---

## 8. College Viva & Technical Interview Questions

Prepare for your project viva and external examination with these detailed answers:

### Q1: Why do we store only the SHA-256 hash on Ethereum rather than the document itself?
> **Answer:** Storing raw files (like a 2MB PDF) directly on Ethereum is technically and economically impractical. Every byte stored in contract storage costs gas (`SSTORE` opcode costs 20,000 gas per 32-byte word). A 2MB file would cost thousands of dollars in gas fees and bloat the blockchain state. Furthermore, storing raw documents on a public ledger destroys user privacy. Storing only the 32-byte SHA-256 cryptographic digest guarantees 100% privacy, costs negligible gas, and offers mathematically irreversible tamper-detection.

### Q2: What is the avalanche effect in SHA-256 hashing?
> **Answer:** The avalanche effect is a key property of cryptographic hash functions where altering even a single bit in the input data results in an unrecognizable and uncorrelated output hash (typically >50% of the bits flip). In DocuChain, if someone alters even one comma or pixel in an authenticated certificate, the recalculated SHA-256 hash will not match the registered hash on the blockchain, and verification fails instantly.

### Q3: What is the difference between Ethers.js v5 and Ethers.js v6?
> **Answer:** Ethers.js v6 introduced modern JavaScript class structures, cleaner imports, and native `BigInt` support (replacing `BigNumber`). In v5, web providers were initialized via `new ethers.providers.Web3Provider(window.ethereum)`. In v6, this is modernized to `new ethers.BrowserProvider(window.ethereum)`. Furthermore, `getSigner()` in v6 is an asynchronous method returning a `JsonRpcSigner`, and utility functions like `ethers.formatEther` and `ethers.keccak256` are top-level exports rather than nested in `ethers.utils`.

### Q4: How does DocuChain enforce authorization for document revocation?
> **Answer:** In `contracts/DocuChain.sol`, the `revokeDocument(bytes32 _documentHash)` function performs an on-chain access check:
> ```solidity
> if (msg.sender != doc.owner) revert NotDocumentOwner(msg.sender, doc.owner);
> ```
> `msg.sender` represents the cryptographically authenticated address that signed the Ethereum transaction. If any address other than the original registering owner attempts to revoke the document, the EVM execution reverts and the state remains unchanged.

### Q5: What are Solidity Events, and why are they used for the activity log?
> **Answer:** Solidity events (`DocumentRegistered`, `DocumentRevoked`) write data to the Ethereum transaction receipt log bloom filter rather than contract storage slots. Reading event logs via `contract.queryFilter` is substantially cheaper than maintaining large dynamic arrays in contract storage, providing an optimal audit trail for decentralized frontends.

---

## 9. Technology Stack

- **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+ Modules)
- **Design Inspiration:** KeyNest Commercial SaaS Minimalist Aesthetic
- **Web3 Engine:** Ethers.js v6.13.4
- **Wallet Standard:** MetaMask EIP-1193 Provider API
- **Cryptography:** Browser Native Web Crypto API (SHA-256)
- **Smart Contract:** Solidity `^0.8.20`
- **Target Network:** Ethereum Sepolia Testnet (Chain ID 11155111) / Localhost (Chain ID 31337)
