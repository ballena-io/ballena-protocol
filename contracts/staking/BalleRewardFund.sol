// contracts/staking/BalleRewardFund.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Implementation of the BALLE Reward Fund for the staking pool.
 * This contract will store BALLE from fees to be rewarded to BALLE holders via the staking pool.
 * The owner of the contract is the Governance Gnosis Safe multisig.
 */
contract BalleRewardFund is Ownable {
    using SafeERC20 for IERC20;

    // BALLE token address.
    address public immutable balle;
    // The reward distribution contract.
    address public rewardDistribution;

    constructor(address _balle) {
        require(_balle != address(0), "!balle");

        balle = _balle;
    }

    /**
     * @dev Modifier to check the caller is the Governance Gnosis Safe multisig or the rewardDistribution address.
     */
    modifier onlyRewardDistribution() {
        require(msg.sender == owner() || msg.sender == rewardDistribution, "!rewardDistribution");
        _;
    }

    /**
     * @dev Function to change the rewardDistribution address.
     */
    function setRewardDistribution(address _rewardDistribution) external onlyOwner {
        require(_rewardDistribution != address(0), "zero address");
        rewardDistribution = _rewardDistribution;
    }

    /**
     * @dev Function to transfer tokens to the rewarder.
     */
    function sendRewardAmount(address _rewarder, uint256 _amount) external onlyRewardDistribution returns (uint256) {
        require(_rewarder != address(0), "!rewarder");
        require(_amount > 0, "!amount");

        uint256 balance = IERC20(balle).balanceOf(address(this));
        if (_amount > balance) {
            _amount = balance;
        }

        IERC20(balle).safeTransfer(_rewarder, _amount);

        return _amount;
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
    ) public onlyOwner {
        require(_to != address(0), "zero address");
        require(_token != address(balle), "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
