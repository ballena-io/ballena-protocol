// contracts/staking/BalleRewardPoolV1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IBalleRewarder.sol";

contract BalleRewardPoolV1 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Accrued token per share
    uint256 public accTokenPerShare;
    // The block number when rewards start.
    uint256 public rewardStartBlock;
    // The block number when rewards end.
    uint256 public rewardEndBlock;
    // The block number of the last pool update
    uint256 public lastRewardBlock;
    // Reward tokens per block.
    uint256 public rewardPerBlock;
    // The reward token.
    address public rewardToken;
    // The staked token.
    address public stakedToken;
    // The rewarder contract.
    address public rewarder;

    // Info of each user that stakes tokens (stakedToken)
    mapping(address => UserInfo) public userInfo;

    struct UserInfo {
        uint256 amount; // How many staked tokens the user has provided
        uint256 rewardDebt; // Reward debt
    }

    event Deposit(address indexed user, uint256 amount, uint256 reward);
    event Withdraw(address indexed user, uint256 amount, uint256 reward);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount, uint256 numberOfBlocks);
    event RewardsStop(uint256 blockNumber);

    /**
     * @dev BALLE Rewards staking pool
     * @param _stakedToken: staked token address
     * @param _rewardToken: reward token address
     * @param _rewarder: rewarder contract address
     * @param _governance: governance address with ownership
     */
    constructor(
        address _stakedToken,
        address _rewardToken,
        address _rewarder,
        address _governance
    ) {
        require(_stakedToken != address(0), "!stakedToken");
        require(_rewardToken != address(0), "!rewardToken");
        require(_rewarder != address(0), "!rewarder");

        stakedToken = _stakedToken;
        rewardToken = _rewardToken;
        rewarder = _rewarder;

        // Transfer ownership to the governance address who becomes owner of the contract
        transferOwnership(_governance);
    }

    /**
     * @dev Function to change the rewarder address.
     */
    function setRewarder(address _rewarder) public onlyOwner {
        require(_rewarder != address(0), "!rewarder");
        rewarder = _rewarder;
    }

    /**
     * @dev Deposit staked tokens and collect reward tokens (if any)
     * @param _amount: amount to deposit (in stakedToken)
     */
    function deposit(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];

        updatePool();

        uint256 pending = 0;
        if (user.amount > 0) {
            pending = (user.amount * accTokenPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                IBalleRewarder(rewarder).sendReward(address(msg.sender), rewardToken, pending);
            }
        }

        if (_amount > 0) {
            user.amount = user.amount + _amount;
            IERC20(stakedToken).safeTransferFrom(address(msg.sender), address(this), _amount);
        }

        user.rewardDebt = (user.amount * accTokenPerShare) / 1e12;

        emit Deposit(msg.sender, _amount, pending);
    }

    /**
     * @dev Withdraw staked tokens and collect reward tokens (if any)
     * @param _amount: amount to withdraw (in stakedToken)
     */
    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        if (_amount > user.amount) {
            _amount = user.amount;
        }

        updatePool();

        uint256 pending = (user.amount * accTokenPerShare) / 1e12 - user.rewardDebt;

        if (_amount > 0) {
            user.amount = user.amount - _amount;
            IERC20(stakedToken).safeTransfer(address(msg.sender), _amount);
        }

        if (pending > 0) {
            IBalleRewarder(rewarder).sendReward(address(msg.sender), rewardToken, pending);
        }

        user.rewardDebt = (user.amount * accTokenPerShare) / 1e12;

        emit Withdraw(msg.sender, _amount, pending);
    }

    /**
     * @dev Withdraw all staked tokens without caring about rewards. EMERGENCY ONLY.
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amountToTransfer = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        if (amountToTransfer > 0) {
            IERC20(stakedToken).safeTransfer(address(msg.sender), amountToTransfer);
        }

        emit EmergencyWithdraw(msg.sender, user.amount);
    }

    /**
     * @dev Function to use from Governance GNOSIS Safe only.
     * It allows to recover wrong tokens sent to the contract.
     * @param _tokenAddress: the address of the token to withdraw
     * @param _tokenAmount: the number of tokens to withdraw
     */
    function inCaseTokensGetStuck(address _tokenAddress, uint256 _tokenAmount) external onlyOwner {
        require(_tokenAddress != address(stakedToken), "staked token");

        IERC20(_tokenAddress).safeTransfer(address(msg.sender), _tokenAmount);
    }

    /**
     * @dev View function to see pending reward on frontend.
     * @param _user: user address
     * @return Pending reward for a given user
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 stakedTokenSupply = IERC20(stakedToken).balanceOf(address(this));
        if (block.number > lastRewardBlock && stakedTokenSupply != 0) {
            uint256 multiplier = getBlockMultiplier(lastRewardBlock, block.number);
            uint256 reward = multiplier * rewardPerBlock;
            uint256 adjustedTokenPerShare = accTokenPerShare + (reward * 1e12) / stakedTokenSupply;
            return (user.amount * adjustedTokenPerShare) / 1e12 - user.rewardDebt;
        } else {
            return (user.amount * accTokenPerShare) / 1e12 - user.rewardDebt;
        }
    }

    /**
     * @dev Update reward variables of the given pool to be up-to-date.
     */
    function updatePool() internal {
        if (block.number <= lastRewardBlock) {
            return;
        }

        uint256 stakedTokenSupply = IERC20(stakedToken).balanceOf(address(this));

        if (stakedTokenSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getBlockMultiplier(lastRewardBlock, block.number);
        uint256 reward = multiplier * rewardPerBlock;
        accTokenPerShare = accTokenPerShare + (reward * 1e12) / stakedTokenSupply;
        lastRewardBlock = block.number;
    }

    /**
     * @dev Return reward multiplier over the given _from to _to block.
     * @param _from: block to start
     * @param _to: block to finish
     */
    function getBlockMultiplier(uint256 _from, uint256 _to) internal view returns (uint256) {
        if (_to <= rewardEndBlock) {
            return _to - _from;
        } else if (_from >= rewardEndBlock) {
            return 0;
        } else {
            return rewardEndBlock - _from;
        }
    }

    /**
     * @dev Add reward to distribute. Only callable from Governance GNOSIS Safe.
     * The funds should be transferred to the Rewarder contract.
     * @param _amount: the reward amount to distribute.
     * @param _numberOfBlocks: the num of blocks for the reward distribution.
     */
    function addReward(uint256 _amount, uint256 _numberOfBlocks) external onlyOwner {
        updatePool();
        if (block.number >= rewardEndBlock) {
            // Previous reward period already finished.
            rewardPerBlock = _amount / _numberOfBlocks;
            if (rewardStartBlock == 0) {
                rewardStartBlock = block.number;
            }
        } else {
            // Previous reward period still not finished, add leftover.
            uint256 remaining = rewardEndBlock - block.number;
            uint256 leftover = remaining * rewardPerBlock;
            rewardPerBlock = (_amount + leftover) / _numberOfBlocks;
        }
        rewardEndBlock = block.number + _numberOfBlocks;

        emit RewardAdded(_amount, _numberOfBlocks);
    }

    /**
     * @dev Stop rewards. Only callable from Governance GNOSIS Safe.
     */
    function stopReward() external onlyOwner {
        rewardEndBlock = block.number;
    }
}
