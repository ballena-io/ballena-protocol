// contracts/staking/BalleRewardFund.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BalleRewardFund is Ownable {
    using SafeERC20 for IERC20;

    // BALLE token address
    address public balle;
    // The reward distribution contract.
    address public rewardDistribution;

    /**
     * @dev Store of funds to be rewarded by BALLE staking pool.
     */
    constructor(address _balle) {
        require(_balle != address(0), "!balle");

        balle = _balle;
    }

    /**
     * @dev Modifier to check the caller is the owner address or the rewardDistribution.
     */
    modifier onlyRewardDistribution() {
        require(msg.sender == owner() || msg.sender == rewardDistribution, "!rewardDistribution");
        _;
    }

    /**
     * @dev Function to change the rewardDistribution address.
     */
    function setRewardDistribution(address _rewardDistribution) public onlyOwner {
        require(_rewardDistribution != address(0), "zero address");
        rewardDistribution = _rewardDistribution;
    }

    /**
     * @dev Function to transfer tokens to the rewarder.
     */
    function sendRewardAmount(address _rewarder, uint256 _amount) public onlyRewardDistribution returns (uint256) {
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
     * @dev Function to use from Governance GNOSIS Safe only in case tokens get stuck. EMERGENCY ONLY.
     */
    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public onlyOwner {
        require(_token != address(0), "zero token address");
        require(_to != address(0), "zero to address");
        require(_amount > 0, "!amount");
        require(_token != balle, "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
