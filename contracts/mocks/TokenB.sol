// contracts/mocks/TokenB.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenB is ERC20("Token B", "TKNB") {
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
