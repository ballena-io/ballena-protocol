// contracts/mocks/WBNB.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WBNB is ERC20("Wrapped BNB", "WBNB") {
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
