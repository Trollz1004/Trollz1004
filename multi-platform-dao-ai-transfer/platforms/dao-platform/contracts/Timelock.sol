// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Timelock
 * @dev 2-day execution delay for security
 */
contract Timelock is TimelockController {
    /**
     * @param minDelay Minimum delay in seconds (172800 = 2 days)
     * @param proposers List of addresses that can propose
     * @param executors List of addresses that can execute
     * @param admin Address with admin privileges (can be zero address for full decentralization)
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
