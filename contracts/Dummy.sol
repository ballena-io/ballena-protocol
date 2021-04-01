// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

contract Dummy {
    uint256 public dummyData = 0;

    function getDummyData() public view returns (uint256) {
        return dummyData;
    }

    function setDummyData(uint256 _data) external {
        dummyData = _data - 2;
    }
}
