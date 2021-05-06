// contracts/mocks/TokenA.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenA is ERC20("Token A", "TKNA") {
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
