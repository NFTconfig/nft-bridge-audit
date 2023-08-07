import {task} from 'hardhat/config'
import web3Abi from 'web3-eth-abi';
import fs from 'fs'
import util from 'util'
import path from 'path'
import {
    OptimizedTransparentUpgradeableProxy,
    OptimizedTransparentUpgradeableProxy__factory,
    ZKBridgeHandle,
    ZKBridgeHandle__factory
} from "../build/types";

const writeFile = util.promisify(fs.writeFile);

task('zkHandle:deploy', 'deploy nft')
    .addOptionalParam('ua', 'nft bridge address', "")
    .addOptionalParam('zk', 'zkbridge address', "")
    .addOptionalParam('admin', 'admin', "")
    .addOptionalParam('chain', 'network', "")
    .setAction(async function (args, {ethers}) {
        console.log(`[depoly ZKBridgeHandle] start`)
        const ZKBridgeHandle__factory = <ZKBridgeHandle__factory>await ethers.getContractFactory("ZKBridgeHandle")
        const ZKBridgeHandle = <ZKBridgeHandle>await ZKBridgeHandle__factory.deploy()
        await ZKBridgeHandle.deployed()
        console.log(`ZKBridgeHandle:${ZKBridgeHandle.address}`)

        console.log(`npx hardhat verify ${ZKBridgeHandle.address} --network ${args.chain} --contract contracts/handle/ZKBridgeHandle.sol:ZKBridgeHandle`)
        console.log(`-------------------------------------------------------------------`)
        //@ts-ignore
        let initData = web3Abi.encodeFunctionCall(abi, [args.ua, args.zk]);
        console.log(`initData:${initData}`)

        let Proxy__factory = <OptimizedTransparentUpgradeableProxy__factory>await ethers.getContractFactory("OptimizedTransparentUpgradeableProxy")
        let Proxy = <OptimizedTransparentUpgradeableProxy>await Proxy__factory.deploy(ZKBridgeHandle.address, args.admin, initData)
        await Proxy.deployed()
        console.log(`Proxy:${Proxy.address}`)

        let exports = [ZKBridgeHandle.address, args.admin, initData]
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

