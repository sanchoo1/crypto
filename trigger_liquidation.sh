#!/bin/bash

# ======================================================================
# LOCAL ANVIL DEMO SCRIPT ONLY
# ⚠️ Do not run this on Sepolia or Mainnet.
# This script uses MockAggregator's setAnswer() which is not available 
# on the real Chainlink oracle. It's designed to simulate a volatile 
# market crash to trigger the keeper bot liquidation locally.
# ======================================================================

ORACLE="0x5FbDB2315678afecb367f032d93F642f64180aa3"
HBTC="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
VAULT="0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
USER_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PRIV_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC="http://127.0.0.1:8545"

echo "🔄 [Step 1] Resetting BTC price to baseline $67,500..."
cast send $ORACLE "setAnswer(int256)" 6750000000000 --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "⚙️ [Step 2] Linking hBTC Token to Vault..."
cast send $VAULT "setCollateralToken(address)" $HBTC --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "🧹 [Step 3] Cleaning up old positions (if any)..."
cast send $VAULT "closePosition()" --private-key $PRIV_KEY --rpc-url $RPC > /dev/null 2>&1 || true

echo "🔥 [Step 4] Minting 5 hBTC to your wallet..."
cast send $HBTC "mint(address,uint256)" $USER_ADDR 5000000000000000000 --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "💸 [Step 5] Approving Vault and Depositing 0.22 hBTC..."
cast send $HBTC "approve(address,uint256)" $VAULT 5000000000000000000 --private-key $PRIV_KEY --rpc-url $RPC > /dev/null
cast send $VAULT "depositCollateral(uint256)" 220000000000000000 --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "⚠️ [Step 6] Opening HIGH LEVERAGE $120,000 USD Short at \$67,500..."
cast send $VAULT "openPosition(uint256,bool)" 120000000000000000000000 false --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "--------------------------------------------------------"
echo "✅ Position ACTIVE! Watch the UI and Bot now..."
echo "--------------------------------------------------------"
sleep 15

echo "💥 [Step 7] HACKING ORACLE: Squeezing to $100,000 to trigger liquidation..."
cast send $ORACLE "setAnswer(int256)" 10000000000000 --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "⏳ Waiting for Keeper Bot to execute (15s)..."
sleep 15

echo "🔄 [Step 8] Restoration: Returning BTC to $67,500 baseline."
cast send $ORACLE "setAnswer(int256)" 6750000000000 --private-key $PRIV_KEY --rpc-url $RPC > /dev/null

echo "✅ All done. System is clean and reset!"
