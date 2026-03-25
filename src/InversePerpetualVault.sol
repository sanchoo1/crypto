// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title InversePerpetualVault
 * @dev Core vault for a coin-margined Inverse Perpetual Swap Protocol with Automated Liquidation.
 * Note: Fixed-point math uses WAD scaling (18 decimals).
 */
contract InversePerpetualVault is Ownable {
    // --- Structs --- //

    struct Position {
        uint256 sizeUsd;
        uint256 collateral;
        uint256 entryPrice;
        bool isLong;
    }

    // --- State Variables --- //

    // Risk Parameters (Basis Points: 10000 = 100%)
    uint256 public maintenanceMarginBps = 500; // Default: 5%
    uint256 public liquidationRewardBps = 500; // Default: 5%
    uint256 public initialMarginBps = 1000;    // Default: 10% (10x leverage max)

    // Funding Rate
    // Simplified Global Passive Funding Index
    int256 public globalFundingIndex;
    uint256 public globalFundingRateBps = 1; // Default: 1 bps (0.01%) per 8 hours
    uint256 public lastFundingTime;

    // External Connections
    AggregatorV3Interface public btcUsdPriceFeed;
    IERC20 public hBTC_Token;
    
    // User Positions
    mapping(address => Position) public positions;

    // --- Events --- //

    event CollateralDeposited(address indexed user, uint256 amount);
    event PositionOpened(address indexed user, uint256 sizeUsd, bool isLong, uint256 entryPrice);
    event PositionClosed(address indexed user, uint256 pnl, uint256 payout);
    event PositionLiquidated(address indexed user, address indexed liquidator, uint256 reward);
    event RiskParametersUpdated(uint256 maintenanceMarginBps, uint256 liquidationRewardBps);

    // --- Constructor --- //

    constructor(address _priceFeed) Ownable(msg.sender) {
        btcUsdPriceFeed = AggregatorV3Interface(_priceFeed);
        lastFundingTime = block.timestamp;
    }

    function setCollateralToken(address _token) external onlyOwner {
        hBTC_Token = IERC20(_token);
    }

    // --- Admin Functions --- //

    /**
     * @notice Updates the risk parameters using Basis Points.
     * @param _maintenanceMarginBps New maintenance margin in bps.
     * @param _liquidationRewardBps New liquidation reward in bps.
     */
    function setRiskParameters(uint256 _maintenanceMarginBps, uint256 _liquidationRewardBps) external onlyOwner {
        require(_maintenanceMarginBps < 10000, "Invalid maintenance margin");
        require(_liquidationRewardBps < 10000, "Invalid liquidation reward");
        
        maintenanceMarginBps = _maintenanceMarginBps;
        liquidationRewardBps = _liquidationRewardBps;

        emit RiskParametersUpdated(_maintenanceMarginBps, _liquidationRewardBps);
    }

    // --- Core External Functions --- //

    /**
     * @notice Lazily updates the global funding index based on time elapsed.
     */
    function _updateFunding() internal {
        uint256 timeElapsed = block.timestamp - lastFundingTime;
        if (timeElapsed == 0) return;
        
        // globalFundingRateBps is per 8 hours (28800 seconds).
        int256 accrual = int256((timeElapsed * globalFundingRateBps * 1e18) / (28800 * 10000));
        globalFundingIndex += accrual;
        lastFundingTime = block.timestamp;
    }

    /**
     * @notice Deposits hBTC collateral into the vault.
     * @param amount The amount of hBTC to deposit.
     */
    function depositCollateral(uint256 amount) external {
        require(address(hBTC_Token) != address(0), "Token not configured");
        require(amount > 0, "Amount must be > 0");
        require(hBTC_Token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        Position storage pos = positions[msg.sender];
        pos.collateral += amount;

        emit CollateralDeposited(msg.sender, amount);
    }

    /**
     * @notice Opens a new perpetual swap position.
     * @param sizeUsd The size of the position in USD.
     * @param isLong True for a long position, false for short.
     */
    function openPosition(uint256 sizeUsd, bool isLong) external {
        _updateFunding();
        Position storage pos = positions[msg.sender];
        require(pos.sizeUsd == 0, "Only 1 active position permitted");
        require(sizeUsd > 0, "Invalid size");

        (, int256 price, , , ) = btcUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid Oracle Price");
        uint256 currentPrice = uint256(price) * 10**10; // Scale 8 decimals to 18 (WAD)
        uint256 WAD = 1e18;

        // Enforce Initial Margin Requirement (10% standard)
        uint256 positionInBtc = (sizeUsd * WAD) / currentPrice;
        uint256 requiredMargin = (positionInBtc * initialMarginBps) / 10000;
        require(pos.collateral >= requiredMargin, "Insufficient margin to open");

        pos.sizeUsd = sizeUsd;
        pos.isLong = isLong;
        pos.entryPrice = currentPrice;
        
        emit PositionOpened(msg.sender, sizeUsd, isLong, currentPrice);
    }

    /**
     * @notice Closes an existing position and settles P&L.
     */
    function closePosition() external {
        _updateFunding();
        Position storage pos = positions[msg.sender];
        require(pos.sizeUsd > 0, "No active position");

        (, int256 price, , , ) = btcUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid Oracle Price");
        uint256 currentPrice = uint256(price) * 10**10;
        uint256 WAD = 1e18;
        
        int256 invCurrent = int256((WAD * WAD) / currentPrice);
        int256 invEntry = int256((WAD * WAD) / pos.entryPrice);

        int256 uPnL;
        if (pos.isLong) {
            uPnL = (int256(pos.sizeUsd) * (invEntry - invCurrent)) / int256(WAD);
        } else {
            uPnL = (int256(pos.sizeUsd) * (invCurrent - invEntry)) / int256(WAD);
        }

        // Apply net margin settlement
        int256 netMarginInt = int256(pos.collateral) + uPnL;
        uint256 payout = netMarginInt > 0 ? uint256(netMarginInt) : 0;

        // Clear position state to avoid reentrancy
        delete positions[msg.sender];

        // Send physical payout
        if (payout > 0) {
            require(hBTC_Token.transfer(msg.sender, payout), "Transfer failed");
        }
        
        emit PositionClosed(msg.sender, uPnL > 0 ? uint256(uPnL) : 0, payout);
    }

    /**
     * @notice Liquidates an undercollateralized user position by a keeper bot.
     * @param targetUser The address of the user to liquidate.
     */
    function liquidate(address targetUser) public {
        Position storage pos = positions[targetUser];
        require(pos.sizeUsd > 0, "No active position");

        // 1. Fetch latest BTC/USD price
        (, int256 price, , , ) = btcUsdPriceFeed.latestRoundData();
        require(price > 0, "Invalid Oracle Price");
        // Oracle returns 8 decimals for BTC/USD. Scale it up to WAD (18 decimals).
        uint256 currentPrice = uint256(price) * 10**10;
        uint256 WAD = 1e18;

        // 2. Calculate Unrealized P&L
        // WAD Scaling: scale inverses up by 1e36 before division for extreme precision
        int256 invCurrent = int256((WAD * WAD) / currentPrice);
        int256 invEntry = int256((WAD * WAD) / pos.entryPrice);

        int256 uPnL;
        if (pos.isLong) {
            uPnL = (int256(pos.sizeUsd) * (invEntry - invCurrent)) / int256(WAD);
        } else {
            // Short: Profit when current price drops (invCurrent > invEntry)
            uPnL = (int256(pos.sizeUsd) * (invCurrent - invEntry)) / int256(WAD);
        }

        // 3. Health Factor (HF) Calculation: HF = ((Collateral + UPNL) * Price) / (Size * MMR)
        int256 netMarginInt = int256(pos.collateral) + uPnL;
        uint256 netMargin = netMarginInt > 0 ? uint256(netMarginInt) : 0;

        uint256 healthFactor;
        if (netMargin == 0) {
            healthFactor = 0; // If fully bankrupt, HF instantly collapses
        } else {
            uint256 hfNumerator = netMargin * currentPrice; 
            uint256 hfDenominator = (pos.sizeUsd * maintenanceMarginBps) / 10000;
            // Since hfNumerator (WAD * WAD) and hfDenominator is Size (WAD), 
            // the division naturally yields exactly 1 WAD precision.
            healthFactor = hfNumerator / hfDenominator;
        }

        // Liquidation constraint: HF < 1 (in WAD scale)
        require(healthFactor < WAD, "Position is healthy (HF >= 1)");

        // 4. Calculate Liquidation Reward
        // Reward = (PositionSize_USD / Price) * LiquidationRewardBps
        // Even if the user is completely bankrupt (netMargin = 0), the Vault (acting as the Insurance Fund)
        // guarantees this payout from its own reserves to ensure the Keeper Bot has the gas incentive to clear toxic debt!
        uint256 positionInBtc = (pos.sizeUsd * WAD) / currentPrice;
        uint256 reward = (positionInBtc * liquidationRewardBps) / 10000;

        // 5. State updates & Reward Transfer
        delete positions[targetUser]; 
        
        // Final execute of physical hBTC to reward the bot directly from Vault's pool
        if (reward > 0) {
            require(hBTC_Token.transfer(msg.sender, reward), "Reward transfer failed");
        }

        emit PositionLiquidated(targetUser, msg.sender, reward);
    }
}
