"""
Configuration module for Keeper Bot
Loads environment variables and contract configuration
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Mock mode toggle
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"

# RPC Configuration (required for live mode)
RPC_URL = os.getenv("RPC_URL", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

# Contract Addresses (required for live mode)
VAULT_ADDRESS = os.getenv("VAULT_ADDRESS", "")

# Bot Configuration
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "15"))  # seconds
LIQUIDATION_THRESHOLD = float(os.getenv("LIQUIDATION_THRESHOLD", "1.0"))

# Protocol Constants
MMR = 0.05  # 5% Maintenance Margin Ratio

# Vault Contract ABI (from deployed InversePerpetualVault)
VAULT_ABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "_priceFeed",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "btcUsdPriceFeed",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract AggregatorV3Interface"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "closePosition",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "depositCollateral",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "globalFundingIndex",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "int256",
                "internalType": "int256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "globalFundingRateBps",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "hBTC_Token",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IERC20"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialMarginBps",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lastFundingTime",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "liquidate",
        "inputs": [
            {
                "name": "targetUser",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "liquidationRewardBps",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "maintenanceMarginBps",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "openPosition",
        "inputs": [
            {
                "name": "sizeUsd",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "isLong",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "positions",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "sizeUsd",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "collateral",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "entryPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "isLong",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setCollateralToken",
        "inputs": [
            {
                "name": "_token",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setRiskParameters",
        "inputs": [
            {
                "name": "_maintenanceMarginBps",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_liquidationRewardBps",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "CollateralDeposited",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            }
        ],
        "anonymous": False
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            }
        ],
        "anonymous": False
    },
    {
        "type": "event",
        "name": "PositionClosed",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            },
            {
                "name": "pnl",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            },
            {
                "name": "payout",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            }
        ],
        "anonymous": False
    },
    {
        "type": "event",
        "name": "PositionLiquidated",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            },
            {
                "name": "liquidator",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            },
            {
                "name": "reward",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            }
        ],
        "anonymous": False
    },
    {
        "type": "event",
        "name": "PositionOpened",
        "inputs": [
            {
                "name": "user",
                "type": "address",
                "indexed": True,
                "internalType": "address"
            },
            {
                "name": "sizeUsd",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            },
            {
                "name": "isLong",
                "type": "bool",
                "indexed": False,
                "internalType": "bool"
            },
            {
                "name": "entryPrice",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            }
        ],
        "anonymous": False
    },
    {
        "type": "event",
        "name": "RiskParametersUpdated",
        "inputs": [
            {
                "name": "maintenanceMarginBps",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            },
            {
                "name": "liquidationRewardBps",
                "type": "uint256",
                "indexed": False,
                "internalType": "uint256"
            }
        ],
        "anonymous": False
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    }
]

# Validation
def validate_config():
    """Validate that all required configuration is present"""
    if not RPC_URL:
        print("WARNING: RPC_URL not set in .env file")
        return False

    if not PRIVATE_KEY:
        print("WARNING: PRIVATE_KEY not set in .env file")
        return False

    if not VAULT_ADDRESS:
        print("WARNING: VAULT_ADDRESS not set in .env file - running in mock mode")
        return False

    if not VAULT_ABI or len(VAULT_ABI) == 0:
        print("WARNING: VAULT_ABI not configured - waiting for Role A to deliver ABI")
        return False

    return True


if __name__ == "__main__":
    print("Keeper Bot Configuration:")
    print(f"RPC_URL: {RPC_URL[:50]}..." if RPC_URL else "RPC_URL: Not set")
    print(f"PRIVATE_KEY: {'Set' if PRIVATE_KEY else 'Not set'}")
    print(f"VAULT_ADDRESS: {VAULT_ADDRESS if VAULT_ADDRESS else 'Not set'}")
    print(f"POLL_INTERVAL: {POLL_INTERVAL}s")
    print(f"LIQUIDATION_THRESHOLD: {LIQUIDATION_THRESHOLD}")
    print(f"MMR: {MMR}")
    print(f"\nConfiguration valid: {validate_config()}")
