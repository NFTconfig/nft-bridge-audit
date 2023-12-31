// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/IZKBridge.sol";
import "../interfaces/IZKBridgeReceiver.sol";
import "../interfaces/IUserApplication.sol";
import "../interfaces/IBridgeHandle.sol";

contract ZKBridgeHandle is Initializable, OwnableUpgradeable, IBridgeHandle, IZKBridgeReceiver {

    event SendZkMessage(uint64 indexed nonce, uint16 dstChainId, address dstAddress, bytes32 messageHash);

    event ReceiveZkMessage(uint64 indexed nonce, uint16 srcChainId, address srcAddress, bytes32 messageHash);

    //l0ChainId=> ua chainId
    mapping(uint16 => uint16) public uaChainIdMapping;

    //ua chainId=>l0ChainId
    mapping(uint16 => uint16) public bridgeChainIdMapping;

    // chainId => bridgeAddress
    mapping(uint16 => address) public trustedRemoteLookup;

    IUserApplication public userApplication;

    IZKBridge public zkBridge;


    function initialize(address _userApplication, address _zkBridge) public initializer {
        __Ownable_init();
        userApplication = IUserApplication(_userApplication);
        zkBridge = IZKBridge(_zkBridge);
    }

    function sendMessage(uint16 _dstChainId, bytes memory _payload, address payable _refundAddress, bytes memory _adapterParams, uint _nativeFee) payable external {
        require(msg.sender == address(userApplication), "not a trusted source");
        uint16 bridgeChainId = _getBridgeChainId(_dstChainId);
        address dstAddress = trustedRemoteLookup[bridgeChainId];
        require(dstAddress != address(0), "destination chain is not a trusted source");
        uint64 nonce = zkBridge.send{value : _nativeFee}(bridgeChainId, dstAddress, _payload);
        emit SendZkMessage(nonce, bridgeChainId, dstAddress, keccak256(_payload));
    }

    function zkReceive(uint16 _srcChainId, address _srcAddress, uint64 _nonce, bytes calldata _payload) external {
        require(msg.sender == address(zkBridge), "invalid zkBridge caller");
        require(trustedRemoteLookup[_srcChainId] == _srcAddress, "destination chain is not a trusted source");
        userApplication.receiveMessage(_getUaChainId(_srcChainId), _srcAddress, _nonce, _payload);
        emit ReceiveZkMessage(_nonce, _srcChainId, _srcAddress, keccak256(_payload));
    }

    function estimateFees(uint16 _dstChainId, bytes calldata _payload, bytes calldata _adapterParam) external view returns (uint256 fee){
        fee = zkBridge.estimateFee(_dstChainId, _payload);
    }


    function _getBridgeChainId(uint16 uaChainId) internal view returns (uint16) {
        uint16 bridgeChainId = bridgeChainIdMapping[uaChainId];
        if (bridgeChainId == 0) {
            bridgeChainId = uaChainId;
        }
        return bridgeChainId;
    }

    function _getUaChainId(uint16 bridgeChainId) internal view returns (uint16) {
        uint16 uaChainId = uaChainIdMapping[bridgeChainId];
        if (uaChainId == 0) {
            uaChainId = bridgeChainId;
        }
        return uaChainId;
    }

    function setChainMapping(uint16 uaChainId, uint16 bridgeChainId) external onlyOwner {
        bridgeChainIdMapping[uaChainId] = bridgeChainId;
        uaChainIdMapping[bridgeChainId] = uaChainId;
    }

    function setTrustedRemoteAddress(uint16 _remoteChainId, address _remoteAddress) external onlyOwner {
        trustedRemoteLookup[_remoteChainId] = _remoteAddress;
    }

    function setUa(address _userApplication) external onlyOwner {
        userApplication = IUserApplication(_userApplication);
    }
}
