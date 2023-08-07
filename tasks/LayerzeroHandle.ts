import {task} from 'hardhat/config'
import web3Abi from 'web3-eth-abi';
import fs from 'fs'
import util from 'util'
import path from 'path'
import {
    LayerZeroHandle,
    LayerZeroHandle__factory,
    OptimizedTransparentUpgradeableProxy,
    OptimizedTransparentUpgradeableProxy__factory
} from "../build/types";

const writeFile = util.promisify(fs.writeFile);

task('lzHandle:deploy', 'deploy nft')
    .addOptionalParam('ua', 'nft bridge address', "")
    .addOptionalParam('endpoint', 'zkbridge address', "")
    .addOptionalParam('admin', 'admin', "")
    .addOptionalParam('chain', 'network', "")
    .setAction(async function (args, {ethers}) {
        console.log(`[depoly LayerzeroHandle] start`)
        const LayerzeroHandle__factory = <LayerZeroHandle__factory>await ethers.getContractFactory("LayerZeroHandle")
        const LayerzeroHandle = <LayerZeroHandle>await LayerzeroHandle__factory.deploy()
        await LayerzeroHandle.deployed()
        console.log(`LayerzeroHandle:${LayerzeroHandle.address}`)
        console.log(`npx hardhat verify ${LayerzeroHandle.address} --network ${args.chain} --contract contracts/NFT721Bridge.sol:NFT721Bridge`)
        //@ts-ignore
        let initData = web3Abi.encodeFunctionCall(abi, [args.ua, args.endpoint]);
        console.log(`initData:${initData}`)

        let Proxy__factory = <OptimizedTransparentUpgradeableProxy__factory>await ethers.getContractFactory("OptimizedTransparentUpgradeableProxy")
        let Proxy = <OptimizedTransparentUpgradeableProxy>await Proxy__factory.deploy(LayerzeroHandle.address, args.admin, initData)
        await Proxy.deployed()
        console.log(`Proxy:${Proxy.address}`)

        let exports = [LayerzeroHandle.address, args.admin, initData]
        const argumentsPath = path.resolve(__dirname, `../arguments.js`);
        await writeFile(argumentsPath, "module.exports = " + JSON.stringify(exports));

        console.log(`npx hardhat verify ${Proxy.address} --network ${args.chain}  --constructor-args arguments.js --contract contracts/OptimizedTransparentUpgradeableProxy.sol:OptimizedTransparentUpgradeableProxy`)
    })

let abi = {
    "inputs": [
        {
            "internalType": "address",
            "name": "_userApplication",
            "type": "address"
        },
        {
            "internalType": "address",
            "name": "_lzEndpoint",
            "type": "address"
        }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}

