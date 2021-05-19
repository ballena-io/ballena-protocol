// contracts/token/BalleMigration.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IMintableERC20.sol";

contract BalleMigration is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public balle;
    IMintableERC20 public balleV2;

    // Governance Gnosis Safe multisig address
    address public governance;

    event Migrate(address indexed addr, uint256 amount);
    event SetGovernance(address indexed addr);

    constructor(address _balle, address _balleV2) {
        require(_balle != address(0), "BALLE address not valid");
        require(_balleV2 != address(0), "BALLEv2 address not valid");
        require(_balle != _balleV2, "Invalid address");

        balle = IERC20(_balle);
        balleV2 = IMintableERC20(_balleV2);
        governance = msg.sender;
    }

    /**
     * @dev Transfer BALLE from wallet, and mint new BALLEv2 to wallet
     */
    function migrate() external nonReentrant {
        require(block.number < 9508744, "too late"); // TODO: update with real end block!
        uint256 amount = balle.balanceOf(msg.sender);
        require(amount > 0, "!amount");
        balle.transferFrom(msg.sender, address(this), amount);
        balleV2.mint(msg.sender, amount);

        emit Migrate(msg.sender, amount);
    }

    /**
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig address
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
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
     * @dev Function to use from Governance Gnosis Safe multisig only in case tokens get stuck.
     * This is to be used if someone, for example, sends tokens to the contract by mistake.
     * There is no guarantee governance will vote to return these.
     */
    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public onlyGovernance {
        require(_to != address(0), "zero address");
        require(_token != address(balle), "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
