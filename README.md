# Inverse Perpetual Swap Protocol (Smart Contract Core)

This repository contains the core smart contracts for a coin-margined Inverse Perpetual Swap Protocol, leveraging precise WAD scaling (1e18) to ensure rigorous quantitative limits.

## 🚀 1. Prerequisites
To compile and run this project, you need the **Foundry** smart contract development framework.
- **Windows Users**: It is highly recommended to run this inside **WSL (Ubuntu)**.
- **Mac/Linux/WSL**:
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  source ~/.bashrc
  foundryup
  ```

## 📦 2. Setup & Installation
Once `forge` is installed, dive into this directory and pull the standard testing/security libraries:
```bash
# Pull standard libraries (without committing git submodules)
forge install foundry-rs/forge-std
forge install openzeppelin/openzeppelin-contracts
```

## 🧪 3. Reproduce the Quant Model (Local Testing)
We have built an end-to-end integration test suite (`InversePerpetualVault.t.sol`) that perfectly models the Quant team's formulas (Margin bounds, UPNL execution, and Extreme Catastrophic Liquidations using an off-chain `MockAggregator`).

To compile the codebase and run the simulated scenarios, simply run:
```bash
forge test -vvv
```

### What does the test suite verify?
1. **`test_depositCollateral`**: Validates `hBTC` ERC-20 token approval and transfers interact securely with tracking variables.
2. **`test_openPosition`**: Manipulates WAD scaled values (converting $120,000 USD to 2.0 Native BTC) enforcing a strict `initialMarginBps = 10%`.
3. **`test_liquidate_with_quant_crash`**: Emulates extreme "toxic bad debt". Opens a Long, artificially crashes the Mock Oracle price from $60,000 down to $30,000, and verifies the Keeper Bot successfully evaluates the true `>= 1` Health Factor constraints to execute liquidation natively.
