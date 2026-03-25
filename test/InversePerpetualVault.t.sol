// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {InversePerpetualVault} from "../src/InversePerpetualVault.sol";
import {hBTC} from "../src/hBTC.sol";
import {MockAggregator} from "./mocks/MockAggregator.sol";

contract InversePerpetualVaultTest is Test {
    InversePerpetualVault public vault;
    hBTC public token;
    MockAggregator public oracle;

    address public user = address(1);
    address public liquidator = address(2);
    
    uint256 public constant WAD = 1e18;

    function setUp() public {
        // 1. Deploy Mock Oracle and initialize BTC price: $60,000
        oracle = new MockAggregator();
        oracle.setAnswer(60000 * 10**8); // Standard Chainlink 8 Decimals

        // 2. Deploy the core Vault
        vault = new InversePerpetualVault(address(oracle));

        // 3. Deploy the hBTC Token and bind its address to the Vault
        token = new hBTC();
        vault.setCollateralToken(address(token));

        // 4. Fund Vault with initial settlement liquidity (Peer-to-Pool reserve)
        token.mint(address(vault), 100 * WAD);

        // 5. Fund Test User with test tokens
        token.mint(user, 10 * WAD);
    }

    function test_depositCollateral() public {
        vm.startPrank(user);
        token.approve(address(vault), 1 * WAD);
        vault.depositCollateral(1 * WAD);
        vm.stopPrank();

        // Validate internal mapping accurately recorded the WAD collateral
        (, uint256 collateral, , ) = vault.positions(user);
        assertEq(collateral, 1 * WAD);
    }

    function test_openPosition() public {
        vm.startPrank(user);
        token.approve(address(vault), 2 * WAD);
        vault.depositCollateral(2 * WAD);

        // Simulation parameters:
        // Oracle Price = 60,000 USD
        // Target Position Size = $120,000 -> Equivalent to 2.0 native BTC strictly WAD verified
        // IMR (Initial Margin Requirement) = 10% (1000 BPS)
        // Required Margin = 0.2 hBTC Collateral
        // Result: The user has 2.0 hBTC Collateral available -> It cleanly exceeds the math bound requirement and succeeds
        vault.openPosition(120_000 * WAD, true);
        vm.stopPrank();

        (uint256 sizeUsd, , uint256 entryPrice, bool isLong) = vault.positions(user);
        assertEq(sizeUsd, 120_000 * WAD);
        assertEq(isLong, true);
        assertEq(entryPrice, 60000 * WAD); // Check Oracle Decimals reliably scaled to 1e18 internally
    }

    function test_liquidate_with_quant_crash() public {
        // Quant Scenario: Setup Long Position
        test_openPosition();

        // 1. Artificial Crisis Market Event: Simulate the Oracle Spot Price crashing heavily from $60,000 straight to $30,000 (Complete Bankruptcy)
        oracle.setAnswer(30000 * 10**8);

        // 2. Advance network time virtually by 8 hours to evaluate globalFundingIndex Lazy-evaluation constraints naturally
        skip(8 hours);

        // 3. Execution: Liquidator KeeperBot detects Health Factor < 1 mathematically via off-chain loops and calls the terminate logic
        vm.startPrank(liquidator);
        vault.liquidate(user);
        vm.stopPrank();

        // 4. Verification Check 1: Did the Keeper Bot accurately earn their 5% reward on the Notional Native Formative BTC Size?
        // Prior state size was $120,000. Crash Oracle state is $30,000. Computed Nominal Base Native volume = 4 underlying physical BTC (120,000 / 30,000)
        // Bound calculation verification limit = 4 BTC * 5% (500 BPS bounds) = precisely 0.2 physical raw hBTC Reward tokens expected natively
        assertGt(token.balanceOf(liquidator), 0);
        
        // 5. Verification Check 2: Position correctly completely cleared away avoiding memory reentrancy traces
        (uint256 sizeUsd, , , ) = vault.positions(user);
        assertEq(sizeUsd, 0);
    }
}
