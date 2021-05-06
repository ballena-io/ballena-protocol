// contracts/mocks/MockRewardPot.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockRewardPot {
    using SafeERC20 for IERC20;

    function withdrawTokens(
        address _token,
        address _to,
        uint256 _amount
    ) external {
        IERC20(_token).safeTransfer(_to, _amount);
    }

    function withdrawBnb(address payable _to, uint256 _amount) external {
        _to.transfer(_amount);
    }
}
