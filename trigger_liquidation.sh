#!/bin/bash
echo "🔄 [Step 0] Resetting BTC price to baseline $67,500..."
~/.foundry/bin/cast send 0x0165878a594ca255338adfa4d48449f69242eb8f "setAnswer(int256)" 6750000000000 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "🧹 [Step 0.5] Cleaning up old positions..."
~/.foundry/bin/cast send 0x8a791620dd6260079bf849dc5567adc3f2fdc318 "closePosition()" --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null 2>&1 || true

echo "🔥 [Step 1] Minting 5 hBTC to your wallet..."
~/.foundry/bin/cast send 0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6 "mint(address,uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 5000000000000000000 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "💸 [Step 2] Approving Inverse Vault..."
~/.foundry/bin/cast send 0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6 "approve(address,uint256)" 0x8a791620dd6260079bf849dc5567adc3f2fdc318 5000000000000000000 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "⚙️ [Step 2.5] Linking hBTC Token address into the Vault Contract..."
~/.foundry/bin/cast send 0x8a791620dd6260079bf849dc5567adc3f2fdc318 "setCollateralToken(address)" 0x2279b7a0a67db372996a5fab50d91eaa73d2ebe6 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "🏦 [Step 3] Depositing 0.22 hBTC collateral (Extreme 10x Leverage!)..."
~/.foundry/bin/cast send 0x8a791620dd6260079bf849dc5567adc3f2fdc318 "depositCollateral(uint256)" 220000000000000000 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "⚠️ [Step 4] Opening a HIGH LEVERAGE $120,000 USD Short Position at BTC=\$67,500..."
~/.foundry/bin/cast send 0x8a791620dd6260079bf849dc5567adc3f2fdc318 "openPosition(uint256,bool)" 120000000000000000000000 false --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "--------------------------------------------------------"
echo "✅ Position Set! NOW WATCH YOUR KEEPER BOT LOG SCREEN CAREFULLY!"
echo "--------------------------------------------------------"
sleep 20

echo "💥 [Step 5] HACKING THE ORACLE: Pulling a Short Squeeze, manipulating BTC to $100,000 (Triggering HF < 1!)..."
~/.foundry/bin/cast send 0x0165878a594ca255338adfa4d48449f69242eb8f "setAnswer(int256)" 10000000000000 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545 > /dev/null

echo "🔥 BOOM! The Keeper Bot should violently liquidate you in the next 15 seconds!"
