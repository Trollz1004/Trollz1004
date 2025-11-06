// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Treasury
 * @dev Multi-sig treasury contract with role-based access control
 */
contract Treasury is AccessControl {
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");

    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount, string purpose);
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        _grantRole(PROPOSER_ROLE, msg.sender);
    }

    /**
     * @dev Receive ETH deposits
     */
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Get treasury balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Withdraw ETH (requires TREASURER_ROLE)
     */
    function withdraw(address payable to, uint256 amount, string calldata purpose)
        external
        onlyRole(TREASURER_ROLE)
    {
        require(address(this).balance >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(to, amount, purpose);
    }

    /**
     * @dev Withdraw ERC-20 tokens (requires TREASURER_ROLE)
     */
    function withdrawToken(address token, address to, uint256 amount)
        external
        onlyRole(TREASURER_ROLE)
    {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");

        IERC20(token).transfer(to, amount);
        emit TokensWithdrawn(token, to, amount);
    }

    /**
     * @dev Add treasurer
     */
    function addTreasurer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TREASURER_ROLE, account);
    }

    /**
     * @dev Remove treasurer
     */
    function removeTreasurer(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(TREASURER_ROLE, account);
    }
}
