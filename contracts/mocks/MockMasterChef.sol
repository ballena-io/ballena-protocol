// contracts/mocks/MockMasterChef.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IMintableERC20.sol";

/**
 * @dev Mock contract used for unit tests.
 */
contract MockMasterChef {
    using SafeERC20 for IERC20;

    address public cake;
    address public lpToken;
    uint256 public amount;
    uint256 public cakePerBlock;
    uint256 public lastBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        address _cake,
        address _lpToken,
        uint256 _cakePerBlock
    ) {
        cake = _cake;
        lpToken = _lpToken;
        cakePerBlock = _cakePerBlock;
    }

    /**
     * @dev Mock deposit function. Transfer LP Token from msg.sender.
     * Send pending CAKE if any.
     */
    function deposit(uint256 _pid, uint256 _amount) public {
        require(_pid != 0, "!pid");

        if (amount > 0) {
            uint256 pending = (block.number - lastBlock) * cakePerBlock;
            if (pending > 0) {
                safeCakeTransfer(msg.sender, pending);
            }
            lastBlock = block.number;
        }

        if (_amount > 0) {
            IERC20(lpToken).safeTransferFrom(address(msg.sender), address(this), _amount);
            amount = amount + _amount;
            if (lastBlock == 0) {
                lastBlock = block.number;
            }
        }
        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev Mock withdraw function. Transfer LP Token to msg.sender.
     * Send pending CAKE if any.
     */
    function withdraw(uint256 _pid, uint256 _amount) public {
        require(_pid != 0, "!pid");

        require(amount >= _amount, "!amount");
        uint256 pending = (block.number - lastBlock) * cakePerBlock;
        if (pending > 0) {
            safeCakeTransfer(msg.sender, pending);
        }
        if (_amount > 0) {
            amount = amount - _amount;
            IERC20(lpToken).safeTransfer(address(msg.sender), _amount);
        }
        emit Withdraw(msg.sender, _pid, _amount);
    }

    /**
     * @dev Mock emergencyWithdraw function. Transfer all LP Token to msg.sender.
     */
    function emergencyWithdraw(uint256 _pid) public {
        IERC20(lpToken).safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
        amount = 0;
    }

    // Safe cake transfer function, just in case if rounding error causes pool to not have enough CAKEs.
    // MODIFIED TO MINT HERE
    function safeCakeTransfer(address _to, uint256 _amount) internal {
        IMintableERC20(cake).mint(_to, _amount);
    }
}
