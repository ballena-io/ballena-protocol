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
    address public wantToken;
    address public govAddress;
    uint256 public depositTotal = 0;
    uint256 public sharesTotal = 0;

    constructor(
        address _balleMaster,
        address _depositToken,
        address _wantToken
    ) {
        balleMaster = _balleMaster;
        depositToken = _depositToken;
        wantToken = _wantToken;

        transferOwnership(_balleMaster);
    }

    // Main compounding function
    function earn() external {
        require(msg.sender == govAddress, "!gov");
        uint256 earned = (IERC20(depositToken).balanceOf(address(this)) * 5) / 100;
        IMintableERC20(depositToken).mint(address(this), earned);
    }

    // Transfer tokens balleMaster -> strategy
    function deposit(uint256 _amount) public onlyOwner returns (uint256) {
        IERC20(depositToken).safeTransferFrom(address(msg.sender), address(this), _amount);

        uint256 sharesAdded = _amount;
        if (depositTotal > 0) {
            sharesAdded = (_amount * sharesTotal) / depositTotal;
        }
        sharesTotal = sharesTotal + sharesAdded;
        depositTotal = depositTotal + _amount;
        return sharesAdded;
    }

    // Transfer tokens strategy -> balleMaster
    function withdraw(uint256 _amount)
        public
        onlyOwner
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        require(_amount > 0, "_amount <= 0");

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

        // TODO: take account of want token different of deposit token (not auto compound strategy)
        uint256 wantAmt = _amount;

        return (sharesRemoved, _amount, wantAmt);
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
        require(_token != wantToken, "!safe");
        require(_token != depositToken, "!safe");
        IERC20(_token).safeTransfer(_to, _amount);
    }
}
