// contracts/mocks/CAKE.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CAKE is ERC20("CAKE", "CAKE") {
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
