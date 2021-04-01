// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BALLEv2 is ERC20 {
    address public governance;
    mapping(address => bool) public minters;
    uint256 public immutable cap;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _cap
    ) ERC20(string(_name), string(_symbol)) {
        require(_cap > 0, "BALLE: cap is 0");
        cap = _cap;
        governance = msg.sender;
    }

    /**
     * @dev Set the new governance address
     */
    function setGovernance(address _governance) external {
        require(msg.sender == governance, "!governance");
        governance = _governance;
    }

    /**
     * @dev Add a minter address
     */
    function addMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = true;
    }

    /**
     * @dev Remove a minter address
     */
    function removeMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = false;
    }

    /**
     * @dev Creates _amount tokens and assigns them to _to account, increasing
     * the total supply until the cap is reached.
     */
    function mint(address _to, uint256 _amount) external {
        require(minters[msg.sender], "!minter");
        require(ERC20.totalSupply() + _amount <= cap, "!cap");
        _mint(_to, _amount);
    }
}
