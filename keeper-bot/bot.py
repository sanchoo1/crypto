#!/usr/bin/env python3
"""
Inverse Perpetual Keeper Bot
Monitors positions and triggers liquidations when Health Factor < 1

Usage:
    python bot.py

Requirements:
    - Python 3.8+
    - web3.py
    - python-dotenv

Configuration:
    - Set environment variables in .env file (see .env.example)
    - Update VAULT_ABI in config.py when Role A delivers ABI
"""

import time
import logging
import requests
from web3 import Web3
from config import (
    MOCK_MODE,
    RPC_URL,
    PRIVATE_KEY,
    VAULT_ADDRESS,
    VAULT_ABI,
    POLL_INTERVAL,
    LIQUIDATION_THRESHOLD,
    MMR,
    validate_config
)
from health import (
    calc_unrealized_pnl,
    calc_health_factor,
    is_liquidatable
)

# Setup logging to stdout for better visibility
import sys
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    stream=sys.stdout,
    force=True
)
log = logging.getLogger(__name__)


class KeeperBot:
    """Keeper bot for monitoring and liquidating positions"""

    def __init__(self):
        """
        Initialize the keeper bot
        Mock mode is controlled by MOCK_MODE in .env
        """
        self.mock_mode = MOCK_MODE

        if not self.mock_mode:
            # Real mode - connect to blockchain
            if not validate_config():
                raise ValueError("Configuration incomplete. Check .env file and config.py")

            self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
            if not self.w3.is_connected():
                raise ConnectionError(f"Failed to connect to RPC: {RPC_URL}")

            self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
            log.info(f"Connected to blockchain. Keeper address: {self.account.address}")

            # Initialize contract
            self.vault = self.w3.eth.contract(
                address=Web3.to_checksum_address(VAULT_ADDRESS),
                abi=VAULT_ABI
            )

            # Track user addresses from events (cache for performance)
            self.tracked_users = set()
        else:
            log.info("Running in MOCK mode - using simulated data")

    def get_all_positions(self):
        """
        Fetch all open positions from the contract (or mock server in mock mode)

        Returns:
            List of position dictionaries
        """
        if self.mock_mode:
            # Read positions from mock server (shared with frontend)
            try:
                response = requests.get('http://localhost:3001/positions', timeout=2)
                positions = response.json()
                log.info(f"✓ Read {len(positions)} positions from mock server")
                return positions
            except Exception as e:
                # Fallback to hardcoded positions if server not running
                log.warning(f"✗ Could not reach mock server: {e}")
                log.warning("⚠ Using FALLBACK positions (mock-server.js may not be running)")
                log.warning("⚠ Start server with: node mock-server.js")

                # Fallback positions if server not running
                return [
                    {
                        "id": "0x001",
                        "owner": "0xabc...",
                        "size_usd": 10000,
                        "entry_price": 70000,
                        "collateral_hbtc": 0.80
                    },
                    {
                        "id": "0x002",
                        "owner": "0xdef...",
                        "size_usd": 10000,
                        "entry_price": 68000,
                        "collateral_hbtc": 0.0075
                    },
                    {
                        "id": "0x003",
                        "owner": "0xghi...",
                        "size_usd": 10000,
                        "entry_price": 68000,
                        "collateral_hbtc": 0.006
                    }
                ]

        # Real mode
        try:
            # Get users from PositionOpened events
            position_filter = self.vault.events.PositionOpened.create_filter(
                fromBlock='earliest'
            )
            events = position_filter.get_all_entries()

            # Extract unique user addresses
            for event in events:
                self.tracked_users.add(event['args']['user'])

            # Query each user's position
            positions = []
            for user in self.tracked_users:
                pos = self.vault.functions.positions(user).call()
                # pos = (sizeUsd, collateral, entryPrice, isLong)
                if pos[0] > 0:  # sizeUsd > 0 means position exists
                    positions.append({
                        "id": user,
                        "owner": user,
                        "size_usd": pos[0] / 1e18,  # Convert from wei
                        "entry_price": pos[2] / 1e8,  # 8 decimals for price
                        "collateral_hbtc": pos[1] / 1e8  # 8 decimals for hBTC
                    })

            log.info(f"✓ Found {len(positions)} active positions from {len(self.tracked_users)} tracked users")
            return positions

        except Exception as e:
            log.error(f"Failed to fetch positions: {e}")
            return []

    def get_current_btc_price(self):
        """
        Fetch latest BTC/USD price from Chainlink oracle via contract

        Returns:
            Current BTC/USD price as float
        """
        if self.mock_mode:
            # Mock price - fluctuates slightly
            import random
            base_price = 67420.0
            variation = (random.random() - 0.5) * 500  # +/- $250
            return base_price + variation

        # Real mode
        try:
            # Get price feed address from vault
            price_feed_address = self.vault.functions.btcUsdPriceFeed().call()

            # Chainlink AggregatorV3Interface ABI
            price_feed_abi = [
                {
                    "inputs": [],
                    "name": "latestRoundData",
                    "outputs": [
                        {"name": "roundId", "type": "uint80"},
                        {"name": "answer", "type": "int256"},
                        {"name": "startedAt", "type": "uint256"},
                        {"name": "updatedAt", "type": "uint256"},
                        {"name": "answeredInRound", "type": "uint80"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]

            price_feed = self.w3.eth.contract(
                address=Web3.to_checksum_address(price_feed_address),
                abi=price_feed_abi
            )

            # Get latest price
            latest_round = price_feed.functions.latestRoundData().call()
            price = latest_round[1]  # answer is at index 1
            return price / 1e8  # Chainlink BTC/USD has 8 decimals

        except Exception as e:
            log.error(f"Failed to fetch BTC price: {e}")
            return 0

    def liquidate_position(self, position_id: str, all_positions: list = None):
        """
        Execute liquidation transaction for a position

        Args:
            position_id: Position ID to liquidate
            all_positions: Unused parameter (kept for compatibility)

        Returns:
            Transaction hash if successful, None otherwise
        """
        if self.mock_mode:
            log.info(f"[MOCK] Would liquidate position {position_id}")
            # Simulate transaction delay
            time.sleep(0.5)

            # Mark position as liquidated on server (server will filter it out)
            try:
                requests.post('http://localhost:3001/liquidated',
                            json={"id": position_id},
                            timeout=2)
                log.info(f"✓ Position {position_id} marked as liquidated on server")
            except Exception as e:
                log.warning(f"Could not mark position as liquidated: {e}")

            return f"0xmock{position_id}"

        # Real mode
        try:
            # position_id in live mode is the user's address
            target_user = Web3.to_checksum_address(position_id)

            # Build transaction
            tx = self.vault.functions.liquidate(target_user).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 300000,
                'gasPrice': self.w3.eth.gas_price
            })

            # Sign and send transaction
            signed = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt['status'] == 1:
                log.info(f"✓ Liquidation confirmed: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                log.error(f"✗ Liquidation failed: {tx_hash.hex()}")
                return None

        except Exception as e:
            log.error(f"Failed to liquidate position {position_id}: {e}")
            return None

    def monitor_positions(self):
        """
        Main monitoring loop - check all positions and liquidate if needed
        """
        try:
            # Fetch current BTC price
            btc_price = self.get_current_btc_price()
            if btc_price == 0:
                log.error("Failed to fetch BTC price, skipping this round")
                return

            # Fetch all positions
            positions = self.get_all_positions()

            log.info(f"BTC/USD: ${btc_price:,.2f} | Checking {len(positions)} positions...")

            liquidation_count = 0

            # Check each position
            for pos in positions:
                # Calculate metrics
                pnl = calc_unrealized_pnl(
                    pos["size_usd"],
                    pos["entry_price"],
                    btc_price
                )

                hf = calc_health_factor(pos["collateral_hbtc"], pnl, pos["size_usd"], btc_price)

                # Determine status
                liquidatable = is_liquidatable(hf, LIQUIDATION_THRESHOLD)
                status_emoji = "🔴" if liquidatable else "🟢"

                # Log position status
                log.info(
                    f"  {status_emoji} Position {pos['id']} | "
                    f"Owner: {pos['owner']} | "
                    f"Size: ${pos['size_usd']:,} | "
                    f"HF: {hf:.4f} | "
                    f"PnL: {pnl:+.6f} hBTC"
                )

                # Liquidate if needed
                if liquidatable:
                    log.warning(
                        f"⚠ LIQUIDATING position {pos['id']} "
                        f"(Health Factor: {hf:.4f} < {LIQUIDATION_THRESHOLD})"
                    )

                    tx_hash = self.liquidate_position(pos["id"], positions)
                    if tx_hash:
                        liquidation_count += 1
                        log.info(f"✓ Liquidation successful: {tx_hash}")
                    else:
                        log.error(f"✗ Liquidation failed for position {pos['id']}")

            if liquidation_count > 0:
                log.info(f"Liquidated {liquidation_count} position(s) this round")
            else:
                log.info("No liquidations needed")

        except Exception as e:
            log.error(f"Error in monitoring loop: {e}")

    def run(self):
        """
        Start the keeper bot main loop
        """
        log.info("=" * 60)
        log.info("Inverse Perpetual Keeper Bot")
        log.info("=" * 60)
        log.info(f"Mode: {'MOCK' if self.mock_mode else 'LIVE'}")
        log.info(f"Poll interval: {POLL_INTERVAL}s")
        log.info(f"Liquidation threshold: HF < {LIQUIDATION_THRESHOLD}")
        log.info(f"Maintenance Margin Ratio: {MMR * 100}%")
        log.info("=" * 60)

        if not self.mock_mode:
            log.info(f"Keeper address: {self.account.address}")
            log.info(f"Vault address: {VAULT_ADDRESS}")
            log.info("=" * 60)

        log.info("Bot started. Press Ctrl+C to stop.")
        log.info("")

        try:
            while True:
                self.monitor_positions()
                log.info(f"Sleeping for {POLL_INTERVAL}s...\n")
                time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            log.info("\nBot stopped by user")
        except Exception as e:
            log.error(f"Fatal error: {e}")
            raise


def main():
    """Main entry point"""
    # Display current mode
    mode_label = "MOCK" if MOCK_MODE else "LIVE"
    log.info(f"Starting bot in {mode_label} mode (set MOCK_MODE in .env to toggle)")

    if not MOCK_MODE:
        # Validate configuration for live mode
        if not validate_config():
            log.error("Live mode requires RPC_URL, PRIVATE_KEY, VAULT_ADDRESS, and VAULT_ABI in config")
            log.error("Set MOCK_MODE=true in .env to run in mock mode")
            return

    # Initialize and run bot
    bot = KeeperBot()
    bot.run()


if __name__ == "__main__":
    main()
