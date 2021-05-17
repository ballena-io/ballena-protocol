// contracts/interfaces/IBalleRewardFund.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalleRewardFund {
    // Transfer tokens to the rewarder.
    function sendRewardAmount(address rewarder, uint256 amount) external returns (uint256);
}
