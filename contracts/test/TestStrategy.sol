// contracts/mocks/TestStrategy.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IMintableERC20.sol";

contract TestStrategy is Ownable {
    using SafeERC20 for IERC20;

    address public balleMaster;
    address public depositToken;
    address public govAddress;
    uint256 public depositTotal = 0;
    uint256 public sharesTotal = 0;
    // Not needed variables, only for this testing strategy to work
    bool public paused = false;
    bool public retired = false;

    /**
     * @dev Implementation of strategy for testing.
     * The strategy will "mine" TEST_LP tokens to simulate a working farm for testing purpouses.
     * It's very simple to facilitate testing. Every time it's harvested, it will add 1% to TEST_LP balance.
     * Will be improved to test fee distribution, etc.
     */
    constructor(address _balleMaster, address _depositToken) {
        balleMaster = _balleMaster;
        depositToken = _depositToken;

        govAddress = msg.sender;
        transferOwnership(_balleMaster);
    }

    /**
     * @dev Function to harvest benefits and implement strategy steps.
     * It will increase deposited tokens by 1% every time it's called.
     */
    function harvest() external {
        require(msg.sender == govAddress, "!gov");

        if (depositTotal == 0) {
            return;
        }

        uint256 earned = IERC20(depositToken).balanceOf(address(this)) / 100;
        // autocompounding strategy
        depositTotal = depositTotal + earned;
        IMintableERC20(depositToken).mint(address(this), earned);
    }

    /**
     * @dev Function to transfer tokens BalleMaster -> strategy and put it to work.
     * It will leave the tokens here, strategy only for testing purpouses.
     */
    function deposit(address _user, uint256 _amount) public onlyOwner returns (uint256) {
        require(_user != address(0), "!user");
        require(_amount > 0, "!amount");

        IERC20(depositToken).safeTransferFrom(address(msg.sender), address(this), _amount);

        uint256 sharesAdded = _amount;
        if (depositTotal > 0) {
            sharesAdded = (_amount * sharesTotal) / depositTotal;
        }
        sharesTotal = sharesTotal + sharesAdded;
        depositTotal = depositTotal + _amount;
        return sharesAdded;
    }

    /**
     * @dev Function to transfer tokens strategy -> BalleMaster.
     */
    function withdraw(address _user, uint256 _amount) public onlyOwner returns (uint256, uint256) {
        require(_user != address(0), "!user");
        require(_amount > 0, "!amount");

        uint256 depositAmt = IERC20(depositToken).balanceOf(address(this));
        if (_amount > depositAmt) {
            _amount = depositAmt;
        }

        if (depositTotal < _amount) {
            _amount = depositTotal;
        }

        uint256 sharesRemoved = (_amount * sharesTotal) / depositTotal;
        if (sharesRemoved > sharesTotal) {
            sharesRemoved = sharesTotal;
        }
        sharesTotal = sharesTotal - sharesRemoved;
        depositTotal = depositTotal - _amount;

        IERC20(depositToken).safeTransfer(msg.sender, _amount);

        return (sharesRemoved, _amount);
    }

    function upgradeTo(address _strat) external onlyOwner returns (uint256, uint256) {
        require(_strat != address(0), "!strat");
        // A real strategy would prepare to upgrade (remove tokens from farm)
        // Set allowance for new strat contract
        uint256 depositAmt = IERC20(depositToken).balanceOf(address(this));
        IERC20(depositToken).safeIncreaseAllowance(_strat, depositAmt);
        return (sharesTotal, depositAmt);
    }

    function emergencyUpgradeTo(address _strat) external onlyOwner returns (uint256, uint256) {
        require(_strat != address(0), "!strat");
        // A real strategy would prepare to upgrade (remove tokens from farm)
        // Set allowance for new strat contract
        uint256 depositAmt = IERC20(depositToken).balanceOf(address(this));
        IERC20(depositToken).safeIncreaseAllowance(_strat, depositAmt);
        return (sharesTotal, depositAmt);
    }

    function upgradeFrom(
        address _strat,
        uint256 _sharesTotal,
        uint256 _depositAmt
    ) external onlyOwner {
        require(_strat != address(0), "!strat");
        // A real strategy would prepare to upgrade (remove tokens from farm)
        // Transfer tokens

        IERC20(depositToken).safeTransferFrom(_strat, address(this), _depositAmt);
        depositTotal = IERC20(depositToken).balanceOf(address(this));

        sharesTotal = _sharesTotal;

        // A real strategy would finish to upgrade (send tokens to farm)
    }

    function pause() external onlyOwner {
        // A real strategy would enter pause mode:
        //   - Remove tokens from farm
        //   - Clear allowances of third party contracts

        // Updating state, not needed on a real one
        paused = true;
    }

    function unpause() external onlyOwner {
        // A real strategy would enter active mode:
        //   - Set allowances to third party contracts
        //   - Send tokens to farm

        // Updating state, not needed on a real one
        paused = false;
    }

    function panic() external onlyOwner {
        // A real strategy would panic exit farm:
        //   - Remove tokens from farm with emergencyWithdraw
        //   - Clear allowances of third party contracts

        // Updating state, not needed on a real one
        paused = true;
    }

    function retire() external onlyOwner {
        // A real strategy would enter retired mode:
        //   - Remove tokens from farm
        //   - Clear allowances of third party contracts

        // Updating state, not needed on a real one
        paused = true;
    }

    function setGov(address _govAddress) public {
        require(msg.sender == govAddress, "!gov");
        govAddress = _govAddress;
    }

    function inCaseTokensGetStuck(
        address _token,
        uint256 _amount,
        address _to
    ) public {
        require(msg.sender == govAddress, "!gov");
        require(_token != depositToken, "!safe");
        IERC20(_token).safeTransfer(_to, _amount);
    }
}
