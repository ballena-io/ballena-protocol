// contracts/interfaces/IBalleStakingPool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalleStakingPool {
    // Add reward to distribute. The funds should be transferred to the Rewarder contract.
    function addReward(
        uint256 _amount,
        uint256 _numberOfBlocks,
        uint256 _multiplier
    ) external;
}
