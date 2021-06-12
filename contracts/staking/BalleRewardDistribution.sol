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

/**
 * @dev Implementation of the BALLE Reward Distribution for the staking pool.
 * This contract will distribute the rewards from Reward Fund to the Rewarder of the Staking.
 * The owner of the contract is the Governance Gnosis Safe multisig.
 */
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

    // 10% fee on reward.
    uint256 public constant REWARD_FEE = 1000;
    // Factor to calculate fee 100 = 1%.
    uint256 public constant REWARD_FEE_MAX = 10000;

    event BalleRewardDistributed(
        address indexed pool,
        uint256 baseAmount,
        uint256 extraAmount,
        uint256 feeAmount,
        uint256 numberOfBlocks,
        uint256 multiplier
    );

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
     * @param _duration: Period for the reward distribution.
     * @param _baseRewardAmount: Reward amount from performance fees to take from BalleRewardFund.
     * @param _multiplier: Multiplier to add Extra reward from new minted BALLE, while there is free supply (100 = 1).
     */
    function distributeReward(
        uint256 _duration,
        uint256 _baseRewardAmount,
        uint256 _multiplier,
        uint256 _rewardStartBlock
    ) external onlyOwner {
        require(_duration > 0, "!duration");
        require(_baseRewardAmount > 0, "!baseRewardAmount");
        require(_multiplier >= 100, "!multiplier");
        require(stakingPool != address(0), "!stakingPool");
        require(rewarder != address(0), "!rewarder");

        // Check if rewardFund has balance.
        uint256 rewardFundBalance = IERC20(balle).balanceOf(rewardFund);
        require(rewardFundBalance >= _baseRewardAmount, "!rewardFundBalance");

        // Extra Reward amount.
        uint256 extraRewardAmount = ((_baseRewardAmount * _multiplier) / 100) - _baseRewardAmount;
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
            _multiplier = ((extraRewardAmount + _baseRewardAmount) * 100) / _baseRewardAmount;
        }

        // Send BALLE from RewardFund.
        IBalleRewardFund(rewardFund).sendRewardAmount(rewarder, _baseRewardAmount);

        // Reward fee, the fee will allways come from extra reward.
        uint256 rewardFee = ((_baseRewardAmount + extraRewardAmount) * REWARD_FEE) / REWARD_FEE_MAX;
        if (extraRewardAmount < rewardFee) {
            rewardFee = extraRewardAmount;
        } else {
            balle.mint(rewarder, extraRewardAmount - rewardFee);
        }
        if (rewardFee > 0) {
            balle.mint(treasury, rewardFee);
        }

        // Add reward to staking pool.
        IBalleStakingPool(stakingPool).addReward(
            _baseRewardAmount + extraRewardAmount - rewardFee,
            _duration / 3,
            _multiplier,
            _rewardStartBlock
        );

        emit BalleRewardDistributed(
            stakingPool,
            _baseRewardAmount,
            extraRewardAmount,
            rewardFee,
            _duration / 3,
            _multiplier
        );
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
    ) public onlyOwner {
        require(_to != address(0), "zero address");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
