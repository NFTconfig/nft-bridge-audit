// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./util/BytesLib.sol";
import "./token/ZKBridgeErc721.sol";
import "./interfaces/IBridgeHandle.sol";
import "./interfaces/IUserApplication.sol";

//test
contract NFT721Bridge is Initializable, OwnableUpgradeable, IUserApplication {
    using BytesLib for bytes;

    event TransferNFT(uint64 indexed nonce, address token, uint256 tokenID, uint16 dstChainId, address sender, address recipient);

    event ReceiveNFT(uint64 indexed nonce, address sourceToken, address token, uint256 tokenID, uint16 sourceChain, uint16 sendChain, address recipient);

    struct WrappedAsset {
        uint16 nativeChainId;
        address nativeContract;
    }

    struct Transfer {
        uint64 nonce;
        // Address of the token.
        address tokenAddress;
        // Chain ID of the token
        uint16 tokenChain;
        // Symbol of the token
        bytes32 symbol;
        // Name of the token
        bytes32 name;
        // TokenID of the token
        uint256 tokenId;
        // URI of the token metadata (UTF-8)
        string uri;
        // Address of the recipient
        address to;
        // Chain ID of the recipient
        uint16 toChain;
    }

    uint16 public chainId;

    // Mapping of wrapped assets (chainID => nativeAddress => wrappedAddress)
    mapping(uint16 => mapping(address => address)) public wrappedAssets;

    // Mapping of wrapped assets data(wrappedAddress => WrappedAsset)
    mapping(address => WrappedAsset) public wrappedAssetData;

    // Mapping of receive chain fee
    mapping(uint16 => uint256) public fee;

    // chainId => handle
    mapping(uint16 => IBridgeHandle) bridgeHandle;

    // chainId => nonce
    mapping(uint16 => uint64) nonce;

    function initialize(uint16 _chainId) public initializer {
        __Ownable_init();
        chainId = _chainId;
    }

    function transferNFT(address _token, uint256 _tokenId, uint16 _dstChainId, address _recipient, bytes calldata _adapterParams) external payable returns (uint64 currentNonce) {
        IBridgeHandle handle = bridgeHandle[_dstChainId];
        require(address(handle) != address(0), "Not Supported");
        currentNonce = nonce[_dstChainId];
        (bytes memory payload) = _getPayload(_token, _tokenId, _dstChainId, _recipient);
        require(msg.value >= _estimateFee(_dstChainId, payload, _adapterParams), "Insufficient Fee");

        IERC721(_token).safeTransferFrom(msg.sender, address(this), _tokenId);
        if (wrappedAssetData[_token].nativeChainId != 0) {
            ZKBridgeErc721(_token).zkBridgeBurn(_tokenId);
        }

        uint256 bridgeFee = msg.value - fee[_dstChainId];
        handle.sendMessage{value : bridgeFee}(_dstChainId, payload, payable(msg.sender), _adapterParams, bridgeFee);
        nonce[_dstChainId]++;
        emit TransferNFT(currentNonce, _token, _tokenId, _dstChainId, msg.sender, _recipient);
    }

    function receiveMessage(uint16 _srcChainId, address _srcAddress, uint64 _nonce, bytes memory _payload) external {
        require(msg.sender == address(bridgeHandle[_srcChainId]), "invalid bridgeHandle caller");
        Transfer memory transfer = _parseTransfer(_payload);
        require(transfer.toChain == chainId, "invalid target chain");

        address transferToken;
        if (transfer.tokenChain == chainId) {
            transferToken = transfer.tokenAddress;
            IERC721(transferToken).safeTransferFrom(address(this), transfer.to, transfer.tokenId);
        } else {
            address wrapped = wrappedAssets[transfer.tokenChain][transfer.tokenAddress];
            // If the wrapped asset does not exist yet, create it
            if (wrapped == address(0)) {
                wrapped = _createWrapped(transfer.tokenChain, transfer.tokenAddress, transfer.name, transfer.symbol);
            }
            transferToken = wrapped;
            // mint wrapped asset
            ZKBridgeErc721(wrapped).zkBridgeMint(transfer.to, transfer.tokenId, transfer.uri);
        }
        emit ReceiveNFT(transfer.nonce, transfer.tokenAddress, transferToken, transfer.tokenId, transfer.tokenChain, _srcChainId, transfer.to);
    }

    function _getPayload(address _token, uint256 _tokenId, uint16 _dstChainId, address _recipient) internal view returns (bytes memory payload) {
        uint16 tokenChain = chainId;
        address tokenAddress = _token;

        WrappedAsset memory wrappedAsset = wrappedAssetData[_token];
        if (wrappedAsset.nativeChainId != 0) {
            tokenChain = wrappedAsset.nativeChainId;
            tokenAddress = wrappedAsset.nativeContract;
        } else {
            // Verify that the correct interfaces are implemented
            require(ERC165(_token).supportsInterface(type(IERC721).interfaceId), "must support the ERC721 interface");
            require(ERC165(_token).supportsInterface(type(IERC721Metadata).interfaceId), "must support the ERC721-Metadata extension");
        }
        string memory symbolString = IERC721Metadata(_token).symbol();
        string memory nameString = IERC721Metadata(_token).name();
        string memory uriString = IERC721Metadata(_token).tokenURI(_tokenId);

        bytes32 symbol;
        bytes32 name;
        assembly {
            symbol := mload(add(symbolString, 32))
            name := mload(add(nameString, 32))
        }
        payload = _encodeTransfer(Transfer(nonce[_dstChainId], tokenAddress, tokenChain, symbol, name, _tokenId, uriString, _recipient, _dstChainId));
    }

    function _encodeTransfer(Transfer memory _transfer) internal pure returns (bytes memory encoded) {
        // There is a global limit on 200 bytes of tokenURI in ZkBridge due to Solana
        require(bytes(_transfer.uri).length <= 200, "tokenURI must not exceed 200 bytes");
        encoded = abi.encodePacked(
            _transfer.nonce,
            _transfer.tokenAddress,
            _transfer.tokenChain,
            _transfer.symbol,
            _transfer.name,
            _transfer.tokenId,
            _transfer.to,
            _transfer.toChain,
            _transfer.uri
        );
    }

    // Creates a wrapped asset using AssetMeta
    function _createWrapped(uint16 _tokenChain, address _tokenAddress, bytes32 _name, bytes32 _symbol) internal returns (address token) {
        require(_tokenChain != chainId, "can only wrap tokens from foreign chains");
        require(wrappedAssets[_tokenChain][_tokenAddress] == address(0), "wrapped asset already exists");
        token = address(new ZKBridgeErc721(_bytes32ToString(_name), _bytes32ToString(_symbol)));
        wrappedAssetData[token] = WrappedAsset(_tokenChain, _tokenAddress);
        wrappedAssets[_tokenChain][_tokenAddress] = token;
    }

    function _parseTransfer(bytes memory _encoded) internal pure returns (Transfer memory transfer) {
        uint index = 0;
        transfer.nonce = _encoded.toUint64(index);
        index += 8;

        transfer.tokenAddress = _encoded.toAddress(index);
        index += 20;

        transfer.tokenChain = _encoded.toUint16(index);
        index += 2;

        transfer.symbol = _encoded.toBytes32(index);
        index += 32;

        transfer.name = _encoded.toBytes32(index);
        index += 32;

        transfer.tokenId = _encoded.toUint256(index);
        index += 32;

        transfer.to = _encoded.toAddress(index);
        index += 20;

        transfer.toChain = _encoded.toUint16(index);
        index += 2;

        transfer.uri = string(_encoded.slice(index, _encoded.length - index));
    }


    function _bytes32ToString(bytes32 input) internal pure returns (string memory) {
        uint256 i;
        while (i < 32 && input[i] != 0) {
            i++;
        }
        bytes memory array = new bytes(i);
        for (uint c = 0; c < i; c++) {
            array[c] = input[c];
        }
        return string(array);
    }

    function _estimateFee(uint16 _dstChainId, bytes memory _payload, bytes memory _adapterParams) internal view returns (uint256){
        uint256 bridgeFee = bridgeHandle[_dstChainId].estimateFees(_dstChainId, _payload, _adapterParams);
        return bridgeFee + fee[_dstChainId];
    }

    function estimateFee(address _token, uint256 _tokenId, uint16 _dstChainId, address _recipient, bytes calldata _adapterParams) external view returns (uint256){
        (bytes memory payload) = _getPayload(_token, _tokenId, _dstChainId, _recipient);
        return _estimateFee(_dstChainId, payload, _adapterParams);
    }

    function onERC721Received(
        address operator,
        address,
        uint256,
        bytes calldata
    ) external view returns (bytes4){
        require(operator == address(this), "can only bridge tokens via transferNFT method");
        return type(IERC721Receiver).interfaceId;
    }

    //----------------------------------------------------------------------------------
    // onlyOwner
    function setFee(uint16 _dstChainId, uint256 _fee) public onlyOwner {
        fee[_dstChainId] = _fee;
    }

    function setWrappedAsset(uint16 _nativeChainId, address _nativeContract, address _wrapper) external onlyOwner {
        wrappedAssets[_nativeChainId][_nativeContract] = _wrapper;
        wrappedAssetData[_wrapper] = WrappedAsset(_nativeChainId, _nativeContract);
    }

    function setBridgeHandle(uint16 _dstChainId, address _bridgeHandle) external onlyOwner {
        bridgeHandle[_dstChainId] = IBridgeHandle(_bridgeHandle);
    }

}
