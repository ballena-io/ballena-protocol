// contracts/staking/BalleStakingPoolV1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IBalleRewarder.sol";

/**
 * @dev Implementation of the BALLE Staking Pool.
 * This pool distributes platform performance fee.
 * The owner of the contract is the Governance Gnosis Safe multisig.
 */
contract BalleStakingPoolV1 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Info of each user
    struct UserInfo {
        uint256 amount; // How many staked tokens the user has provided.
        uint256 rewardDebt; // Reward debt.
        //
        // We do some fancy math here. Basically, any point in time, the amount of BALLEs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * accTokenPerShare) / 1e12 - user.rewardDebt
        //
        // Whenever a user stakes or withdraws tokens to the pool. Here's what happens:
        //   1. The pool's `accTokenPerShare` and `lastRewardBlock` gets updated.
        //   2. User receives the pending reward sent to his address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // The staked token.
    address public immutable stakedToken;
    // The reward token.
    address public immutable rewardToken;
    // The rewarder contract.
    address public rewarder;
    // The reward distribution contract.
    address public rewardDistribution;
    // Security Gnosis Safe multisig.
    address public security;
    // Accrued token per share.
    uint256 public accTokenPerShare;
    // The block number when rewards start.
    uint256 public rewardStartBlock;
    // The block number when rewards end.
    uint256 public rewardEndBlock;
    // The block number of the last pool update.
    uint256 public lastRewardBlock;
    // Reward tokens per block.
    uint256 public rewardPerBlock;
    // The extra reward multiplier applied over the amount from fees (100 = 1).
    uint256 public extraRewardMultiplier;
    // Total staked tokens amount.
    uint256 public totalSupply;

    // Info of each user that stakes tokens (stakedToken).
    mapping(address => UserInfo) public userInfo;

    // The pool is finished, no staking can be made and no more rewards will be distributed.
    bool public finished;

    event Deposit(address indexed user, uint256 amount, uint256 reward);
    event Withdraw(address indexed user, uint256 amount, uint256 reward);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount, uint256 numberOfBlocks, uint256 multiplier);
    event RewardsStop();
    event PoolFinish();

    /**
     * @dev BALLE Rewards staking pool.
     * @param _stakedToken: staked token address.
     * @param _rewardToken: reward token address.
     * @param _rewardDistribution: reward distribution contract address.
     */
    constructor(
        address _stakedToken,
        address _rewardToken,
        address _rewardDistribution
    ) {
        require(_stakedToken != address(0), "!stakedToken");
        require(_rewardToken != address(0), "!rewardToken");
        require(_rewardDistribution != address(0), "!rewardDistribution");

        stakedToken = _stakedToken;
        rewardToken = _rewardToken;
        rewardDistribution = _rewardDistribution;
    }

    /**
     * @dev Function to change the rewarder address.
     */
    function setRewarder(address _rewarder) external onlyOwner {
        require(_rewarder != address(0), "zero address");
        rewarder = _rewarder;
    }

    /**
     * @dev Function to change the rewardDistribution address.
     */
    function setRewardDistribution(address _rewardDistribution) external onlyOwner {
        require(_rewardDistribution != address(0), "zero address");
        rewardDistribution = _rewardDistribution;
    }

    /**
     * @dev Function to change the Security Gnosis Safe multisig.
     */
    function setSecurity(address _security) external onlyOwner {
        require(_security != address(0), "zero address");
        security = _security;
    }

    /**
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig address or the rewardDistribution.
     */
    modifier onlyRewardDistribution() {
        require(msg.sender == rewardDistribution || msg.sender == owner(), "!rewardDistribution");
        _;
    }

    /**
     * @dev Modifier to check the caller is the Governance or Security Gnosis Safe multisig.
     */
    modifier onlySecurity() {
        require(msg.sender == owner() || msg.sender == security, "!security");
        _;
    }

    /**
     * @dev Internal stake function.
     * @param _amount: amount to stake (in stakedToken).
     */
    function _stake(uint256 _amount) internal {
        require(_amount > 0, "!amount");
        require(rewarder != address(0), "!rewarder");
        require(!finished, "finished");
        UserInfo storage user = userInfo[msg.sender];

        updatePool();

        uint256 pending = 0;
        if (user.amount > 0) {
            pending = (user.amount * accTokenPerShare) / 1e12 - user.rewardDebt;
        }

        user.amount = user.amount + _amount;
        totalSupply = totalSupply + _amount;
        user.rewardDebt = (user.amount * accTokenPerShare) / 1e12;

        if (pending > 0) {
            IBalleRewarder(rewarder).sendReward(address(msg.sender), rewardToken, pending);
        }
        IERC20(stakedToken).safeTransferFrom(address(msg.sender), address(this), _amount);

        emit Deposit(msg.sender, _amount, pending);
    }

    /**
     * @dev Stake tokens to the pool and collect reward tokens (if any).
     * @param _amount: amount to stake (in stakedToken).
     */
    function stake(uint256 _amount) external nonReentrant {
        _stake(_amount);
    }

    /**
     * @dev Stake all stakedToken balance on user wallet to the pool and collect reward tokens (if any).
     */
    function stakeAll() external nonReentrant {
        _stake(IERC20(stakedToken).balanceOf(msg.sender));
    }

    /**
     * @dev Internal withdraw
     * @param _amount: amount to withdraw (in stakedToken).
     */
    function _withdraw(uint256 _amount) internal {
        UserInfo storage user = userInfo[msg.sender];
        if (_amount > user.amount) {
            _amount = user.amount;
        }

        updatePool();

        uint256 pending = (user.amount * accTokenPerShare) / 1e12 - user.rewardDebt;

        if (_amount > 0) {
            // Take care of rounding issues.
            uint256 bal = IERC20(stakedToken).balanceOf(address(this));
            if (bal < _amount) {
                _amount = bal;
                user.amount = 0;
                totalSupply = 0;
            } else {
                user.amount = user.amount - _amount;
                totalSupply = totalSupply - _amount;
            }
            user.rewardDebt = (user.amount * accTokenPerShare) / 1e12;

            IERC20(stakedToken).safeTransfer(address(msg.sender), _amount);
        }

        if (pending > 0) {
            IBalleRewarder(rewarder).sendReward(address(msg.sender), rewardToken, pending);
        }

        emit Withdraw(msg.sender, _amount, pending);
    }

    /**
     * @dev Withdraw staked tokens and collect reward tokens (if any).
     * @param _amount: amount to withdraw (in stakedToken).
     */
    function withdraw(uint256 _amount) external nonReentrant {
        _withdraw(_amount);
    }

    /**
     * @dev Withdraw all user's staked tokens and collect reward (if any).
     */
    function withdrawAll() external nonReentrant {
        _withdraw(type(uint256).max);
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
            // Take care of rounding issues.
            uint256 bal = IERC20(stakedToken).balanceOf(address(this));
            if (bal < amountToTransfer) {
                amountToTransfer = bal;
            }
            totalSupply = totalSupply - amountToTransfer;
            IERC20(stakedToken).safeTransfer(address(msg.sender), amountToTransfer);
        }

        emit EmergencyWithdraw(msg.sender, amountToTransfer);
    }

    /**
     * @dev View function to see total staked value on frontend.
     * @param _user: user address.
     * @return Total staked for a given user.
     */
    function balanceOf(address _user) external view returns (uint256) {
        return userInfo[_user].amount;
    }

    /**
     * @dev View function to see pending reward on frontend.
     * @param _user: user address.
     * @return Pending reward for a given user.
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        if (block.number > lastRewardBlock && totalSupply != 0) {
            uint256 multiplier = getBlockMultiplier(lastRewardBlock, block.number);
            uint256 reward = multiplier * rewardPerBlock;
            uint256 adjustedTokenPerShare = accTokenPerShare + (reward * 1e12) / totalSupply;
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

        totalSupply = IERC20(stakedToken).balanceOf(address(this));

        if (totalSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 multiplier = getBlockMultiplier(lastRewardBlock, block.number);
        uint256 reward = multiplier * rewardPerBlock;
        accTokenPerShare = accTokenPerShare + (reward * 1e12) / totalSupply;
        lastRewardBlock = block.number;
    }

    /**
     * @dev Return reward multiplier over the given _from to _to block.
     * @param _from: block to start.
     * @param _to: block to finish.
     */
    function getBlockMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_from <= rewardStartBlock) {
            if (_to > rewardStartBlock) {
                _from = rewardStartBlock;
            } else {
                _from = _to;
            }
        }
        if (_to <= rewardEndBlock) {
            return _to - _from;
        } else if (_from >= rewardEndBlock) {
            return 0;
        } else {
            return rewardEndBlock - _from;
        }
    }

    /**
     * @dev Add reward to distribute.
     * The funds should be transferred to the Rewarder contract.
     * @param _amount: the reward amount to distribute.
     * @param _numberOfBlocks: the num of blocks for the period of distribution.
     * @param _multiplier: extra reward multiplier (100 = 1).
     * @param _rewardStartBlock: only for the first distribution, start block of rewards.
     */
    function addReward(
        uint256 _amount,
        uint256 _numberOfBlocks,
        uint256 _multiplier,
        uint256 _rewardStartBlock
    ) external onlyRewardDistribution {
        require(_amount > 0, "!amount");
        require(_numberOfBlocks >= (24 * 60 * 20), "!numberOfBlocks");
        require(_multiplier >= 100, "!multiplier");
        require(!finished, "finished");

        updatePool();

        if (block.number >= rewardEndBlock) {
            // Previous reward period already finished.
            rewardPerBlock = _amount / _numberOfBlocks;
            if (rewardStartBlock == 0) {
                if (_rewardStartBlock == 0) {
                    rewardStartBlock = block.number;
                } else {
                    rewardStartBlock = _rewardStartBlock;
                }
            }
        } else {
            // Previous reward period still not finished, add leftover.
            uint256 remaining = rewardEndBlock - block.number;
            uint256 leftover = remaining * rewardPerBlock;
            rewardPerBlock = (_amount + leftover) / _numberOfBlocks;
        }
        rewardEndBlock = block.number + _numberOfBlocks;
        extraRewardMultiplier = _multiplier;

        emit RewardAdded(_amount, _numberOfBlocks, _multiplier);
    }

    /**
     * @dev Stop rewards.
     */
    function stopRewards() external onlySecurity {
        rewardEndBlock = block.number;

        emit RewardsStop();
    }

    /**
     * @dev Finish pool.
     */
    function finish() external onlySecurity {
        require(!finished, "finished");

        if (rewardEndBlock > block.number) {
            rewardEndBlock = block.number;
        }
        finished = true;

        emit PoolFinish();
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
    ) external onlyOwner {
        require(_to != address(0), "zero address");
        require(_token != stakedToken, "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
