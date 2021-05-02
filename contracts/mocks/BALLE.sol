// contracts/mocks/BALLE.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BALLE is ERC20 {
    address public governance;
    mapping(address => bool) public minters;

    constructor(string memory _name, string memory _symbol) ERC20(string(_name), string(_symbol)) {
        governance = msg.sender;
    }

    function mint(address account, uint256 amount) external {
        require(minters[msg.sender], "!minter");
        _mint(account, amount);
    }

    function setGovernance(address _governance) external {
        require(msg.sender == governance, "!governance");
        governance = _governance;
    }

    function addMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = true;
    }

    function removeMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = false;
    }
}
