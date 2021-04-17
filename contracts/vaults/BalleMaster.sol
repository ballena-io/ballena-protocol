// contracts/vaults/BalleMaster.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../token/BALLEv2.sol";

/**
 * @dev Implementation of the Master of BALLE.
 * This contract will take care of all rewards calculations and distribution of BALLE tokens in vaults.
 * It's ownable and the owner is the only who can manage the active vaults and it's parameters for rewards distribution.
 * The ownership will be transferred to the Governance GNOSIS Safe.
 */
contract BalleMaster is Ownable {
    using SafeERC20 for IERC20;

    // Info of each user
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of BALLEs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * vault.accBallePerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a vault. Here's what happens:
        //   1. The vault's `accBallePerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each vault
    struct VaultInfo {
        IERC20 lpToken; // Address of LP token contract.
        IERC20 want; // Address of the want token.
        uint256 allocPoint; // How many allocation points assigned to this vault. BALLEs to distribute per block.
        uint256 lastRewardBlock; // Last block number that BALLEs distribution occurs.
        uint256 accBallePerShare; // Accumulated BALLEs per share, times 1e12. See below.
        address strat; // Strategy address that will auto compound want tokens
    }

    // The BALLE token.
    BALLEv2 public balle;
    // BALLE tokens created per block.
    uint256 public ballePerBlock = 2283105022831050;
    // BALLE tokens to distribute
    uint256 public balleTotalRewards = 24000e18;
    // The block number when BALLE rewards distribution starts.
    uint256 public startBlock;

    // Info of each vault.
    VaultInfo[] public vaultInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    // Total allocation points. Must be the sum of all allocation points in all vaults.
    uint256 public totalAllocPoint = 0;

    event Deposit(address indexed user, uint256 indexed vid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed vid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed vid, uint256 amount);

    constructor(BALLEv2 _balle) {
        balle = _balle;
    }
}
