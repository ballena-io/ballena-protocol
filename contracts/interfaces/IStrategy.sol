// contracts/interfaces/IStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

interface IStrategy {
    // Total tokens managed by strategy
    function depositTotal() external view returns (uint256);

    // Sum of all shares of users to depositTotal
    function sharesTotal() external view returns (uint256);

    // Main compounding function
    function earn() external;

    // Transfer tokens balleMaster -> strategy
    function deposit(address _userAddress, uint256 _amount) external returns (uint256);

    // Transfer tokens strategy -> balleMaster
    function withdraw(address _userAddress, uint256 _amount)
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
