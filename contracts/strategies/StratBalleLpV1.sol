// contracts/strategies/StratBalleLpV1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @dev Implementation of the BALLE LP Strategy.
 * This contract will hold BALLE LP Tokens on vault.
 * The owner of the contract is the BalleMaster contract.
 */
contract StratBalleLpV1 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Deposit token (LP) address.
    address public immutable depositToken;

    // Governance Gnosis Safe multisig.
    address public governance;

    uint256 public depositTotal = 0;
    uint256 public sharesTotal = 0;

    // Paused state activated
    bool public paused = false;

    event SetGovernance(address indexed addr);

    /**
     * @dev Implementation of BALLE LP strategy.
     */
    constructor(address _depositToken, address _balleMaster) {
        require(_depositToken != address(0), "!depositToken");
        require(_balleMaster != address(0), "!balleMaster");

        depositToken = _depositToken;
        governance = msg.sender;
        // The owner of the strategy contract is the BalleMaster contract
        transferOwnership(_balleMaster);
    }

    /**
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig.
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }

    /**
     * @dev Modifier to check that the strategy is not paused.
     */
    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    /**
     * @dev Modifier to check that the strategy is paused.
     */
    modifier whenPaused() {
        require(paused, "!paused");
        _;
    }

    /**
     * @dev Function to transfer tokens BalleMaster -> strategy.
     */
    function deposit(address _user, uint256 _amount) external onlyOwner whenNotPaused returns (uint256) {
        require(_user != address(0), "!user");

        uint256 sharesAdded = _amount;
        if (depositTotal > 0 && sharesTotal > 0) {
            sharesAdded = (_amount * sharesTotal) / depositTotal;
        }
        sharesTotal = sharesTotal + sharesAdded;
        depositTotal = depositTotal + _amount;

        IERC20(depositToken).safeTransferFrom(msg.sender, address(this), _amount);

        return sharesAdded;
    }

    /**
     * @dev Function to transfer tokens strategy -> BalleMaster.
     */
    function withdraw(address _user, uint256 _amount) external onlyOwner returns (uint256, uint256) {
        require(_user != address(0), "!user");
        require(_amount > 0, "!amount");

        uint256 sharesRemoved = (_amount * sharesTotal) / depositTotal;
        if (sharesRemoved > sharesTotal) {
            sharesRemoved = sharesTotal;
        }
        sharesTotal = sharesTotal - sharesRemoved;

        uint256 balance = IERC20(depositToken).balanceOf(address(this));
        if (_amount > balance) {
            _amount = balance;
        }

        if (depositTotal < _amount) {
            _amount = depositTotal;
        }

        depositTotal = depositTotal - _amount;

        IERC20(depositToken).safeTransfer(msg.sender, _amount);

        return (sharesRemoved, _amount);
    }

    /**
     * @dev Function to change the Governance Gnosis Safe multisig.
     */
    function setGovernance(address _governance) public onlyGovernance {
        require(_governance != address(0), "zero address");
        governance = _governance;
        emit SetGovernance(_governance);
    }

    /**
     * @dev Stop the vault.
     */
    function pause() external onlyOwner whenNotPaused {
        paused = true;
    }

    /**
     * @dev Restart the vault.
     */
    function unpause() external onlyOwner whenPaused {
        paused = false;
    }

    /**
     * @dev Stop the vault.
     */
    function panic() external onlyOwner whenNotPaused {
        paused = true;
    }

    /**
     * @dev Retire the vault.
     */
    function retire() external onlyOwner {
        // Stop vault
        paused = true;
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
    ) external onlyGovernance {
        require(_to != address(0), "zero address");
        require(_token != depositToken, "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
