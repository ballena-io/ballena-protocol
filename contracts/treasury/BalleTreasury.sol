// contracts/treasury/BalleTreasury.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Implementation of the Treasury for BALLE.
 * This contract will hold all treasury tokens.
 * The owner of the contract is the Governance Gnosis Safe multisig.
 */
contract BalleTreasury is Ownable {
    using SafeERC20 for IERC20;

    function withdrawTokens(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        require(_token != address(0), "!token");
        require(_to != address(0), "!to");

        IERC20(_token).safeTransfer(_to, _amount);
    }

    function withdrawBnb(address payable _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "!to");
        require(address(this).balance >= _amount, "!amount");

        _to.transfer(_amount);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
