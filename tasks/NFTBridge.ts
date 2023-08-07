import {task, types} from 'hardhat/config'
import web3Abi from 'web3-eth-abi';
import fs from 'fs'
import util from 'util'
import path from 'path'
import {
    NFT721Bridge,
    NFT721Bridge__factory,
    OptimizedTransparentUpgradeableProxy,
    OptimizedTransparentUpgradeableProxy__factory
} from "../build/types";

let prefix = "0x000000000000000000000000"
const writeFile = util.promisify(fs.writeFile);

task('nft:deploy', 'deploy nft')
    .addOptionalParam('id', 'chain Id', 0, types.int)
    .addOptionalParam('admin', 'admin', "")
    .addOptionalParam('chain', 'network', "")
    .setAction(async function (args, {ethers}) {
        console.log(`[depoly NFT721Bridge] start`)
        const NFT721Bridge__factory = <NFT721Bridge__factory>await ethers.getContractFactory("NFT721Bridge")
        const NFT721Bridge = <NFT721Bridge>await NFT721Bridge__factory.deploy()
        await NFT721Bridge.deployed()

        console.log(`NFTBridge:${NFT721Bridge.address}`)
        console.log(`npx hardhat verify ${NFT721Bridge.address} --network ${args.chain} --contract contracts/NFT721Bridge.sol:NFT721Bridge`)
        console.log(`-------------------------------------------------------------------`)
        //@ts-ignore
        let initData = web3Abi.encodeFunctionCall(abi, [args.id]);
        console.log(`initData:${initData}`)

        let Proxy__factory = <OptimizedTransparentUpgradeableProxy__factory>await ethers.getContractFactory("OptimizedTransparentUpgradeableProxy")
        let Proxy = <OptimizedTransparentUpgradeableProxy>await Proxy__factory.deploy(NFT721Bridge.address, args.admin, initData)
        await Proxy.deployed()
        console.log(`Proxy:${Proxy.address}`)

        let exports = [NFT721Bridge.address, args.admin, initData]
        const argumentsPath = path.resolve(__dirname, `../arguments.js`);
        await writeFile(argumentsPath, "module.exports = " + JSON.stringify(exports));

        console.log(`npx hardhat verify ${Proxy.address} --network ${args.chain}  --constructor-args arguments.js --contract contracts/OptimizedTransparentUpgradeableProxy.sol:OptimizedTransparentUpgradeableProxy`)

    })

let abi = {
    "inputs": [
        {
            "internalType": "uint16",
            "name": "_chainId",
            "type": "uint16"
        },
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}
