// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SampleERC721 is ERC721 {

    string private _baseTokenURI;
    uint256 private index = 0;

    function mint() public {
        _safeMint(msg.sender, index);
        index++;
    }

    function mint(uint256 size) public {
        for (uint256 i = 0; i < size; i++) {
            _safeMint(msg.sender, index);
            index++;
        }
    }
    constructor(string memory tokenName, string memory tokenSymbol) ERC721(tokenName, tokenSymbol) {}

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata baseURI) external {
        _baseTokenURI = baseURI;
    }
}