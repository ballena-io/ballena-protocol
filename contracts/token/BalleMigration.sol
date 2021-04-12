// contracts/token/BalleMigration.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IMintableERC20.sol";

contract BalleMigration {
    IERC20 public balle;
    IMintableERC20 public balleV2;

    event Migrate(address indexed addr, uint256 amount);

    constructor(address _balle, address _balleV2) {
        require(_balle != address(0), "BALLE address not valid");
        require(_balleV2 != address(0), "BALLEv2 address not valid");
        require(_balle != _balleV2, "Invalid address");

        balle = IERC20(_balle);
        balleV2 = IMintableERC20(_balleV2);
    }

    /**
     * @dev Transfer BALLE from wallet, and mint new BALLEv2 to wallet
     */
    function migrate() external {
        require(block.number < 6821861, "too late"); // TODO: update with real end block!
        uint256 amount = balle.balanceOf(msg.sender);
        require(amount > 0, "!amount");
        balle.transferFrom(msg.sender, address(this), amount);
        balleV2.mint(msg.sender, amount);

        emit Migrate(msg.sender, amount);
    }
}
