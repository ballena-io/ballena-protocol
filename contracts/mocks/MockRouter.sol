// contracts/mocks/MockRouter.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IMintableERC20.sol";

/**
 * @dev Mock contract used for unit tests.
 */
contract MockRouter {
    using SafeERC20 for IERC20;

    address public lpToken;

    constructor(address _lpToken) {
        lpToken = _lpToken;
    }

    /**
     * @dev Mock addLiquidity function. Transfer tokens to contract and send LP.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(amountADesired >= amountAMin, "!amountAMin");
        require(amountBDesired >= amountBMin, "!amountBMin");
        // solhint-disable-next-line not-rely-on-time
        require(deadline >= block.timestamp + 100, "!deadline");
        // Transfer tokens.
        IERC20(tokenA).safeTransferFrom(address(msg.sender), address(this), amountADesired);
        IERC20(tokenB).safeTransferFrom(address(msg.sender), address(this), amountBDesired);
        // Mint LP
        uint256 amount = (amountADesired + amountBDesired) / 2;
        IMintableERC20(lpToken).mint(to, amount);

        return (amountADesired, amountBDesired, amount);
    }

    /**
     * @dev Mock getAmountsOut function. Return same imput amount.
     */
    function getAmountsOut(uint256 amountIn, address[] calldata path) external pure returns (uint256[] memory amounts) {
        require(path.length > 1, "!path");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            amounts[i + 1] = amountIn;
        }
    }

    /**
     * @dev Mock swapExactTokensForTokens function. Transfer first token of path to contract and last one to msg.sender.
     * The amount to send is the same as amountIn.
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(amountIn >= amountOutMin, "!amount");
        // solhint-disable-next-line not-rely-on-time
        require(deadline >= block.timestamp + 100, "!deadline");
        // Transfer tokens.
        IERC20(path[0]).safeTransferFrom(address(msg.sender), address(this), amountIn);
        IMintableERC20(path[path.length - 1]).mint(to, amountIn);
        // Return value.
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            amounts[i + 1] = amountIn;
        }
    }
}
