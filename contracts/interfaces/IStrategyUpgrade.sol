// contracts/interfaces/IStrategyUpgrade.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStrategyUpgrade {
    function upgradingTo() external view returns (address);

    // Confirmation that the upgrade was completed.
    function upgradeCompleted() external;
}
