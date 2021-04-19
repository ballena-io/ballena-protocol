// contracts/interfaces/IStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

interface IStrategy {
    // Total tokens managed by strategy
    function depositTotal() external view returns (uint256);

    // Sum of all shares of users to depositTotal
    function sharesTotal() external view returns (uint256);

    // Main harvest function
    function harvest() external;

    // Transfer tokens BalleMaster -> strategy
    function deposit(uint256 _amount) external returns (uint256);

    // Transfer tokens strategy -> BalleMaster
    function withdraw(uint256 _amount)
        external
        returns (
            uint256,
            uint256,
            uint256
        );

    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) external;
}
