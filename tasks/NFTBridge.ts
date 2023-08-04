import {task, types} from 'hardhat/config'
import web3Abi from 'web3-eth-abi';
import fs from 'fs'
import util from 'util'
import path from 'path'
import {
    NFTBridgeEntrypoint,
    NFTBridgeEntrypoint__factory,
    NFTBridgeImplementation,
    NFTBridgeImplementation__factory,
    NFTBridgeSetup,
    NFTBridgeSetup__factory,
    NFTImplementation,
    NFTImplementation__factory
} from "../build/types";

let prefix = "0x000000000000000000000000"
const writeFile = util.promisify(fs.writeFile);

task('nft:deploy', 'deploy nft')
    .addOptionalParam('zk', 'ZKBridgeEntrypoint Address', `0xf7497304AC73c1A52d10f719dd27580a0Db7F932`)
    .addOptionalParam('lock', 'upgrade lock time', 0, types.int)
    .addOptionalParam('id', 'chain Id', 119, types.int)
    .addOptionalParam('chain', 'network', "sepolia")
    .setAction(async function (args, {ethers}) {
        console.log(`[depoly NFTImplementation] start`)
        const NFTImplementation__factory = <NFTImplementation__factory>await ethers.getContractFactory("NFTImplementation")
        const NFTImplementation = <NFTImplementation>await NFTImplementation__factory.deploy()
        await NFTImplementation.deployed()
        console.log(`NFTImplementation:${NFTImplementation.address}`)
        console.log(`npx hardhat verify --contract contracts/nft/token/NFTImplementation.sol:NFTImplementation --network ${args.chain} ${NFTImplementation.address}`)
        console.log(`-------------------------------------------------------------------`)

        console.log(`\n[depoly NFTBridgeImplementation] start`)
        const NFTBridgeImplementation__factory = <NFTBridgeImplementation__factory>await ethers.getContractFactory("NFTBridgeImplementation")
        let NFTBridgeImplementation = <NFTBridgeImplementation>await NFTBridgeImplementation__factory.deploy()
        await NFTBridgeImplementation.deployed()
        console.log(`NFTBridgeImplementation:${NFTBridgeImplementation.address}`)
        console.log(`npx hardhat verify --contract contracts/nft/NFTBridgeImplementation.sol:NFTBridgeImplementation --network ${args.chain} ${NFTBridgeImplementation.address}`)
        console.log(`-------------------------------------------------------------------`)

        console.log(`\n[depoly NFTBridgeSetup] start`)
        const NFTBridgeSetup__factory = <NFTBridgeSetup__factory>await ethers.getContractFactory("NFTBridgeSetup")
        const NFTBridgeSetup = <NFTBridgeSetup>await NFTBridgeSetup__factory.deploy()
        await NFTBridgeSetup.deployed()
        console.log(`NFTBridgeSetup:${NFTBridgeSetup.address}`)
        console.log(`npx hardhat verify --contract contracts/nft/NFTBridgeSetup.sol:NFTBridgeSetup --network ${args.chain} ${NFTBridgeSetup.address}`)
        console.log(`-------------------------------------------------------------------`)

        console.log(`\n[depoly NFTBridgeEntrypoint] start`)
        const signers = await ethers.getSigners()
        const signer_address = await signers[0].getAddress()
        console.log(signer_address)
        // @ts-ignore
        const initData = web3Abi.encodeFunctionCall(NFTSetupAbi, [NFTBridgeImplementation.address, args.id,
            args.zk, NFTImplementation.address, signer_address, args.lock]);
        console.log(`initData:${initData}`)

        const NFTBridgeEntrypoint__factory = <NFTBridgeEntrypoint__factory>await ethers.getContractFactory("NFTBridgeEntrypoint")
        const NFTBridgeEntrypoint = <NFTBridgeEntrypoint>await NFTBridgeEntrypoint__factory.deploy(NFTBridgeSetup.address, initData)
        await NFTBridgeEntrypoint.deployed()

        let exports = [NFTBridgeSetup.address, initData]
        const argumentsPath = path.resolve(__dirname, `../arguments.js`);
        await writeFile(argumentsPath, "module.exports = " + JSON.stringify(exports))
        console.log(`NFTBridgeEntrypoint:${NFTBridgeEntrypoint.address}`)
        console.log(`npx hardhat verify --contract contracts/nft/NFTBridgeEntrypoint.sol:NFTBridgeEntrypoint --network ${args.chain} ${NFTBridgeEntrypoint.address} --constructor-args arguments.js`)

    })

let NFTSetupAbi = {
    "inputs": [
        {
            "internalType": "address",
            "name": "implementation",
            "type": "address"
        },
        {
            "internalType": "uint16",
            "name": "chainId",
            "type": "uint16"
        },
        {
            "internalType": "address",
            "name": "zkBridge",
            "type": "address"
        },
        {
            "internalType": "address",
            "name": "tokenImplementation",
            "type": "address"
        },
        {
            "internalType": "address",
            "name": "owner",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "lockTime",
            "type": "uint256"
        }
    ],
    "name": "setup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}


