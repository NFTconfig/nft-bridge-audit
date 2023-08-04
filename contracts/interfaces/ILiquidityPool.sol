// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;


interface ILiquidityPool {
    function getChainToken(uint16 srcChainId, address srcToken) external view returns (address);

    function bridgeOut(address token, address recipient, uint256 amount) external;

    function bridgeOutETH(address recipient, uint256 amount) external;

    function bridgeIn(address token, uint256 amount) external;

    function bridgeInETH() external payable;
}
