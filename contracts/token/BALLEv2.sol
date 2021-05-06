// contracts/token/BALLEv2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BALLEv2 is ERC20 {
    using SafeERC20 for IERC20;

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
     * @dev Modifier to check the caller is the governance address
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }

    /**
     * @dev Modifier to check the caller is the governance address or an authorized minter
     */
    modifier onlyMinter() {
        require(msg.sender == governance || minters[msg.sender], "!governance && !minter");
        _;
    }

    /**
     * @dev Set the new governance address
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
     * @dev Allows governance to take unsupported tokens out of the contract. This is just in case someone seriously messed up.
     * There is no guarantee governance will vote to return these.
     */
    function governanceRecoverUnsupported(
        IERC20 _token,
        address _to,
        uint256 _amount
    ) external onlyGovernance {
        require(_to != address(0), "zero address");
        _token.safeTransfer(_to, _amount);
    }
}
