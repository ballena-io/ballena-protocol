// contracts/token/BALLEv2.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BALLEv2 is ERC20 {
    address public governance;
    mapping(address => bool) public minters;
    uint256 public immutable cap;

    event SetGovernance(address indexed addr);
    event AddMinter(address indexed addr);
    event RemoveMinter(address indexed addr);

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
        emit SetGovernance(_governance);
    }

    /**
     * @dev Add a minter address
     */
    function addMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = true;
        emit AddMinter(_minter);
    }

    /**
     * @dev Remove a minter address
     */
    function removeMinter(address _minter) external {
        require(msg.sender == governance, "!governance");
        minters[_minter] = false;
        emit RemoveMinter(_minter);
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
