// contracts/interfaces/IStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStrategy {
    // Deposited token
    function depositToken() external view returns (address);

    // Total tokens managed by strategy
    function depositTotal() external view returns (uint256);

    // Sum of all shares of users to depositTotal
    function sharesTotal() external view returns (uint256);

    // Main harvest function
    function harvest() external;

    // Transfer tokens BalleMaster -> strategy
    function deposit(address _user, uint256 _amount) external returns (uint256);

    // Transfer tokens strategy -> BalleMaster
    function withdraw(address _user, uint256 _amount) external returns (uint256, uint256);

    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) external;

    // Prepare to upgrade strategy to the new one indicated
    function upgradeTo(address _strat)
        external
        returns (
            uint256,
            uint256,
            uint256
        );

    // Second phase of strategy upgrade (to execute on new strategy)
    function upgradeFrom(
        address _strat,
        uint256 _sharesTotal,
        uint256 _depositAmt,
        uint256 _earnedAmt
    ) external;

    // Pause strategy
    function pause() external;

    // Unpause strategy
    function unpause() external;

    // Panic strategy
    function panic() external;

    // Retire strategy
    function retire() external;
}
