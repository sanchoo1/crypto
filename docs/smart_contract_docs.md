# Smart Contract Documentation
## Inverse Perpetual Swap Protocol — NYU Final Project

---

## 1. Deployed Contracts (Sepolia Testnet)

| Contract | Address | Etherscan |
|---|---|---|
| **InversePerpetualVault** | `0xBA20E2aB0451a7df61eA7186Ff101Dcb4996153a` | [View ✅ Verified](https://sepolia.etherscan.io/address/0xBA20E2aB0451a7df61eA7186Ff101Dcb4996153a#code) |
| **hBTC Token** | `0xecCb412d994EBD7F2619d0c36CB2eb37d8557d1d` | [View ✅ Verified](https://sepolia.etherscan.io/address/0xecCb412d994EBD7F2619d0c36CB2eb37d8557d1d#code) |
| **Chainlink BTC/USD Oracle** | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` | [Chainlink Official Feed](https://sepolia.etherscan.io/address/0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43) |

> Both contracts are **source-verified** on Sepolia Etherscan. Source code, ABI, and constructor arguments are publicly readable.

---

## 2. Source Code Documentation

### InversePerpetualVault.sol

The core protocol contract. Implements a **coin-margined (inverse) perpetual swap** where collateral and P&L are denominated in hBTC.

**Key Protocol Parameters:**

| Parameter | Value | Units |
|---|---|---|
| Initial Margin Ratio | 10% | `initialMarginBps = 1000` |
| Maintenance Margin Ratio | 5% | `maintenanceMarginBps = 500` |
| Liquidation Reward | 5% of margin | `liquidationRewardBps = 500` |
| Funding Rate | 0.01% | `globalFundingRateBps = 1` |
| Max Positions per User | 1 | Enforced in `openPosition()` |

**Core Functions:**

| Function | Description |
|---|---|
| `depositCollateral(uint256 amount)` | Deposits hBTC as margin collateral |
| `openPosition(uint256 sizeUsd, bool isLong)` | Opens a leveraged position |
| `closePosition()` | Closes caller's position, returns P&L |
| `liquidate(address targetUser)` | Liquidates undercollateralized positions |
| `setCollateralToken(address)` | Admin: links hBTC ERC20 to the vault |
| `setRiskParameters(uint256, uint256)` | Admin: adjusts margin/liquidation ratios |

**Precision / Fixed-Point Math:**

All internal calculations use **WAD scaling (1e18)** to avoid Solidity integer division precision loss.

```
// Oracle price: Chainlink returns 8 decimals → scaled to WAD (18 decimals)
uint256 currentPrice = uint256(price) * 10**10;

// Inverse P&L formula (SHORT position):
// uPnL = sizeUsd * (1/entryPrice - 1/currentPrice)   [in hBTC]
int256 invEntry   = int256((WAD * WAD) / pos.entryPrice);
int256 invCurrent = int256((WAD * WAD) / currentPrice);
uPnL = (int256(pos.sizeUsd) * (invEntry - invCurrent)) / int256(WAD);

// Health Factor:
// HF = (collateral + uPnL) * currentPrice / (sizeUsd * maintenanceMarginRatio)
```

---

### hBTC.sol

A mintable ERC20 token used as collateral. Upgraded from `Ownable` to **OpenZeppelin AccessControl** to support multi-party testing.

**Role Architecture:**

| Role | Capability | Holder |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Grant/Revoke roles | Deployer only |
| `MINTER_ROLE` | Call `mint(address, uint256)` | Deployer + authorized teammates |

```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
// Grant to teammate:
grantRole(MINTER_ROLE, 0xTeammateAddress);
```

---

## 3. Gas Usage Report

Measured via `forge test --gas-report` against a local Anvil fork. All 7 test cases passed.

### InversePerpetualVault — Function Gas Costs

| Function | Min Gas | Avg Gas | Max Gas | ~USD at 10 gwei, $90k ETH |
|---|---|---|---|---|
| **Deployment** | — | **2,289,390** | — | ~$2.06 |
| `depositCollateral()` | 73,942 | 73,965 | 73,966 | ~$0.07 |
| `openPosition()` | 43,220 | 110,279 | 110,620 | ~$0.10 |
| `liquidate()` | 84,179 | 85,185 | 86,191 | ~$0.08 |
| `setCollateralToken()` | 47,311 | 47,311 | 47,311 | ~$0.04 |
| `setRiskParameters()` | 24,942 | 24,942 | 24,942 | ~$0.02 |
| `positions()` (view) | 10,122 | 10,122 | 10,122 | ~$0.009 |

### hBTC Token — Function Gas Costs

| Function | Min Gas | Avg Gas | Max Gas |
|---|---|---|---|
| **Deployment** | — | **1,348,010** | — |
| `mint()` | 40,325 | 41,659 | 74,741 |
| `approve()` | 48,581 | 48,604 | 48,605 |
| `balanceOf()` (view) | 3,328 | 3,328 | 3,328 |

### Actual Sepolia Deployment Transactions

| Transaction | Gas Used | ETH Paid | Tx Hash |
|---|---|---|---|
| Deploy Vault | 2,289,390 | 0.00000244 ETH | [0xd2cec7...](https://sepolia.etherscan.io/tx/0xd2cec7a4e8b1597209b849b3c5b17d03c7800c8fb13bf29eddb8e13c00e1aab0) |
| Deploy hBTC | 1,051,990 | 0.00000112 ETH | [0x27a823...](https://sepolia.etherscan.io/tx/0x27a823fdc9c73115495bee0d26c50e73850786f18ff2fd8015ac879802bc55f7) |
| setCollateralToken | 47,311 | 0.00000005 ETH | [0x35c2d1...](https://sepolia.etherscan.io/tx/0x35c2d1e0087fadd0a14954e53e58c54142542a433e0ec2100a6fea3b947e6c40) |

> **Total deployment cost: ~$0.003 USD** at Sepolia gas prices. Extremely efficient for a full perpetuals protocol.

---

## 4. ABI Files

Located in the repository root:
- `hBTC_ABI.json` — ERC20 + AccessControl ABI
- `InversePerpetualVault_ABI.json` — Full vault interface

Also available directly from Etherscan via the **"Contract ABI"** section on each verified contract page.

---

## 5. Test Suite Results

```
Ran 7 tests for test/InversePerpetualVault.t.sol
[PASS] test_depositCollateral()                          gas: 150,820
[PASS] test_openPosition()                               gas: 263,762
[PASS] test_liquidate_short_pump()                       gas: 362,744
[PASS] test_liquidate_with_quant_crash()                 gas: 408,316
[PASS] test_RevertIf_InsufficientMargin()                gas: 183,612
[PASS] test_RevertIf_UnauthorizedRiskParameterUpdate()   gas:  39,795
[PASS] testFuzz_openPosition_mathTruncation(uint256)     runs: 256, μ: 307,990

Suite result: ok. 7 passed; 0 failed; 0 skipped
```

**Test coverage includes:**
- Normal collateral deposit and position lifecycle
- Short squeeze liquidation scenario
- Quantitative market crash liquidation scenario  
- Access control enforcement
- Fuzz testing for math precision across 256 random inputs

---

## 6. Network & Tooling

| Item | Value |
|---|---|
| Network | Ethereum Sepolia Testnet (Chain ID: 11155111) |
| Compiler | Solidity `^0.8.20` |
| Framework | Foundry (forge 0.3.x) |
| Oracle | Chainlink AggregatorV3Interface |
| Token Standard | ERC20 (OpenZeppelin 5.x) |
| Access Control | OpenZeppelin AccessControl |
