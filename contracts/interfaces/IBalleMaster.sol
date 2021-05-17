// contracts/interfaces/IBalleMaster.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBalleMaster {
    // BALLE tokens created per block.
    function ballePerBlock() external view returns (uint256);

    // The block number when BALLE rewards distribution ends.
    function endBlock() external view returns (uint256);

    // BALLE to be minted for rewards (distributed but not minted).
    function balleToMint() external view returns (uint256);
}
