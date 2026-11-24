# DocuChain files for Remix

`DocuChain.sol` is a self-contained Solidity contract copied from `contracts/DocuChain.sol`. It has no external imports, so it can be pasted directly into Remix.

## Deploy with Remix

1. Open [Remix IDE](https://remix.ethereum.org) and create a file named `DocuChain.sol`.
2. Copy all contents of this folder's `DocuChain.sol` into the Remix file.
3. In **Solidity Compiler**, select compiler version **0.8.20** and compile `DocuChain.sol`.
4. In MetaMask, select **Sepolia** and make sure the account has Sepolia test ETH for deployment gas.
5. In Remix **Deploy & Run Transactions**, select **Injected Provider - MetaMask**. Confirm the Sepolia connection, select `DocuChain`, and click **Deploy**.
6. Approve the transaction in MetaMask. After it confirms, copy the deployed contract address from Remix's **Deployed Contracts** panel.
7. Paste that address into `CONTRACT_ADDRESS` in `../frontend/config.js`, save, and reload the running frontend. Connect MetaMask on Sepolia.

Remix compiles and deploys the smart contract. Run the website separately from the project root with `python run.py`; Remix does not host the frontend.
