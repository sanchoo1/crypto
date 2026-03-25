# Frontend/Bot Integration & Deployment Guide

This document outlines how the **Frontend** and **Keeper Bot** developers can hook into the Inverse Perpetual Protocol natively, as well as the final deployment steps to a public Testnet.

---

## 🛠️ Part 1: Local Full-Stack Integration (Without Gas Limits)
Before deploying to Sepolia, the Frontend and Bot should be tested against a local clone of the blockchain (`anvil`). This provides zero-latency confirmations and free unlimited ETH.

### 1. Start the Local Blockchain
In a separate terminal (inside your WSL/Linux environment), execute:
```bash
anvil
```
*This spins up a local Ethereum node on `http://127.0.0.1:8545` and prints 10 private keys loaded with 10k mock ETH.*

### 2. Auto-Deploy the Architecture
Keep `anvil` running, open a new terminal, and automatically deploy the `Vault` and `hBTC` Token onto your local chain:
```bash
forge script script/Deploy.s.sol:DeployVault --rpc-url http://127.0.0.1:8545 --broadcast
```
*Once successful, your terminal will print the local `Vault Address` and `hBTC Address`. Use these in your Frontend and Keeper script!*

### 3. Consume the ABI Interfaces
Your web apps must interact exclusively using the standard JSON ABIs provided in this repository root:
- `InversePerpetualVault_ABI.json`
- `hBTC_ABI.json`

---

## 🤖 Part 2: Keeper Bot Testing Specification
The Keeper Bot acts as the automated clearinghouse. It must:

1. **Monitor Price Feeds**: Continually subscribe to the real-time `hBTC/USD` or Node Spot price.
2. **Monitor Positions**: Read the `positions(address targetUser)` tuple directly from the deployed Vault via an ethers.js `Provider`.
3. **Evaluate HF (Off-Chain)**: Mimic the strict Vault precision locally to evaluate if Health Factor drops below 1:
   ```js
   // Keep decimals strictly synchronized at 1e18 (WAD)
   const UPNL = sizeUsd * (1/entryPrice - 1/currentPrice); 
   const netMargin = collateral + UPNL;
   const hf = (netMargin * currentPrice) / (sizeUsd * 0.05); // 0.05 = Maintenance Margin
   ```
4. **Execute**: The moment `hf < 1`, the Bot triggers `Vault.liquidate(targetUser)`.
   **Incentive Mechanism**: Because standard accounts can fall to negative parity ("toxic bad debt" / 0 remaining Margin), the Vault functions as an Insurance Fund. It will automatically physically transfer a 5% `reward` straight to the Liquidator Bot's internal `hBTC` wallet to cover gas.

---

## 🌍 Part 3: Public Testnet (Sepolia) Deployment
Once the local integration phase (`anvil`) successfully proves the Bot can liquidate underwater positions seamlessly, the Smart Contract engineer will deploy to Sepolia.

1. **Environment Setup**:
   Copy `.env.example` to `.env` and fill it out:
   ```text
   SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
   PRIVATE_KEY="YOUR_METAMASK_PRIVATE_KEY"
   ETHERSCAN_API_KEY="YOUR_ETHERSCAN_KEY" (Optional, for contract verification)
   ```

2. **Run Deploy to Sepolia**:
   ```bash
   forge script script/Deploy.s.sol:DeployVault --rpc-url sepolia --broadcast --verify -vvvv
   ```

3. **Provide Public Addresses**:
   The Smart Contract Developer will distribute the generated Sepolia Etherscan links to the Frontend and Bot developers to upgrade their connections to production targets.
