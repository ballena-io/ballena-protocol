// contracts/staking/BalleRewarder.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BalleRewarder is Ownable {
    using SafeERC20 for IERC20;

    // BALLE token address.
    address public immutable balle;
    // The staking pool contract.
    address public stakingPool;

    /**
     * @dev Stores BALLE funds for the current period and sends them to users.
     */
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
     * @dev Function to use from Governance GNOSIS Safe only in case tokens get stuck. EMERGENCY ONLY.
     */
    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyOwner {
        require(_token != address(0), "zero token address");
        require(_to != address(0), "zero to address");
        require(_amount > 0, "!amount");
        require(_token != balle, "!safe");

        IERC20(_token).safeTransfer(_to, _amount);
    }
}
