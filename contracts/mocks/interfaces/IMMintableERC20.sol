// contracts/mocks/interfaces/IMMintableERC20.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMMintableERC20 is IERC20 {
    function mint(address _to, uint256 _amount) external;
}
