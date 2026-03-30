# Full-Stack Integration & Deployment Guide

> **Branch**: `fullstack` — This guide covers the complete local testing loop and Sepolia deployment.
> All three components (Smart Contracts, React Frontend, Python Keeper Bot) are in this monorepo.

---

## 🖥️ Prerequisites

Install the following before starting:

| Tool | Install Command |
|------|----------------|
| **Foundry** (forge + cast + anvil) | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **Node.js v18+** (via nvm) | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh \| bash && source ~/.bashrc && nvm install 18 && nvm use 18` |
| **Python 3.8+** | `sudo apt install python3 python3-pip` |
| **Python deps** | `cd keeper-bot && pip3 install -r requirements.txt` |

---

## ⚡ Part 1: Local Full-Stack Test (Anvil)

This is the primary development workflow. Everything runs locally for free with zero gas limits.

### Step 1 — Start the Local Blockchain

Open **Terminal 1**, run:
```bash
anvil
```
This spins up `http://127.0.0.1:8545` with 10 pre-funded accounts (10,000 ETH each).

**Default Account 0 (use this for all local testing):**
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

### Step 2 — Deploy Smart Contracts

Open **Terminal 2**, run:
```bash
forge script script/Deploy.s.sol:DeployVault \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

The deploy script auto-detects Anvil (Chain ID `31337`) and deploys a `MockAggregator` pre-seeded at **$67,500** instead of the Sepolia Chainlink feed.

**Note the three addresses printed in the output**, then update:

**`inverse-perp-ui/.env`**
```
VITE_RPC_URL=http://127.0.0.1:8545
VITE_VAULT_ADDRESS=<new vault address>
VITE_HBTC_ADDRESS=<new hBTC address>
```

**`keeper-bot/.env`**
```
MOCK_MODE=false
RPC_URL=http://127.0.0.1:8545
VAULT_ADDRESS=<new vault address>
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
POLL_INTERVAL=15
```

> ⚠️ **CRITICAL**: After every new Anvil deploy you must also call `setCollateralToken()` (see Step 5).

---

### Step 3 — Start the React Frontend

Open **Terminal 3**:
```bash
cd inverse-perp-ui
npm install   # first time only
npm run dev
```
Frontend runs at `http://localhost:3000`.

**In the browser:**
1. Import Anvil's Account 0 private key into MetaMask (see key above).
2. Add **Anvil** as a custom network in MetaMask: RPC `http://127.0.0.1:8545`, Chain ID `31337`.
3. Switch MetaMask to the Anvil network.
4. Click **Connect Wallet** on the site and select Account 0.
5. Toggle the mode switch to **LIVE** (top right).

The frontend polls the blockchain every **5 seconds** for live price and position updates.

---

### Step 4 — Start the Keeper Bot

Open **Terminal 4**:
```bash
cd keeper-bot
python3 bot.py
```

Expected output:
```
INFO Starting bot in LIVE mode
INFO Connected to blockchain. Keeper address: 0xf39Fd...2266
INFO Bot started. Press Ctrl+C to stop.
INFO BTC/USD: $67,500.00 | Checking 0 positions...
```

---

### Step 5 — Link hBTC Token to Vault (one-time per deploy)

The Vault needs to know the hBTC token address after each fresh deploy:
```bash
cast send <VAULT_ADDRESS> "setCollateralToken(address)" <HBTC_ADDRESS> \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545
```

---

### Step 6 — End-to-End Liquidation Demo

Run the automated simulation script from the `base/` root directory:
```bash
./trigger_liquidation.sh
```

**What it does (fully automated):**

| Step | Action |
|------|--------|
| 0 | Resets oracle price to `$67,500` |
| 0.5 | Closes any existing open position |
| 1 | Mints 5 hBTC to Account 0 |
| 2 | Approves Vault to spend hBTC |
| 2.5 | Links hBTC into the Vault (`setCollateralToken`) |
| 3 | Deposits `0.22 hBTC` collateral (extreme leverage) |
| 4 | Opens a `$120,000 SHORT` position at `$67,500` |
| *(20s pause — Bot has time to scan and see 🟢 healthy)* | |
| 5 | **Manipulates oracle to `$100,000`** — position goes bankrupt |

**Expected Bot output after Step 5:**
```
🔴 Position 0xf39F... | HF: -5.96 | PnL: -0.5778 hBTC
⚠ LIQUIDATING position 0xf39F... (Health Factor: -5.96 < 1.0)
✓ Liquidation confirmed: 0x88ad8a...
✓ Liquidation successful: 0x88ad8a...
Liquidated 1 position(s) this round
```

**Expected Frontend:** The position card turns deep red with a pulsing 💀 `LIQUIDATED — Keeper Bot Executed` banner for 30 seconds, then disappears.

---

## 📐 Part 2: Key Precision Notes (Critical for Integration)

The Vault stores all values in **WAD format (18 decimal places)**. Failure to account for this causes garbled numbers (the most common integration bug).

| Field | Stored in Contract | Frontend / Bot parse with |
|---|---|---|
| `sizeUsd` | WAD (1e18) | `ethers.formatUnits(val, 18)` / `/ 1e18` |
| `collateral` | WAD (1e18) hBTC | `ethers.formatUnits(val, 18)` / `/ 1e18` |
| `entryPrice` | WAD (1e18) — Chainlink 8dec × 10^10 | `ethers.formatUnits(val, 18)` / `/ 1e18` |
| Oracle `answer` | 8 decimals (Chainlink standard) | `ethers.formatUnits(val, 8)` / `/ 1e8` |
| hBTC `balanceOf` | 18 decimals | `ethers.formatUnits(val, 18)` / `/ 1e18` |

**Health Factor formula (off-chain verification):**
```python
# Python (bot) — all values already divided to float
upnl = size_usd * (1/current_price - 1/entry_price)   # SHORT position
net_margin = collateral_hbtc + upnl
hf = (net_margin * current_price) / (size_usd * mmr)   # mmr = 0.05
# Liquidate when hf < 1.0
```

---

## 🌍 Part 3: Sepolia Testnet Deployment

Once local testing passes, deploy to public testnet.

### Prerequisites
1. Get Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com).
2. Get a free RPC URL from [alchemy.com](https://alchemy.com) → Create App → Ethereum → Sepolia.

### Deploy
Create `base/.env`:
```
PRIVATE_KEY=0xYOUR_METAMASK_PRIVATE_KEY
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

Then run:
```bash
source .env
forge script script/Deploy.s.sol:DeployVault \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

The script auto-uses the real **Sepolia Chainlink BTC/USD feed** (`0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`). No code changes needed.

### Update `.env` files with new Sepolia addresses

**`inverse-perp-ui/.env`**
```
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_VAULT_ADDRESS=0xBA20E2aB0451a7df61eA7186Ff101Dcb4996153a
VITE_HBTC_ADDRESS=0xecCb412d994EBD7F2619d0c36CB2eb37d8557d1d
```

**`keeper-bot/.env`**
```
MOCK_MODE=false
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VAULT_ADDRESS=0xBA20E2aB0451a7df61eA7186Ff101Dcb4996153a
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
POLL_INTERVAL=30
```

### Post-deploy: Link hBTC (same as local)
```bash
cast send $VAULT_ADDRESS "setCollateralToken(address)" $HBTC_ADDRESS \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

### Post-deploy: Grant MINTER_ROLE to teammates

`hBTC` uses **OpenZeppelin AccessControl**. Only the deployer has `MINTER_ROLE` by default. Teammates need the role to mint their own test tokens.

**Admin grants role to a teammate:**
```bash
cast send $HBTC_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "MINTER_ROLE") \
  <TEAMMATE_ADDRESS> \
  --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

**Teammate mints to themselves (after receiving MINTER_ROLE):**
```bash
# 5 hBTC = 5000000000000000000 (18 decimals)
cast send $HBTC_ADDRESS \
  "mint(address,uint256)" \
  <THEIR_ADDRESS> 5000000000000000000 \
  --private-key <THEIR_PRIVATE_KEY> --rpc-url $RPC_URL
```

> ℹ️ Only `DEFAULT_ADMIN_ROLE` holders can call `grantRole()`. Teammates with only `MINTER_ROLE` can mint but cannot grant the role to others.

---

## 📁 Repo Structure

```
base/
├── src/
│   ├── InversePerpetualVault.sol   # Core vault contract
│   └── hBTC.sol                    # ERC20 collateral token
├── test/
│   ├── InversePerpetualVault.t.sol # Foundry test suite
│   └── mocks/MockAggregator.sol    # Local oracle mock
├── script/Deploy.s.sol             # Auto-deploy script (Anvil + Sepolia)
├── inverse-perp-ui/                # React frontend (Vite)
│   └── src/
│       ├── hooks/useContract.js    # Blockchain read/write logic
│       └── constants/contracts.js  # ABI + addresses
├── keeper-bot/
│   ├── bot.py                      # Main liquidation bot
│   ├── health.py                   # HF math (pure Python)
│   └── config.py                   # Env config loader
└── trigger_liquidation.sh          # End-to-end demo script
```
