// contracts/token/BALLEv2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BALLEv2 is ERC20 {
    using SafeERC20 for IERC20;

    // Governance Gnosis Safe multisig address
    address public governance;
    // Authorized minters
    mapping(address => bool) public minters;
    // Max cap (40,000 BALLE)
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
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig address
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }

    /**
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig address or an authorized minter
     */
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == governance, "!minter");
        _;
    }

    /**
     * @dev Set the new Governance Gnosis Safe multisig address
     */
    function setGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "zero address");
        governance = _governance;
        emit SetGovernance(_governance);
    }

    /**
     * @dev Add a minter address
     */
    function addMinter(address _minter) external onlyGovernance {
        require(_minter != address(0), "zero address");
        minters[_minter] = true;
        emit AddMinter(_minter);
    }

    /**
     * @dev Remove a minter address
     */
    function removeMinter(address _minter) external onlyGovernance {
        require(_minter != address(0), "zero address");
        minters[_minter] = false;
        emit RemoveMinter(_minter);
    }

    /**
     * @dev Creates _amount tokens and assigns them to _to account, increasing
     * the total supply until the cap is reached.
     */
    function mint(address _to, uint256 _amount) external onlyMinter {
        require(ERC20.totalSupply() + _amount <= cap, "!cap");
        _mint(_to, _amount);
    }

    /**
     * @dev Function to use from Governance Gnosis Safe multisig only in case tokens get stuck.
     * This is to be used if someone, for example, sends tokens to the contract by mistake.
     * There is no guarantee governance will vote to return these.
     * No tokens are stored in this contract, so, it's safe to transfer any token.
     */
    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public onlyGovernance {
        require(_to != address(0), "zero address");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
