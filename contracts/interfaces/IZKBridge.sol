// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IZKBridge {

    function send(uint16 dstChainId, address dstAddress, bytes memory payload) external payable returns (uint64 nonce);

    function estimateFee(uint16 dstChainId, bytes memory payload) external view returns (uint256 fee);
}
