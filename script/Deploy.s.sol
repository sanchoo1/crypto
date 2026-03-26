// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {hBTC} from "../src/hBTC.sol";
import {InversePerpetualVault} from "../src/InversePerpetualVault.sol";
import {MockAggregator} from "../test/mocks/MockAggregator.sol";

contract DeployVault is Script {
    function run() external {
        // Retrieve private key from the .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Hardcoded Sepolia Testnet BTC/USD Chainlink Price Feed
        // Mainnet value: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
        address btcUsdPriceFeed = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43; 

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Local Anvil Deployment Network checks
        if (block.chainid == 31337) {
            MockAggregator mockFeed = new MockAggregator(); 
            mockFeed.setAnswer(67500 * 1e8);
            btcUsdPriceFeed = address(mockFeed);
            console.log("Mock Aggregator (Local) deployed at:", btcUsdPriceFeed);
        }

        // 1. Deploy the ERC20 Collateral Token (hBTC)
        hBTC token = new hBTC();
        console.log("hBTC Token deployed at:", address(token));

        // 2. Deploy the Core Vault
        InversePerpetualVault vault = new InversePerpetualVault(btcUsdPriceFeed);
        console.log("InversePerpetualVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
