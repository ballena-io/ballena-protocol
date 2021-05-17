// contracts/interfaces/IBalleRewarder.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalleRewarder {
    // Send reward to the user.
    function sendReward(
        address user,
        address token,
        uint256 amount
    ) external;
}
