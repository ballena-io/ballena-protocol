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
    // Rewarder contract address
    address public rewarder;

    /**
     * @dev Store of funds to be rewarded by BALLE staking pool.
     */
    constructor(address _balle, address _rewarder) {
        require(_balle != address(0), "!balle");
        require(_rewarder != address(0), "!rewarder");

        balle = _balle;
        rewarder = _rewarder;
    }

    /**
     * @dev Function to change the rewarder address.
     */
    function setRewarder(address _rewarder) public onlyOwner {
        require(_rewarder != address(0), "zero address");
        rewarder = _rewarder;
    }

    /**
     * @dev Modifier to check the caller is the rewarder address.
     */
    modifier onlyRewarder() {
        require(msg.sender == rewarder, "!rewarder");
        _;
    }

    /**
     * @dev Function to transfer tokens to the rewarder.
     */
    function sendReward(uint256 _amount) public onlyRewarder returns (uint256) {
        require(_amount > 0, "!amount");

        uint256 balance = IERC20(balle).balanceOf(address(this));
        if (_amount > balance) {
            _amount = balance;
        }

        IERC20(balle).safeTransfer(address(msg.sender), _amount);

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
