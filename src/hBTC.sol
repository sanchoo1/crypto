// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title hBTC (Hedged BTC)
 * @dev ERC20 token acting as collateral and payout token for the Inverse Perpetual Protocol.
 * Includes a mint function for testing purposes.
 */
contract hBTC is ERC20, Ownable {
    
    /**
     * @dev Constructor initializes the ERC20 and Ownable components.
     * Wires the deployer as the initial owner.
     */
    constructor() ERC20("Hedged BTC", "hBTC") Ownable(msg.sender) {}

    /**
     * @dev Mints hBTC tokens. Useful for testnet faucets or testing.
     * @param to Address to receive the minted tokens.
     * @param amount Amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
