// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title hBTC (Hedged BTC)
 * @dev ERC20 collateral token with role-based minting.
 * Any address granted MINTER_ROLE can mint their own tokens — no owner required.
 *
 * Usage:
 *   - Admin grants MINTER_ROLE to teammates: grantRole(MINTER_ROLE, <address>)
 *   - Teammates call mint(to, amount) directly from their own wallet
 */
contract hBTC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Hedged BTC", "hBTC") {
        // Deployer gets both Admin and Minter roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mints hBTC. Any address with MINTER_ROLE can call this.
     * @param to Recipient address
     * @param amount Amount in 1e18 units
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
