// contracts/mocks/CakeLP.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CakeLP is ERC20("CAKE_LP", "CAKE_LP") {
    address public token0;
    address public token1;

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) public {
        _burn(_from, _amount);
    }

    function initialize(address _token0, address _token1) public {
        token0 = _token0;
        token1 = _token1;
    }
}
