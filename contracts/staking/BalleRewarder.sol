// contracts/staking/BalleRewarder.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Implementation of the BALLE Rewarder for the staking pool.
 * This contract will send BALLE rewards to users.
 * It stores the BALLE being distributed in the current period from the staking pool.
 * The owner of the contract is the Governance Gnosis Safe multisig.
 */
contract BalleRewarder is Ownable {
    using SafeERC20 for IERC20;

    // BALLE token address.
    address public immutable balle;
    // The staking pool contract.
    address public stakingPool;

    constructor(address _balle, address _stakingPool) {
        require(_balle != address(0), "!balle");
        require(_stakingPool != address(0), "!stakingPool");

        balle = _balle;
        stakingPool = _stakingPool;
    }

    /**
     * @dev Modifier to check the caller is the owner address or the stakingPool.
     */
    modifier onlyStakingPool() {
        require(msg.sender == owner() || msg.sender == stakingPool, "!stakingPool");
        _;
    }

    /**
     * @dev Function to change the stakingPool address.
     */
    function setStakingPool(address _stakingPool) external onlyOwner {
        require(_stakingPool != address(0), "zero address");
        stakingPool = _stakingPool;
    }

    /**
     * @dev Function to send tokens to the user.
     */
    function sendReward(address _user, uint256 _amount) external onlyStakingPool returns (uint256) {
        require(_user != address(0), "!user");
        require(_amount > 0, "!amount");

        uint256 balance = IERC20(balle).balanceOf(address(this));
        if (_amount > balance) {
            _amount = balance;
        }

        IERC20(balle).safeTransfer(_user, _amount);

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
