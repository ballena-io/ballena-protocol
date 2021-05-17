// contracts/staking/BalleRewardDistribution.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../token/BALLEv2.sol";
import "../interfaces/IBalleMaster.sol";
import "../interfaces/IBalleRewardFund.sol";
import "../interfaces/IBalleStakingPool.sol";

contract BalleRewardDistribution is Ownable {
    using SafeERC20 for IERC20;

    // BALLE token address.
    BALLEv2 public immutable balle;
    // The BalleMaster contract.
    IBalleMaster public immutable balleMaster;

    // The treasury contract.
    address public treasury;
    // The rewardFund contract.
    address public rewardFund;
    // The staking pool contract.
    address public stakingPool;
    // The staking pool rewarder contract.
    address public rewarder;

    // 10% fee on extra reward.
    uint256 public constant EXTRA_REWARD_FEE = 1000;
    // Factor to calculate fee 100 = 1%.
    uint256 public constant EXTRA_REWARD_FEE_MAX = 10000;

    event BalleRewardDistributed(
        address indexed pool,
        uint256 baseAmount,
        uint256 extraAmount,
        uint256 feeAmount,
        uint256 numberOfBlocks,
        uint256 multiplier
    );

    /**
     * @dev Distributes rewards to BALLE staking pool.
     */
    constructor(
        address _balle,
        address _balleMaster,
        address _treasury,
        address _rewardFund
    ) {
        require(_balle != address(0), "!balle");
        require(_balleMaster != address(0), "!balleMaster");
        require(_treasury != address(0), "!treasury");
        require(_rewardFund != address(0), "!rewardFund");

        balle = BALLEv2(_balle);
        balleMaster = IBalleMaster(_balleMaster);
        treasury = _treasury;
        rewardFund = _rewardFund;
    }

    /**
     * @dev Function to change the treasury address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "zero address");
        treasury = _treasury;
    }

    /**
     * @dev Function to change the rewardFund address.
     */
    function setRewardFund(address _rewardFund) external onlyOwner {
        require(_rewardFund != address(0), "zero address");
        rewardFund = _rewardFund;
    }

    /**
     * @dev Function to change the stakingPool address.
     */
    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "zero address");
        stakingPool = _stakingPool;
    }

    /**
     * @dev Function to change the rewarder address.
     */
    function setRewarder(address _rewarder) external onlyOwner {
        require(_rewarder != address(0), "zero address");
        rewarder = _rewarder;
    }

    /**
     * @dev Function to distribute reward.
     * @param _duration: Period for the reward distribution. From 24h to 7 days.
     * @param _baseRewardAmount: Reward amount from performance fees to take from BalleRewardFund.
     * @param _multiplier: Extra reward amount to add from new minted BALLE, while there is free supply (100 = 1).
     */
    function distributeReward(
        uint256 _duration,
        uint256 _baseRewardAmount,
        uint256 _multiplier
    ) external onlyOwner {
        require(_duration >= 24 hours, "!min duration");
        require(_duration <= 7 days, "!max duration");
        require(_baseRewardAmount > 0, "!baseRewardAmount");
        require(_multiplier >= 100, "!multiplier");
        require(stakingPool != address(0), "!stakingPool");
        require(rewarder != address(0), "!rewarder");

        // Check if rewardFund has balance.
        uint256 rewardFundBalance = IERC20(balle).balanceOf(rewardFund);
        require(rewardFundBalance >= _baseRewardAmount, "!rewardFundBalance");

        // Extra Reward amount.
        uint256 extraRewardAmount = (_baseRewardAmount * _multiplier) / 100;
        // Check if we can mint extraRewardAmount new BALLE.
        uint256 toBeMintedOnVaults = 0;
        if (block.number < balleMaster.endBlock()) {
            toBeMintedOnVaults = (balleMaster.endBlock() - block.number) * balleMaster.ballePerBlock();
        }
        toBeMintedOnVaults = toBeMintedOnVaults + balleMaster.balleToMint();
        uint256 freeSupply = balle.cap() - balle.totalSupply() - toBeMintedOnVaults;
        if (extraRewardAmount > freeSupply) {
            // recalculate to fit BALLE cap.
            extraRewardAmount = freeSupply;
            _multiplier = (extraRewardAmount * 100) / _baseRewardAmount;
        }

        // Extra Reward fee.
        uint256 extraRewardFee = (extraRewardAmount * EXTRA_REWARD_FEE) / EXTRA_REWARD_FEE_MAX;

        // Send BALLE from RewardFund.
        IBalleRewardFund(rewardFund).sendRewardAmount(rewarder, _baseRewardAmount);

        // Mint BALLE.
        balle.mint(treasury, extraRewardFee);
        balle.mint(rewarder, extraRewardAmount - extraRewardFee);

        // Add reward to staking pool.
        IBalleStakingPool(stakingPool).addReward(
            _baseRewardAmount + extraRewardAmount - extraRewardFee,
            _duration / 3,
            _multiplier
        );

        emit BalleRewardDistributed(
            stakingPool,
            _baseRewardAmount,
            extraRewardAmount - extraRewardFee,
            extraRewardFee,
            _duration / 3,
            _multiplier
        );
    }

    /**
     * @dev Function to use from Governance GNOSIS Safe only in case tokens get stuck. EMERGENCY ONLY.
     * This contract will not store tokens, so, is safe to take out any token sent by mistake.
     */
    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyOwner {
        require(_token != address(0), "zero token address");
        require(_to != address(0), "zero to address");
        require(_amount > 0, "!amount");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
